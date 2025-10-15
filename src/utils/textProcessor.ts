/**
 * TEXT PROCESSING UTILITIES
 * =========================
 * 
 * This module contains all the helper functions for processing text:
 * - Adding comments to code based on programming language
 * - Removing unwanted comments from generated code
 * - Handling code fence blocks (```code```)
 * - Inserting text at cursor positions in VS Code editor
 * 
 * Think of this as a toolkit for cleaning up and formatting text
 * before it gets inserted into your code editor.
 */

import * as vscode from 'vscode';

/**
 * COMMENT PREFIX GENERATOR
 * ========================
 * 
 * Different programming languages use different symbols for comments:
 * - Python uses # for comments
 * - JavaScript uses // for comments  
 * - HTML uses <!-- for comments
 * 
 * This function looks at the file type and returns the right comment symbol.
 * 
 * @param langId - The programming language ID (like 'python', 'javascript')
 * @returns The comment symbol to use (like '# ' or '// ')
 */
export function getCommentPrefix(langId: string): string {
  // Python, Bash/Shell scripts, and YAML files use hash symbols
  if (langId === 'python' || langId === 'shellscript' || langId === 'yaml') {
    return '# ';
  }
  
  // HTML files use special comment syntax
  if (langId === 'html') {
    return '<!-- ';
  }
  
  // Most other languages (JavaScript, TypeScript, Java, C++, etc.) use double slash
  return '// ';
}

/**
 * COMMENT SUFFIX GENERATOR
 * ========================
 * 
 * Most programming languages don't need anything to close a comment,
 * but HTML is special - it needs --> to close a comment that starts with <!--
 * 
 * @param langId - The programming language ID
 * @returns The closing part of a comment (usually empty, except for HTML)
 */
export function getCommentSuffix(langId: string): string {
  // Only HTML needs a closing part for comments
  return langId === 'html' ? ' -->' : '';
}

/**
 * CODE FENCE UNWRAPPER
 * ====================
 * 
 * AI models often return code wrapped in "fences" like this:
 * ```javascript
 * console.log("Hello World");
 * ```
 * 
 * This function removes those fence markers and just gives you the clean code.
 * 
 * @param text - Text that might be wrapped in code fences
 * @returns Clean code without the fence markers
 */
export function unwrapCodeFence(text: string): string {
  // If no text provided, return empty string
  if (!text) return '';
  
  const fenceMarker = '```';
  
  // Find where the code fence starts and ends
  const startPos = text.indexOf(fenceMarker);
  const endPos = text.lastIndexOf(fenceMarker);
  
  // If we found both start and end fences, extract the middle part
  if (startPos !== -1 && endPos !== -1 && endPos > startPos) {
    let codeContent = text.slice(startPos + fenceMarker.length, endPos);
    
    // Remove the language name from the first line (like "javascript" in ```javascript)
    codeContent = codeContent.replace(/^\s*[A-Za-z0-9_+#.\-]*\s*\n/, '');
    
    return codeContent.trim();
  }
  
  // If no fences found, just return the original text cleaned up
  return text.trim();
}

/**
 * COMMENT STRIPPER
 * ================
 * 
 * Sometimes AI generates code with explanatory comments that you don't want.
 * This function removes common comment styles but keeps the actual code.
 * 
 * It removes:
 * - HTML comments (angle-bracket style comments)
 * - Block comments (slash-star style comments)
 * - Line comments (double-slash style comments)
 * - Shell/Python comments (hash style comments, but keeps shebang lines)
 * 
 * @param text - Code that might contain unwanted comments
 * @returns Clean code with comments removed
 */
export function stripComments(text: string): string {
  if (!text) return '';
  
  let cleanedText = text;
  
  // Remove HTML/XML style comments: <!-- anything -->
  cleanedText = cleanedText.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove block comments: /* anything */
  cleanedText = cleanedText.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove line comments that start with // (full line only)
  cleanedText = cleanedText.replace(/^\s*\/\/.*$/gm, '');
  
  // Remove # comments but keep shebang lines (#!/bin/bash, #!/usr/bin/env python, etc.)
  cleanedText = cleanedText.replace(/^\s*#(?!\!).*$/gm, '');
  
  // Clean up the result:
  // 1. Remove trailing whitespace from each line
  // 2. Drop blank lines created after stripping comments
  // 3. Trim the whole thing
  cleanedText = cleanedText
    .split(/\r?\n/)                          // Split into lines
    .map(line => line.replace(/\s+$/g, ''))  // Remove trailing spaces
    .filter(line => line.trim() !== '')      // Remove blank lines
    .join('\n')                              // Join back together
    .trim();                                 // Remove leading/trailing whitespace
  
  return cleanedText;
}

/**
 * CURSOR TEXT INSERTER
 * ====================
 * 
 * This is the function that actually puts text into your VS Code editor.
 * It's smart enough to handle multiple cursors - if you have 3 cursors,
 * it will insert the text at all 3 locations.
 * 
 * @param editor - The VS Code text editor where we want to insert text
 * @param text - The text to insert at each cursor position
 */
export async function insertTextAtCursors(editor: vscode.TextEditor, text: string): Promise<void> {
  // Make sure the text ends with a newline for clean insertion
  const textToInsert = text.endsWith('\n') ? text : text + '\n';
  
  // Use VS Code's edit API to insert text at all cursor positions
  await editor.edit((editBuilder) => {
    // Loop through each cursor/selection in the editor
    for (const selection of editor.selections) {
      // Insert the text at the current cursor position
      editBuilder.insert(selection.active, textToInsert);
    }
  });
}
