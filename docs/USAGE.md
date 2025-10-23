# JarNox Command Copilot – User Guide

This guide walks through the full workflow for people using the extension inside VS Code, from setup to advanced actions.

## 1. Install and Prepare

1. Clone or download the project, then run:
   ```bash
   npm install
   npm run compile
   ```
2. Open the `co-pilot_jarnox` folder in VS Code (`code .`).
3. Press `F5` (or use **Run Extension** in the Run and Debug view) to launch an **Extension Development Host** window.
4. Ensure an Ollama-compatible server is reachable. By default the extension calls `http://72.60.98.171:11434`, but you can change this in `src/services/llmService.ts`.

Keep the development host window open while you test; that is the environment where the extension runs.

## 2. Meet the Sidebar

In the Extension Development Host window, locate **JarNox Command Copilot (Demo)** in the Explorer view. The panel contains:

- **Model selector** – Dropdown with presets (`llama3.2:latest`, `mistral:latest`, `llama3:latest`, `sqlcoder:latest`, `qwen2.5-coder:7b`, `codellama:latest`, `llama2:latest`).
- **Prompt input** – Multi-line text box for your instructions.
- **Buttons** – **Apply to Editor** inserts the generated code; **Preview in Panel** renders it inside the sidebar.
- **Activity log** – Shows a timestamped history of prompts and responses.
- **Status line** – Reports what the extension is doing (ready, generating, completed, etc.).
- **Response preview** – Displays the most recent preview or the raw response returned by the model.

## 3. Generate Code

1. Open or create a file in the editor and place the cursor where you want code inserted.
2. Choose a model if you want something other than the default (`llama3.2:latest`).
3. Write a detailed prompt such as “Create a TypeScript function that validates an email address and returns a boolean.”
4. Click **Preview in Panel** to see the output before inserting, or **Apply to Editor** to insert immediately.

During generation a notification appears (“Generating code…”). When the call succeeds:

- **Preview** – The response is shown in the sidebar and nothing is written to the editor.
- **Apply** – The response is cleaned (comments/fences removed) and inserted at every active cursor. A summary appears in the activity log.

## 4. Working with Multiple Cursors

If you have multiple carets active, the extension inserts the same cleaned response at each location. This is handy for creating similar snippets in several places. Preview mode is unaffected by cursor count.

## 5. File Actions (Experimental)

When the language model replies with a JSON payload instead of raw code, the extension can execute file operations:

```json
{ "action": "create_file", "path": "notes/todo.md", "content": "- item\n" }
```

Supported actions:

- `create_file` – Create a new file with the provided content.
- `append_file` – Append content to an existing file (created if missing).
- `insert_code` – Insert content at the current cursor positions.

Rules:

- A workspace folder must be open; otherwise actions are skipped with a warning.
- Paths are resolved relative to the first workspace folder.
- Content is passed through the same cleanup as standard responses.

If an action is executed, the sidebar log notes the operation and any warnings encountered.

## 6. Changing the Endpoint or Model List

The dropdown values are defined in `src/ui/webviewProvider.ts`. To change them:

1. Edit the `<option>` elements in the HTML template.
2. Rebuild with `npm run compile`.

To change the default endpoint, model, temperature, or max token count, modify `DEFAULT_LLM_CONFIG` in `src/services/llmService.ts`.

## 7. Tips for Better Results

- Provide context (“We use Express with TypeScript; generate a route handler…”) so the model has the right framing.
- Keep prompts focused. Handle large tasks by chaining smaller requests.
- Use preview for long or destructive operations to confirm the response before applying.
- Watch the activity log for summaries and the Output panel (JarNox Command Copilot channel) for detailed diagnostics.

## 8. Troubleshooting Quick Reference

- **No output inserted** – Check that an editor tab is active and your prompt is not empty.
- **“Generation failed” message** – Confirm the Ollama endpoint is reachable and responding. Network errors are logged in the Output panel.
- **File action ignored** – Ensure the response is valid JSON with a supported `action` value and that a workspace folder is open.
- **Extension window didn’t open** – Relaunch VS Code from the project root (`co-pilot_jarnox`) so the debug configuration is detected, then press F5 again.

See `CHALLENGES.md` for more detailed limitations and workarounds.
