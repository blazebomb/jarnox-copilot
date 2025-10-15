/**
 * EXTENSION ENTRY POINT - REFACTORED
 * ===================================
 * 
 * This file has been refactored into multiple modules for better organization:
 * 
 * MODULES:
 * --------
 * - src/main.ts                    → Main extension activation/deactivation
 * - src/ui/webviewProvider.ts      → Sidebar UI and user interaction
 * - src/services/llmService.ts     → AI model communication (Ollama API)
 * - src/services/modelActions.ts   → File operations (create, append, insert)
 * - src/utils/textProcessor.ts     → Text processing utilities
 * 
 * BENEFITS OF REFACTORING:
 * ------------------------
 * ✅ Easier to understand - each file has a single, clear purpose
 * ✅ Easier to maintain - changes to UI don't affect AI logic and vice versa
 * ✅ Easier to test - each module can be tested independently
 * ✅ Easier to extend - new features can be added as new modules
 * ✅ Better code reuse - modules can be used in other parts of the extension
 * 
 * HOW IT WORKS:
 * -------------
 * 1. VS Code calls activate() from main.ts when extension starts
 * 2. main.ts creates a webviewProvider instance for the sidebar UI
 * 3. webviewProvider handles user interactions and calls services as needed
 * 4. llmService communicates with AI models (Ollama)
 * 5. modelActions performs file operations based on AI responses
 * 6. textProcessor cleans up and formats code before insertion
 */

// Re-export the main extension functions from the new modular structure
export { activate, deactivate } from './main';

// Re-export utilities for backward compatibility and testing
// These allow existing tests to continue working with the new structure
export { 
  getCommentPrefix as commentPrefix,
  getCommentSuffix as commentSuffix, 
  unwrapCodeFence,
  stripComments,
  insertTextAtCursors as insertAtCursors
} from './utils/textProcessor';

export {
  parseModelAction,
  executeModelAction as tryExecuteAction,
  type ModelAction
} from './services/modelActions';

export {
  generateResponseForUser as callOllama,
  buildPromptForModel as buildModelPrompt
} from './services/llmService';

/**
 * TESTING EXPORTS
 * ===============
 * 
 * These exports allow the existing test suite to continue working
 * while we transition to the new modular structure.
 */
export const __test__ = {
  // Text processing functions
  commentPrefix: (langId: string) => {
    const { getCommentPrefix } = require('./utils/textProcessor');
    return getCommentPrefix(langId);
  },
  
  commentSuffix: (langId: string) => {
    const { getCommentSuffix } = require('./utils/textProcessor');
    return getCommentSuffix(langId);
  },
  
  unwrapCodeFence: (text: string) => {
    const { unwrapCodeFence } = require('./utils/textProcessor');
    return unwrapCodeFence(text);
  },
  
  stripComments: (text: string) => {
    const { stripComments } = require('./utils/textProcessor');
    return stripComments(text);
  },
  
  parseModelAction: (text: string) => {
    const { parseModelAction } = require('./services/modelActions');
    return parseModelAction(text);
  }
};
