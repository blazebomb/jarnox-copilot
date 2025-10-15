/**
 * LLM INTEGRATION MODULE
 * ======================
 * 
 * This module handles all communication with AI language models.
 * Currently it's set up to work with Ollama (a local AI server),
 * but it could be adapted to work with other AI services like OpenAI,
 * Claude, or any other language model API.
 * 
 * What this module does:
 * - Sends your prompts to the AI model
 * - Receives responses from the AI
 * - Handles different response formats (streaming vs single response)
 * - Builds proper prompts that tell the AI how to respond
 */

/**
 * AI MODEL CONFIGURATION
 * ======================
 * 
 * These are the settings for how we talk to the AI model.
 * You can change these to use different models or adjust how the AI behaves.
 */
export interface LLMConfig {
  /** The base URL where the Ollama server is running */
  baseUrl: string;
  
  /** The name of the AI model to use (like 'llama3.2:latest') */
  modelName: string;
  
  /** How creative the AI should be (0.0 = very predictable, 1.0 = very creative) */
  temperature: number;
  
  /** Maximum number of tokens (words/pieces) the AI can generate */
  maxTokens: number;
  
  /** Whether to get the response all at once (false) or piece by piece (true) */
  stream: boolean;
}

/**
 * DEFAULT CONFIGURATION
 * =====================
 * 
 * This is the standard setup that works with a local Ollama installation.
 * The IP address points to a remote Ollama server - you might want to
 * change this to 'localhost' if you're running Ollama on your own computer.
 */
export const DEFAULT_LLM_CONFIG: LLMConfig = {
  baseUrl: 'http://72.60.98.171:11434',  // Remote Ollama server
  modelName: 'llama3.2:latest',           // Default model
  temperature: 0.7,                       // Balanced creativity
  maxTokens: 100,                         // Keep responses concise
  stream: false                           // Get complete response at once
};

/**
 * PROMPT BUILDER
 * ==============
 * 
 * This function creates a detailed instruction for the AI model.
 * It tells the AI exactly how to respond depending on what the user wants.
 * 
 * The AI can respond in two ways:
 * 1. With a JSON object for file operations (creating/editing files)
 * 2. With plain code that gets inserted at the cursor
 * 
 * @param userRequest - What the user typed in the input box
 * @returns A detailed prompt that guides the AI's response
 */
export function buildPromptForModel(userRequest: string): string {
  return [
    'You are a VS Code automation agent. Decide the best response format:',
    '',
    'If the user requests creating or modifying files, respond ONLY with a single JSON object:',
    '{"action":"create_file|append_file|insert_code","path":"relative/path?","content":"string"}',
    '- create_file: create a new file at path with content',
    '- append_file: append content to existing file (create if missing)',
    '- insert_code: insert code into the current editor (no path)',
    'Rules:',
    '- Do not include explanations or backticks',
    '- Use Unix-style forward slashes in paths',
    '- Keep content exactly as intended (no extra commentary)',
    '',
    'Otherwise, if the user wants code to paste, reply with ONLY the code (you may use a fenced code block).',
    '',
    'User request:',
    userRequest
  ].join('\n');
}

/**
 * OLLAMA API CALLER
 * =================
 * 
 * This is the main function that sends your request to the AI model
 * and gets back a response. It handles all the network communication
 * and error checking.
 * 
 * @param prompt - The complete prompt to send to the AI
 * @param config - Configuration settings (or uses defaults)
 * @returns Promise that resolves to the AI's response text
 * @throws Error if the API call fails
 */
export async function callOllamaAPI(
  prompt: string, 
  config: Partial<LLMConfig> = {}
): Promise<string> {
  
  // Merge user config with defaults
  const finalConfig = { ...DEFAULT_LLM_CONFIG, ...config };
  
  // Prepare the data to send to the AI server
  const requestPayload = {
    model: finalConfig.modelName,
    prompt: prompt,
    temperature: finalConfig.temperature,
    max_tokens: finalConfig.maxTokens,
    stream: finalConfig.stream,
  };

  console.log('Sending request to Ollama:', {
    url: `${finalConfig.baseUrl}/api/generate`,
    model: finalConfig.modelName,
    promptLength: prompt.length
  });

  try {
    // Send the HTTP request to the Ollama server
    const response = await fetch(`${finalConfig.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    // Check if the HTTP request was successful
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get the response text from the server
    const responseText = await response.text();
    
    // Try to parse as a single JSON response first
    try {
      const jsonResponse = JSON.parse(responseText) as any;
      if (typeof jsonResponse?.response === 'string') {
        return jsonResponse.response;
      }
    } catch (parseError) {
      // If single JSON parsing fails, try NDJSON format
      console.log('Single JSON parse failed, trying NDJSON format...');
    }

    // Handle NDJSON format (multiple JSON objects, one per line)
    const lines = responseText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length > 1) {
      const combinedResponse = lines
        .map((line) => {
          try { 
            return (JSON.parse(line) as any).response || ''; 
          } catch { 
            return ''; 
          }
        })
        .join('');
      
      if (combinedResponse) {
        return combinedResponse;
      }
    }

    // If we can't parse the response, throw an error
    throw new Error(`Unexpected response format from server: ${responseText.slice(0, 200)}...`);

  } catch (error) {
    console.error('Error calling Ollama API:', error);
    
    // Provide helpful error messages
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to Ollama server at ${finalConfig.baseUrl}. Is the server running?`);
    }
    
    throw error;
  }
}

/**
 * CONVENIENCE FUNCTION: SEND USER REQUEST TO AI
 * ==============================================
 * 
 * This is a simple wrapper that combines prompt building and API calling.
 * Most of the time, you'll use this function instead of the lower-level ones.
 * 
 * @param userRequest - What the user typed
 * @param modelName - Which AI model to use (optional, uses default)
 * @returns Promise that resolves to the AI's response
 */
export async function generateResponseForUser(
  userRequest: string, 
  modelName?: string
): Promise<string> {
  
  // Build the detailed prompt for the AI
  const fullPrompt = buildPromptForModel(userRequest);
  
  // Prepare config with custom model name if provided
  const config = modelName ? { modelName } : {};
  
  // Send to AI and return response
  return callOllamaAPI(fullPrompt, config);
}