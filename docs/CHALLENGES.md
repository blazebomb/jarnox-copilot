# Known Challenges & Workarounds

This document tracks current limitations of JarNox Command Copilot and how to mitigate them. When you fix one, update this list and highlight the change in the changelog or release notes.

## 1. Remote Ollama Endpoint Reliability

- **Symptoms** – “Generation failed”, empty previews, long delays, or errors in the Output panel.
- **Root cause** – The default endpoint (`http://72.60.98.171:11434`) is remote and may be offline, throttled, or running a different model set.
- **Workarounds**
  1. Point the extension at a local Ollama instance by editing `DEFAULT_LLM_CONFIG.baseUrl` in `src/services/llmService.ts`.
  2. Confirm the model is available: `ollama pull llama3.2:latest` (or whichever model you select in the dropdown).
  3. Watch the “JarNox Command Copilot” Output channel for precise error messages.
- **Future improvement ideas**
  - Expose the endpoint/model configuration in VS Code settings.
  - Detect connectivity issues proactively and show a targeted notification.

## 2. Response Length and Token Limits

- **Symptoms** – The generated code is truncated or missing trailing lines.
- **Root cause** – `DEFAULT_LLM_CONFIG.maxTokens` is capped at 100 to keep the demo responsive.
- **Workarounds**
  1. Increase `maxTokens` in `src/services/llmService.ts` if you expect longer outputs.
  2. Split large tasks into smaller prompts to keep each response concise.
- **Future improvement ideas**
  - Surface a slider or setting in the UI for token limits.
  - Display a warning when the response might be truncated.

## 3. Workspace Requirements for File Actions

- **Symptoms** – Model returns JSON action but nothing happens; warning appears about missing workspace.
- **Root cause** – VS Code’s file system APIs require an open workspace folder; the extension skips actions otherwise.
- **Workarounds**
  1. Open a folder (not a single file) before running the extension.
  2. For quick experiments, use `File → Add Folder to Workspace…`.
- **Future improvement ideas**
  - Prompt the user to pick a workspace folder when an action is requested but none is available.
  - Add a settings toggle to disable file actions entirely for cautious users.

## 4. Preview vs Apply Consistency

- **Symptoms** – Preview shows one result while Apply inserts a different snippet, or an empty string is inserted.
- **Root cause** – The model may return different outputs for consecutive calls; also, cleaning steps differ slightly between preview (raw text) and apply (sanitized text).
- **Workarounds**
  1. If you need the exact preview output, copy it from the sidebar and paste manually.
  2. Use the same request type (preview or apply) when reproducing an issue for debugging.
- **Future improvement ideas**
  - Cache the preview response and reuse it when the user chooses Apply within a short window.
  - Offer a setting to disable automatic cleanup for apply operations.

## 5. Lack of Built-in Authentication/Headers

- **Symptoms** – Hosted inference endpoints that require tokens or custom headers cannot be reached.
- **Root cause** – `callOllamaAPI` posts anonymously with static headers (`Content-Type: application/json`).
- **Workarounds**
  1. Modify `callOllamaAPI` to include required headers or query parameters.
  2. Wrap your endpoint with a proxy that injects authentication.
- **Future improvement ideas**
  - Support VS Code Secret Storage for secure tokens.
  - Allow per-model configuration that includes headers.

## 6. Limited Test Coverage

- **Symptoms** – Refactors can break UI interactions or file actions without immediate detection.
- **Root cause** – Current tests cover only pure helper functions.
- **Workarounds**
  1. Manually exercise preview/apply flows and file actions after significant changes.
  2. Add targeted unit tests for `modelActions` and integration tests using `@vscode/test-electron`.
- **Future improvement ideas**
  - Automate smoke tests that launch the extension and execute common flows.
  - Add contract tests against a mock Ollama server to validate request/response handling.

Keep these items in mind when planning work. Addressing them will make the extension more robust for both demo environments and real-world usage.
