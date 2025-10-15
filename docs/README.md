# JarNox Command Copilot Documentation

This VS Code extension helps you write code using AI. You type what you want, and it generates code for you.

## What is this?

This extension adds a panel to VS Code where you can:
- Ask AI to write code
- Choose different AI models
- Insert code directly into your files

## Files in this project

### Main code files (src folder)
- `main.ts` - Starts the extension when VS Code opens
- `webviewProvider.ts` - Creates the sidebar panel with buttons and input box
- `llmService.ts` - Talks to the AI server to get code
- `modelActions.ts` - Puts the generated code into your files
- `textProcessor.ts` - Cleans up the AI response text

### Test files
- `pure-helpers.test.ts` - Tests if the code works correctly

### Config files
- `package.json` - Extension settings and requirements
- `tsconfig.json` - How to compile TypeScript

## Documentation files
- `USAGE.md` - How to use the extension
- `CHALLENGES.md` - Known problems and solutions

## How it works

1. You type what code you want
2. Extension sends your request to AI server
3. AI writes the code
4. Extension puts the code in your file

The AI server runs on `http://72.60.98.171:11434` by default.
