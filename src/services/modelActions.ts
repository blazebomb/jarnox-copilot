/**
 * MODEL ACTIONS MODULE
 * ====================
 * 
 * This module handles special actions that the AI model can request,
 * like creating new files, appending to existing files, or inserting code.
 * 
 * When the AI wants to perform file operations instead of just generating code,
 * it sends back a JSON object with instructions. This module processes those
 * instructions and performs the actual file operations in VS Code.
 */

import * as vscode from 'vscode';
import { stripComments, unwrapCodeFence, insertTextAtCursors } from '../utils/textProcessor';

/**
 * MODEL ACTION TYPES
 * ==================
 * 
 * These are the different types of actions the AI model can request:
 * - create_file: Make a new file with specific content
 * - append_file: Add content to the end of an existing file
 * - insert_code: Put code at the current cursor position in the editor
 */
export type ModelAction = {
  action: 'create_file' | 'append_file' | 'insert_code';
  path?: string;    // File path (required for create_file and append_file)
  content?: string; // The text/code content to write or insert
};

/**
 * ACTION PARSER
 * =============
 * 
 * This function looks at the AI's response and tries to find a JSON object
 * that contains action instructions. The AI might send back regular text
 * with a JSON object embedded somewhere in it.
 * 
 * @param responseText - The complete response from the AI model
 * @returns A parsed action object, or null if no valid action found
 */
export function parseModelAction(responseText: string): ModelAction | null {
  // Clean up the input text
  const cleanText = (responseText || '').trim();
  if (!cleanText) return null;
  
  // Look for JSON object boundaries in the text
  const startBrace = cleanText.indexOf('{');
  const endBrace = cleanText.lastIndexOf('}');
  
  // If no braces found, this isn't a JSON action
  if (startBrace === -1 || endBrace === -1 || endBrace <= startBrace) {
    return null;
  }
  
  // Extract the potential JSON part
  const jsonCandidate = cleanText.slice(startBrace, endBrace + 1);
  
  try {
    // Try to parse as JSON
    const parsedObject = JSON.parse(jsonCandidate);
    
    // Check if it has the required 'action' field
    if (typeof parsedObject?.action !== 'string') {
      return null;
    }
    
    // Validate that the action type is supported
    const actionType = parsedObject.action as string;
    const validActions = ['create_file', 'append_file', 'insert_code'];
    
    if (!validActions.includes(actionType)) {
      console.log(`Unsupported action type: ${actionType}`);
      return null;
    }
    
    // Build the validated action object
    const action: ModelAction = { 
      action: actionType as ModelAction['action'] 
    };
    
    // Add optional fields if present
    if (typeof parsedObject.path === 'string') {
      action.path = parsedObject.path;
    }
    
    if (typeof parsedObject.content === 'string') {
      action.content = parsedObject.content;
    }
    
    return action;
    
  } catch (parseError) {
    // JSON parsing failed, so this isn't a valid action
    console.log('Failed to parse JSON from model response:', parseError);
    return null;
  }
}

/**
 * ACTION EXECUTOR
 * ===============
 * 
 * This function takes a parsed action and actually performs it in VS Code.
 * It handles file creation, file appending, and code insertion.
 * 
 * @param action - The action to perform (from parseModelAction)
 * @throws Error if the action cannot be completed
 */
export async function executeModelAction(action: ModelAction): Promise<void> {
  console.log('Executing model action:', action);
  
  // Handle code insertion (no file path needed)
  if (action.action === 'insert_code') {
    await handleCodeInsertion(action.content);
    return;
  }
  
  // For file operations, we need a workspace and a path
  await handleFileOperation(action);
}

/**
 * CODE INSERTION HANDLER
 * ======================
 * 
 * Inserts code directly into the currently open editor at all cursor positions.
 * This is used when the AI generates code that should go into the file you're
 * currently working on.
 * 
 * @param content - The code content to insert
 */
async function handleCodeInsertion(content?: string): Promise<void> {
  // Check if there's an active editor open
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage(
      'Please open a file in the editor to insert code.'
    );
    return;
  }
  
  // Clean up the content and insert it
  const codeToInsert = content ?? '';
  const cleanCode = stripComments(unwrapCodeFence(codeToInsert));
  
  if (!cleanCode) {
    vscode.window.showWarningMessage('No code content to insert.');
    return;
  }
  
  await insertTextAtCursors(editor, cleanCode);
  vscode.window.showInformationMessage(
    `Inserted ${cleanCode.length} characters of code.`
  );
}

/**
 * FILE OPERATION HANDLER
 * ======================
 * 
 * Handles creating new files or appending to existing files.
 * This includes creating any necessary parent directories.
 * 
 * @param action - The file action to perform
 */
