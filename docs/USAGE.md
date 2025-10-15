# How to Use JarNox Command Copilot

## Setup

1. Install the extension in VS Code
2. Make sure Ollama server is running
3. Look for "JarNox Command Copilot" panel in Explorer sidebar

## Basic Usage

### Step 1: Choose AI Model
Click the dropdown at top of panel. Pick one:
- llama3.2:latest (recommended - fast)
- mistral:latest (good for creative tasks) 
- codellama:latest (best for coding)
- sqlcoder:latest (for database queries)
- qwen2.5-coder:7b (advanced)
- llama2:latest (older model)

### Step 2: Write Your Request
Type what you want in the text box. Examples:
- "create a function to add two numbers"
- "make a for loop that prints 1 to 10"
- "write a class for a user with name and email"

### Step 3: Apply
Click "Apply" button. The AI will generate code and put it where your cursor is.

## Voice Input

Click the microphone button to speak instead of typing. 

Note: Voice often doesn't work in VS Code. If it fails, use Windows+H instead (Windows built-in speech-to-text).

## Tips

- Open a file first, then place cursor where you want code
- Be specific in your requests
- Try different models for different tasks
- Check the log at bottom to see what was generated

## File Operations

Some requests can create files:
- "create a new file called utils.js with helper functions"
- "add logging to this file"

These work only if you have a workspace folder open.

## Problems?

See CHALLENGES.md for known issues and solutions.
