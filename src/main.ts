/**
 * MAIN EXTENSION ENTRY POINT
 * ===========================
 * 
 * This is the main file that VS Code loads when your extension starts up.
 * It's responsible for:
 * - Registering the sidebar panel (webview provider)
 * - Setting up commands that users can run
 * - Managing the extension lifecycle (startup and shutdown)
 * 
 * Think of this as the "main function" of your VS Code extension.
 */

import * as vscode from 'vscode';
import { CopilotWebviewProvider } from './ui/webviewProvider';

/**
 * EXTENSION ACTIVATION
 * ====================
 * 
 * This function is called when your extension is first activated.
 * VS Code calls this when:
 * - The user opens VS Code and your extension is enabled
 * - The user first accesses a feature from your extension
 * - VS Code starts up and loads enabled extensions
 * 
 * @param context - VS Code extension context with useful utilities
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('JarNox Command Copilot extension is starting up...');
  
  // Create the webview provider (this manages the sidebar UI)
  const webviewProvider = new CopilotWebviewProvider(context);
  
  // Register the webview provider with VS Code
  // This tells VS Code "when the user opens the sidebar panel, use this provider"
  const webviewRegistration = vscode.window.registerWebviewViewProvider(
    CopilotWebviewProvider.VIEW_ID,
    webviewProvider
  );
  
  // Register a command that users can run from the Command Palette
  // Command Palette is opened with Ctrl+Shift+P (or Cmd+Shift+P on Mac)
  const showPanelCommand = vscode.commands.registerCommand(
    'jarnox.commandCopilot.show',
    async () => {
      console.log('Show panel command executed');
      
      // Focus the Explorer view to make sure our sidebar panel is visible
      // Our panel lives in the Explorer sidebar, so we need to open that first
      await vscode.commands.executeCommand('workbench.view.explorer');
      
      // Show a helpful message to the user
      vscode.window.showInformationMessage(
        'JarNox Command Copilot panel should now be visible in the Explorer sidebar.'
      );
    }
  );
  
  // Register all our disposables with the extension context
  // This ensures VS Code properly cleans up when the extension is disabled
  context.subscriptions.push(
    webviewRegistration,
    showPanelCommand
  );
  
  console.log('JarNox Command Copilot extension activated successfully!');
  
  // Show a welcome message (only on first activation)
  const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
  if (!hasShownWelcome) {
    showWelcomeMessage();
    context.globalState.update('hasShownWelcome', true);
  }
}

/**
 * EXTENSION DEACTIVATION
 * ======================
 * 
 * This function is called when your extension is being shut down.
 * This happens when:
 * - VS Code is closing
 * - The user disables your extension
 * - The extension is being reloaded during development
 * 
 * Most of the cleanup is handled automatically by VS Code, but you can
 * add custom cleanup logic here if needed.
 */
export function deactivate(): void {
  console.log('JarNox Command Copilot extension is shutting down...');
  
  // Any custom cleanup logic would go here
  // For this extension, VS Code handles most cleanup automatically
  
  console.log('JarNox Command Copilot extension deactivated.');
}

/**
 * WELCOME MESSAGE DISPLAY
 * ========================
 * 
 * Shows a helpful welcome message to new users explaining how to use the extension.
 */
function showWelcomeMessage(): void {
  const message = 'Welcome to JarNox Command Copilot! Look for the panel in your Explorer sidebar.';
  const openPanelButton = 'Open Panel';
  const learnMoreButton = 'Learn More';
  
  vscode.window.showInformationMessage(message, openPanelButton, learnMoreButton)
    .then((selection) => {
      if (selection === openPanelButton) {
        // User wants to open the panel
        vscode.commands.executeCommand('jarnox.commandCopilot.show');
      } else if (selection === learnMoreButton) {
        // User wants to learn more - you could open documentation here
        vscode.window.showInformationMessage(
          'JarNox Command Copilot lets you generate code using AI models. ' +
          'Type a prompt, select a model, and click Apply to insert code at your cursor.'
        );
      }
    });
}

/**
 * HELPER FUNCTIONS FOR TESTING
 * =============================
 * 
 * These functions are exported for unit testing purposes.
 * They allow tests to access internal functionality without exposing
 * implementation details to regular users of the extension.
 */

// Export helper functions for testing (these won't be visible to normal users)
export const __testing__ = {
  // You can add internal functions here that you want to test
  // For example, if you had utility functions that needed testing
};