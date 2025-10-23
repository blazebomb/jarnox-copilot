/**
 * WEBVIEW PROVIDER MODULE
 * =======================
 * 
 * This module creates and manages the sidebar panel UI in VS Code.
 * The panel contains:
 * - A dropdown to select different AI models
 * - A text input box for typing prompts
 * - An "Apply" button to send requests
 * - A log area to show what happened
 * 
 * This is the "frontend" part of the extension - the part users interact with.
 */

import * as vscode from 'vscode';
import { generateResponseForUser } from '../services/llmService';
import { parseModelAction, executeModelAction } from '../services/modelActions';
import { stripComments, unwrapCodeFence, insertTextAtCursors } from '../utils/textProcessor';

/**
 * WEBVIEW VIEW PROVIDER CLASS
 * ============================
 * 
 * This class implements VS Code's WebviewViewProvider interface.
 * It's responsible for creating the HTML interface and handling
 * communication between the UI and the extension backend.
 */
export class CopilotWebviewProvider implements vscode.WebviewViewProvider {
  
  /** Unique identifier for this view panel */
  public static readonly VIEW_ID = 'jarnox.commandView';
  
  /** Reference to the current webview (if any) */
  private currentWebview?: vscode.WebviewView;
  
  /** VS Code extension context for accessing resources */
  private extensionContext: vscode.ExtensionContext;
  
  /**
   * CONSTRUCTOR
   * ===========
   * 
   * Sets up the webview provider with access to the extension context.
   * 
   * @param context - VS Code extension context
   */
  constructor(context: vscode.ExtensionContext) {
    this.extensionContext = context;
  }
  
  /**
   * PREVIEW HANDLER
   * ===============
   * 
   * Generates a response without applying it to the editor and
   * returns the raw output to the webview for display.
   * 
   * @param userPrompt - Prompt typed by the user
   * @param modelName - Selected AI model
   * @param webview - Webview to deliver the preview data to
   */
  private async handlePreviewPrompt(
    userPrompt: string,
    modelName: string,
    webview: vscode.Webview
  ): Promise<void> {
    
    // Validate input
    if (!userPrompt?.trim()) {
      vscode.window.showWarningMessage('Please enter a prompt before applying.');
      return;
    }
    
    const normalizedPrompt = userPrompt.trim();
    console.log(`Previewing prompt with model ${modelName}:`, normalizedPrompt);
    
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Generating preview with ${modelName}...`,
      cancellable: false
    }, async () => {
      try {
        const aiResponse = await generateResponseForUser(normalizedPrompt, modelName);
        console.log('Received AI preview response:', aiResponse);
        
        webview.postMessage({
          type: 'preview',
          text: this.summarizeResponse(aiResponse),
          rawResponse: aiResponse
        });
      } catch (error) {
        console.error('Error generating preview response:', error);
        vscode.window.showErrorMessage(this.formatErrorMessage(error));
      }
    });
  }
  
  /**
   * WEBVIEW VIEW RESOLVER
   * =====================
   * 
   * This method is called by VS Code when it's time to create the webview.
   * It sets up the HTML content and message handling.
   * 
   * @param webviewView - The webview container provided by VS Code
   */
  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    console.log('Creating webview for Copilot sidebar...');
    
    // Store reference to the webview
    this.currentWebview = webviewView;
    
    // Configure webview options
    webviewView.webview.options = {
      // Allow scripts to run in the webview
      enableScripts: true,
      // Restrict which resources the webview can access
      localResourceRoots: [this.extensionContext.extensionUri]
    };
    
    // Set the HTML content for the webview
    webviewView.webview.html = this.generateWebviewHtml(webviewView.webview);
    
    // Set up message handling between webview and extension
    this.setupMessageHandling(webviewView.webview);
    
    console.log('Webview setup complete');
  }
  
  /**
   * MESSAGE HANDLER SETUP
   * ======================
   * 
   * This sets up the communication channel between the webview UI
   * and the extension backend. When users click buttons in the UI,
   * messages are sent here for processing.
   * 
   * @param webview - The webview to listen for messages from
   */
  private setupMessageHandling(webview: vscode.Webview): void {
    webview.onDidReceiveMessage(async (message) => {
      console.log('Received message from webview:', message);
      
      try {
        // Handle "apply" messages (when user submits a prompt)
        if (message.type === 'apply') {
          await this.handleUserPrompt(message.text, message.model, webview);
        } else if (message.type === 'preview') {
          await this.handlePreviewPrompt(message.text, message.model, webview);
        } else {
          console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error handling webview message:', error);
        vscode.window.showErrorMessage(
          `Extension error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }
  