async function handleFileOperation(action: ModelAction): Promise<void> {
  // Make sure we have a workspace open
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showWarningMessage(
      'No workspace folder is open. Cannot perform file operations. Please open a folder first.'
    );
    return;
  }
  
  // Make sure we have a file path
  if (!action.path) {
    vscode.window.showWarningMessage(
      'No file path specified for file operation.'
    );
    return;
  }
  
  // Get the workspace root and build the full file path
  const workspaceRoot = workspaceFolders[0].uri;
  const sanitizedPath = sanitizeFilePath(action.path);
  const pathSegments = sanitizedPath.split(/[\/\\]+/).filter(Boolean);
  const targetFileUri = vscode.Uri.joinPath(workspaceRoot, ...pathSegments);
  
  // Security check: make sure the file is within the workspace
  if (!isPathWithinWorkspace(targetFileUri, workspaceRoot)) {
    vscode.window.showErrorMessage(
      'Refused to create file outside the workspace for security reasons.'
    );
    return;
  }
  
  // Create parent directories if needed
  if (pathSegments.length > 1) {
    const parentDirSegments = pathSegments.slice(0, -1);
    const parentDirUri = vscode.Uri.joinPath(workspaceRoot, ...parentDirSegments);
    await vscode.workspace.fs.createDirectory(parentDirUri);
  }
  
  // Perform the actual file operation
  if (action.action === 'create_file') {
    await createNewFile(targetFileUri, action.content ?? '');
  } else if (action.action === 'append_file') {
    await appendToFile(targetFileUri, action.content ?? '');
  }
  
  // Open the file in the editor so the user can see the result
  try {
    const document = await vscode.workspace.openTextDocument(targetFileUri);
    await vscode.window.showTextDocument(document, { preview: false });
  } catch (error) {
    console.log('Could not open created file in editor:', error);
    // Not a critical error, just log it
  }
}

/**
 * FILE PATH SANITIZER
 * ===================
 * 
 * Cleans up file paths to remove dangerous characters and ensure
 * they follow a safe format.
 * 
 * @param path - The raw file path from the AI
 * @returns A cleaned, safe file path
 */
function sanitizeFilePath(path: string): string {
  // Remove leading slashes and backslashes
  return path.replace(/^([/\\])+/, '');
}

/**
 * WORKSPACE SECURITY CHECK
 * ========================
 * 
 * Makes sure a file path is within the workspace folder and not trying
 * to access files outside of it (which could be a security risk).
 * 
 * @param filePath - The full URI of the target file
 * @param workspaceRoot - The workspace root URI
 * @returns true if the file is safely within the workspace
 */
function isPathWithinWorkspace(filePath: vscode.Uri, workspaceRoot: vscode.Uri): boolean {
  const workspaceRootPath = workspaceRoot.path.endsWith('/') 
    ? workspaceRoot.path 
    : workspaceRoot.path + '/';
  
  return filePath.path.startsWith(workspaceRootPath);
}

/**
 * NEW FILE CREATOR
 * ================
 * 
 * Creates a brand new file with the specified content.
 * If a file already exists at that location, it will be overwritten.
 * 
 * @param fileUri - Where to create the file
 * @param content - What to put in the file
 */
async function createNewFile(fileUri: vscode.Uri, content: string): Promise<void> {
  const fileData = new TextEncoder().encode(content);
  await vscode.workspace.fs.writeFile(fileUri, fileData);
  
  vscode.window.showInformationMessage(
    `Created file: ${fileUri.path.split('/').pop()}`
  );
}

/**
 * FILE APPENDER
 * =============
 * 
 * Adds content to the end of an existing file. If the file doesn't exist,
 * it creates a new one. It's smart about adding newlines so content doesn't
 * get squished together.
 * 
 * @param fileUri - Which file to append to
 * @param content - What to add to the file
 */
async function appendToFile(fileUri: vscode.Uri, content: string): Promise<void> {
  let existingContent = '';
  
  // Try to read the existing file content
  try {
    const existingData = await vscode.workspace.fs.readFile(fileUri);
    existingContent = new TextDecoder().decode(existingData);
  } catch (error) {
    // File doesn't exist yet, which is fine
    console.log('File does not exist yet, will create new one');
  }
  
  // Combine existing content with new content, adding newline if needed
  const needsNewline = existingContent !== '' && !existingContent.endsWith('\n');
  const combinedContent = existingContent + (needsNewline ? '\n' : '') + content;
  
  // Write the combined content back to the file
  const fileData = new TextEncoder().encode(combinedContent);
  await vscode.workspace.fs.writeFile(fileUri, fileData);
  
  const fileName = fileUri.path.split('/').pop();
  vscode.window.showInformationMessage(
    `Appended content to: ${fileName}`
  );
}