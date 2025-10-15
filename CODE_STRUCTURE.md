# Code Structure Documentation
## JarNox Command Copilot Extension

This document explains the new modular structure of the VS Code extension, making it easy for anyone (even non-programmers) to understand how the code is organized.

## 📁 Project Structure

```
src/
├── extension.ts              # Main entry point (imports from modules below)
├── main.ts                   # Extension activation/deactivation logic
│
├── ui/
│   └── webviewProvider.ts    # Sidebar interface (what users see and interact with)
│
├── services/
│   ├── llmService.ts         # AI model communication (talks to Ollama)
│   └── modelActions.ts       # File operations (create, edit, insert files)
│
├── utils/
│   └── textProcessor.ts      # Text cleaning and formatting utilities
│
└── test/
    └── pure-helpers.test.ts  # Automated tests to ensure everything works
```

## 🎯 What Each File Does

### `extension.ts` - The Front Door
- **Purpose**: Main entry point that VS Code loads
- **Think of it as**: The front door of a house - everything starts here
- **What it does**: 
  - Imports functionality from other modules
  - Provides backward compatibility with existing code
  - Keeps the same external interface while internally using the new structure

### `main.ts` - The House Manager
- **Purpose**: Controls the extension lifecycle (startup and shutdown)
- **Think of it as**: The house manager who sets everything up and coordinates activities
- **What it does**:
  - Starts the extension when VS Code loads it
  - Creates the sidebar panel
  - Registers commands users can run
  - Cleans up when the extension shuts down

### `ui/webviewProvider.ts` - The User Interface
- **Purpose**: Creates and manages the sidebar panel users interact with
- **Think of it as**: The reception desk where visitors interact with the building
- **What it does**:
  - Creates the HTML interface with buttons, text boxes, and dropdowns
  - Handles user clicks and form submissions
  - Displays status messages and results
  - Communicates user requests to the backend services

### `services/llmService.ts` - The AI Communication Hub
- **Purpose**: Handles all communication with AI language models (like Ollama)
- **Think of it as**: A translator who speaks to AI models in their language
- **What it does**:
  - Formats user requests into prompts the AI can understand
  - Sends requests to the AI server over the internet
  - Receives and processes AI responses
  - Handles different response formats (streaming vs. single responses)

### `services/modelActions.ts` - The File Operations Center
- **Purpose**: Performs file operations based on AI responses
- **Think of it as**: A filing clerk who creates, edits, and organizes documents
- **What it does**:
  - Parses special JSON commands from AI responses
  - Creates new files in your project
  - Appends content to existing files
  - Inserts code at your cursor position
  - Ensures file operations are safe (can't access files outside your project)

### `utils/textProcessor.ts` - The Text Cleaning Service
- **Purpose**: Cleans up and formats text before it gets inserted into your code
- **Think of it as**: An editor who polishes text to make it look professional
- **What it does**:
  - Removes unwanted comments from generated code
  - Handles different programming language comment styles (// vs # vs <!-- -->)
  - Unwraps code from markdown fences (removes ```language blocks)
  - Inserts text at multiple cursor positions simultaneously

## 🔄 How Everything Works Together

1. **User opens VS Code** → `main.ts` activates the extension
2. **User opens sidebar panel** → `webviewProvider.ts` creates the interface
3. **User types a prompt and clicks Apply** → `webviewProvider.ts` captures the input
4. **Request goes to AI** → `llmService.ts` sends prompt to Ollama server
5. **AI responds** → `llmService.ts` receives and processes the response
6. **Response gets processed** → `modelActions.ts` or `textProcessor.ts` handle the result
7. **Result appears in editor** → Code gets inserted or files get created
8. **User sees confirmation** → `webviewProvider.ts` shows success message

## 🎨 Benefits of This Structure

### For Developers:
- **Separation of Concerns**: Each file has one clear responsibility
- **Easy Testing**: Each module can be tested independently
- **Easy Maintenance**: Changes to UI don't affect AI logic and vice versa
- **Easy Extension**: New features can be added as new modules
- **Code Reuse**: Modules can be used in other parts of the extension

### For Non-Programmers:
- **Clear Organization**: Easy to find where specific functionality lives
- **Logical Flow**: Files are organized by what they do, not how they do it
- **Comprehensive Comments**: Every function has plain-English explanations
- **Consistent Naming**: Files and functions have descriptive names
- **Documentation**: This file explains the big picture

## 🛠️ Making Changes

### To modify the user interface:
- Edit `ui/webviewProvider.ts`

### To change how AI requests are handled:
- Edit `services/llmService.ts`

### To modify file operations:
- Edit `services/modelActions.ts`

### To change text processing:
- Edit `utils/textProcessor.ts`

### To add new features:
- Create a new file in the appropriate folder (`ui/`, `services/`, or `utils/`)
- Import and use it in `webviewProvider.ts` or `main.ts`

## 🧪 Testing

The test file `pure-helpers.test.ts` tests the utility functions to ensure they work correctly. The modular structure makes it easier to:
- Test each component separately
- Mock dependencies for isolated testing  
- Add new tests for new modules

## 📚 Dependencies

### External Libraries:
- **VS Code API**: For interacting with the editor and creating UI
- **Fetch API**: For making HTTP requests to the AI server

### Internal Dependencies:
- Each module imports only what it needs from other modules
- Clear dependency chain: `extension.ts` → `main.ts` → `ui/` → `services/` → `utils/`
- No circular dependencies (files don't import from each other in circles)

This structure makes the codebase much more maintainable and easier to understand!