  /**
   * USER PROMPT HANDLER
   * ===================
   * 
   * This is the main processing function that:
   * 1. Takes the user's prompt and selected model
   * 2. Sends it to the AI service
   * 3. Processes the AI's response
   * 4. Either inserts code or performs file actions
   * 
   * @param userPrompt - What the user typed
   * @param modelName - Which AI model they selected
   * @param webview - The webview to send status updates to
   */
  private async handleUserPrompt(
    userPrompt: string, 
    modelName: string, 
    webview: vscode.Webview
  ): Promise<void> {
    
    // Validate input
    if (!userPrompt?.trim()) {
      vscode.window.showWarningMessage('Please enter a prompt before applying.');
      return;
    }
    
    const normalizedPrompt = userPrompt.trim();
    console.log(`Processing prompt with model ${modelName}:`, normalizedPrompt);
    
    // Show progress notification
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Generating response with ${modelName}...`,
      cancellable: false
    }, async () => {
      
      try {
        // Send prompt to AI model and get response
        const aiResponse = await generateResponseForUser(normalizedPrompt, modelName);
        console.log('Received AI response:', aiResponse);
        
        // Try to parse as a model action first
        const modelAction = parseModelAction(aiResponse);
        
        if (modelAction) {
          // AI wants to perform a file operation
          console.log('Executing model action:', modelAction);
          await executeModelAction(modelAction);
          
          // Notify webview about the action
          webview.postMessage({
            type: 'applied',
            text: `Action: ${modelAction.action} ${modelAction.path || '(current editor)'}`,
            rawResponse: aiResponse
          });
          
        } else {
          // AI returned code to insert at cursor
          console.log('Inserting code response at cursor');
          await this.insertCodeResponse(aiResponse);
          
          // Notify webview about the insertion
          webview.postMessage({
            type: 'applied',
            text: this.summarizeResponse(aiResponse),
            rawResponse: aiResponse
          });
        }
        
      } catch (error) {
        console.error('Error processing user prompt:', error);
        vscode.window.showErrorMessage(this.formatErrorMessage(error));
      }
    });
  }
  
  /**
   * CODE RESPONSE INSERTER
   * ======================
   * 
   * Takes the AI's response and inserts it as code at the current
   * cursor position(s) in the active editor.
   * 
   * @param response - Raw response from the AI
   */
  private async insertCodeResponse(response: string): Promise<void> {
    // Check if there's an active editor
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showInformationMessage(
        'No file is open. Please open a file to insert code.'
      );
      return;
    }
    
    // Clean up the response (remove comments and code fences)
    const cleanedCode = stripComments(unwrapCodeFence(response));
    
    if (!cleanedCode) {
      vscode.window.showWarningMessage('No code content received from AI.');
      return;
    }
    
    // Insert the code at all cursor positions
    await insertTextAtCursors(activeEditor, cleanedCode);
    
    // Show success message
    vscode.window.showInformationMessage(
      `Inserted ${cleanedCode.length} characters of code.`
    );
  }
  
  /**
   * RESPONSE SUMMARIZER
   * ===================
   * 
   * Creates a short summary of the AI response for display in the log.
   * This helps users see what was inserted without cluttering the UI.
   * 
   * @param response - The full AI response
   * @returns A short summary for the log
   */
  private summarizeResponse(response: string): string {
    const cleaned = response.replace(/\\s+/g, ' ').trim();
    return cleaned.length > 50 
      ? cleaned.substring(0, 47) + '...'
      : cleaned;
  }
  
  /**
   * ERROR MESSAGE FORMATTER
   * =======================
   * 
   * Produces a user-friendly message from an unknown error object.
   * 
   * @param error - Error thrown during processing
   * @returns Message safe to display
   */
  private formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('connect')) {
        return 'Cannot connect to AI server. Check if Ollama is running.';
      }
      return error.message;
    }
    return 'Failed to generate response';
  }
  
  /**
   * HTML GENERATOR
   * ==============
   * 
   * Creates the HTML content for the webview panel.
   * This includes all the CSS styling and JavaScript for the UI.
   * 
   * @param webview - The webview context for generating secure content
   * @returns Complete HTML string for the webview
   */
  private generateWebviewHtml(webview: vscode.Webview): string {
    // Generate a security nonce for Content Security Policy
    const nonce = this.generateSecurityNonce();
    
    // Build Content Security Policy to prevent security issues
    const contentSecurityPolicy = [
      "default-src 'none'",                    // Block everything by default
      'img-src data:',                         // Allow data: images
      `style-src 'nonce-${nonce}'`,           // Only allow our styles
      `script-src 'nonce-${nonce}'`           // Only allow our scripts
    ].join('; ');
    
    return this.buildHtmlTemplate(nonce, contentSecurityPolicy);
  }
  
  /**
   * SECURITY NONCE GENERATOR
   * ========================
   * 
   * Generates a random string for Content Security Policy.
   * This prevents malicious scripts from running in the webview.
   * 
   * @returns Random 32-character string
   */
  private generateSecurityNonce(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  
  /**
   * HTML TEMPLATE BUILDER
   * ======================
   * 
   * Builds the complete HTML template with all the UI components,
   * styling, and JavaScript functionality.
   * 
   * @param nonce - Security nonce for CSP
   * @param csp - Content Security Policy string
   * @returns Complete HTML document
   */
  private buildHtmlTemplate(nonce: string, csp: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- STYLESHEET: VS Code-themed styling -->
  <style nonce="${nonce}">
    /* CSS Variables for consistent theming */
    :root { 
      --bg-color: #252526; 
      --surface-color: #2d2d2d; 
      --text-color: #ddd; 
      --muted-text: #aaa; 
      --accent-color: #007acc; 
      --border-color: #333;
    }
    
    /* Reset and base styling */
    * { box-sizing: border-box; }
    body { 
      margin: 0; 
      background: var(--bg-color); 
      color: var(--text-color); 
      font-family: ui-sans-serif, system-ui, Arial, sans-serif;
    }

    /* Main layout container */
    .container { 
      display: flex; 
      flex-direction: column; 
      height: 100vh; 
    }
    
    /* Header section */
    .header { 
      padding: 10px 12px; 
      font-weight: 600; 
      border-bottom: 1px solid #000; 
    }

    /* Content section */
    .content { 
      padding: 10px 12px; 
      display: flex; 
      flex-direction: column; 
      gap: 8px; 
    }
    
    /* Row layout for form elements */
    .row { 
      display: flex; 
      gap: 8px; 
      align-items: center; 
    }
    
    .row.actions {
      align-items: stretch;
    }

    /* Input field styling */
    input[type="text"] {
      flex: 1;
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: #1a1a1a;
      color: var(--text-color);
      font-size: 14px;
    }
    
    input[type="text"]:focus {
      outline: 2px solid var(--accent-color);
    }

    /* Button styling */
    button {
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: var(--accent-color);
      color: white;
      cursor: pointer;
      font-size: 14px;
      min-width: 60px;
    }
    
    button:hover {
      background: #0086cc;
    }

    /* Model selection dropdown */
    select {
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: #1a1a1a;
      color: var(--text-color);
      width: 100%;
      font-size: 14px;
    }
    
    button.secondary {
      background: #3a3a3a;
      color: var(--text-color);
    }

    button.secondary:hover {
      background: #4a4a4a;
    }

    /* Voice recording button */
    /* Help text styling */
    .help-text { 
      color: var(--muted-text); 
      font-size: 12px; 
      line-height: 1.4;
    }

    /* Status message display */
    .status-message {
      font-size: 11px;
      color: var(--muted-text);
      min-height: 16px;
    }

    /* Response display */
    .response-container {
      margin-top: 8px;
      padding: 8px;
      border-radius: 6px;
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .response-container[hidden] {
      display: none;
    }

    .response-header {
      font-size: 12px;
      color: var(--muted-text);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .response-content {
      margin: 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 160px;
      overflow-y: auto;
    }

    /* Activity log styling */
    .log {
      margin-top: 6px;
      padding: 8px;
      border-radius: 6px;
      background: var(--surface-color);
      white-space: pre-wrap;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 11px;
      max-height: 120px;
      overflow-y: auto;
    }
  </style>
  
  <title>JarNox Command Copilot</title>
</head>
<body>
  <div class="container">
    
    <!-- Title bar -->
    <div class="header">JarNox Command Copilot (Demo)</div>

    <!-- Main interface -->
    <div class="content">
      
      <!-- AI Model selection -->
      <div class="row">
        <select id="modelSelect">
          <option value="mistral:latest">mistral:latest</option>
          <option value="llama3:latest">llama3:latest</option>
          <option value="sqlcoder:latest">sqlcoder:latest</option>
          <option value="llama3.2:latest" selected>llama3.2:latest</option>
          <option value="qwen2.5-coder:7b">qwen2.5-coder:7b</option>
          <option value="codellama:latest">codellama:latest</option>
          <option value="llama2:latest">llama2:latest</option>
        </select>
      </div>

      <!-- Input row with text box and apply button -->
      <div class="row actions">
        <input id="promptInput" type="text" placeholder="Type your prompt (e.g., 'create a function to add two numbers')..." />
        <button id="applyEditorButton">Apply to Editor</button>
        <button id="previewButton" class="secondary">Apply (Show Raw)</button>
      </div>

      <!-- Status message -->
      <div class="status-message" id="statusMessage"></div>

      <!-- Latest response display -->
      <div class="response-container" id="responseContainer" hidden>
        <div class="response-header">Latest Response</div>
        <pre id="responseContent" class="response-content"></pre>
      </div>

      <!-- Help text -->
      <div class="help-text">
        Choose an AI model and describe what you want. Generated code will be inserted at your cursor position(s).
      </div>
      
      <!-- Activity log -->
      <div id="activityLog" class="log"></div>
    </div>
  </div>

  <!-- JAVASCRIPT: UI behavior and communication -->
  <script nonce="${nonce}">
    // Get references to UI elements
    const promptInput = document.getElementById('promptInput');
    const modelSelect = document.getElementById('modelSelect');
    const applyEditorButton = document.getElementById('applyEditorButton');
    const previewButton = document.getElementById('previewButton');
    const statusMessage = document.getElementById('statusMessage');
    const responseContainer = document.getElementById('responseContainer');
    const responseContent = document.getElementById('responseContent');
    const activityLog = document.getElementById('activityLog');
    
    // VS Code API for communicating with the extension
    const vscode = acquireVsCodeApi();
    let lastResponse = '';
    
    /**
     * STATUS UPDATER
     * ==============
     * 
     * Sets the status message in the UI.
     * 
     * @param {string} message - Message to display
     */
    function updateStatus(message) {
      if (!statusMessage) {
        return;
      }
      statusMessage.textContent = message || '';
    }
    
    /**
     * PROMPT SUBMITTER
     * ================
     * 
     * Sends the user's prompt and selected model to the extension for processing.
     */
    function submitPrompt(target = 'apply') {
      const promptText = promptInput.value.trim();
      const selectedModel = modelSelect.value;
      
      if (!promptText) {
        updateStatus('Please enter a prompt first');
        return;
      }

      const requestType = target === 'preview' ? 'preview' : 'apply';

      // Reset previous response display
      lastResponse = '';
      if (responseContainer && responseContent) {
        if (requestType === 'preview') {
          responseContainer.hidden = false;
          responseContent.textContent = 'Waiting for response...';
        } else {
          responseContainer.hidden = true;
          responseContent.textContent = '';
        }
      }
      
      // Send message to extension
      vscode.postMessage({
        type: requestType,
        text: promptText,
        model: selectedModel
      });
      
      // Clear input and show feedback
      promptInput.value = '';
      const truncatedPrompt = promptText.substring(0, 40) + '...';
      if (requestType === 'preview') {
        logActivity('Preview requested: ' + truncatedPrompt);
        updateStatus('Generating preview with ' + selectedModel + '...');
      } else {
        logActivity('Apply requested: ' + truncatedPrompt);
        updateStatus('Processing with ' + selectedModel + '...');
      }
    }
    
    /**
     * ACTIVITY LOGGER
     * ===============
     * 
     * Adds entries to the activity log to show what's happening.
     * 
     * @param {string} message - Message to log
     */
    function logActivity(message) {
      const timestamp = new Date().toLocaleTimeString();
      const logEntry = '[' + timestamp + '] ' + message + '\\n';
      activityLog.textContent = logEntry + activityLog.textContent;
    }
    
    // EVENT LISTENERS
    // ===============
    
    // Apply to editor button click
    if (applyEditorButton) {
      applyEditorButton.addEventListener('click', () => submitPrompt('apply'));
    }
    
    // Apply to webview (preview) button click
    if (previewButton) {
      previewButton.addEventListener('click', () => submitPrompt('preview'));
    }
    
    // Enter key in text input
    promptInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submitPrompt('apply');
      }
    });
    
    // Listen for messages from the extension
    window.addEventListener('message', (event) => {
      const message = event.data;
      
      if (message.type === 'applied') {
        const appliedSummary = typeof message.text === 'string' && message.text.trim()
          ? message.text
          : 'Response applied';
        logActivity('Applied: ' + appliedSummary);
        updateStatus('Completed successfully');
        
        if (typeof message.rawResponse === 'string') {
          lastResponse = message.rawResponse;
          if (responseContainer && !responseContainer.hidden && responseContent) {
            responseContent.textContent = lastResponse;
          }
        } else {
          lastResponse = '';
          if (responseContainer) {
            responseContainer.hidden = true;
          }
          if (responseContent) {
            responseContent.textContent = '';
          }
        }
      } else if (message.type === 'preview') {
        const previewSummary = typeof message.text === 'string' && message.text.trim()
          ? message.text
          : 'Raw response ready';
        logActivity('Preview ready: ' + previewSummary);
        updateStatus('Preview ready');
        
        if (typeof message.rawResponse === 'string') {
          lastResponse = message.rawResponse;
          if (responseContainer) {
            responseContainer.hidden = false;
          }
          if (responseContent) {
            responseContent.textContent = lastResponse;
          }
        } else {
          lastResponse = '';
          if (responseContainer) {
            responseContainer.hidden = false;
          }
          if (responseContent) {
            responseContent.textContent = 'No preview available.';
          }
        }
      }
    });
    
    updateStatus('Ready for your prompt.');
    
    // Set initial focus to text input
    promptInput.focus();
  </script>
</body>
</html>
    `;
  }
}
