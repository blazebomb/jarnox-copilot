# JarNox Command Copilot – Docs Overview

These docs give developers and advanced users a deeper look at how the JarNox Command Copilot extension is put together and how the pieces interact. If you are just trying the extension for the first time, start with the root `README.md`; if you are building features or debugging, this folder is for you.

## Feature Snapshot

- Copilot-style sidebar living in the Explorer view
- Prompt input with “Preview” (view result in panel) and “Apply” (insert into editor) flows
- Model picker with several Ollama-compatible options
- Activity log and status line so users can see what happened
- Experimental file actions triggered by structured JSON coming back from the model

## Source Layout

The TypeScript code is intentionally modular so that UI, AI, and VS Code glue stay separate:

| File | Purpose |
| ---- | ------- |
| `src/extension.ts` | Re-exports the modular pieces for backwards compatibility with tests and VS Code entry points. |
| `src/main.ts` | Registers the sidebar view and the `JarNox: Show Command Copilot` command. Handles activation lifecycle. |
| `src/ui/webviewProvider.ts` | Builds the sidebar HTML, wires up preview/apply buttons, model selector, log, and response display. |
| `src/services/llmService.ts` | Handles prompt construction and all HTTP calls to Ollama (defaults to `http://72.60.98.171:11434`). |
| `src/services/modelActions.ts` | Parses JSON responses into create/append/insert actions and executes them safely. |
| `src/utils/textProcessor.ts` | Comment stripping, code fence handling, and cursor insertion helpers. |

Unit tests (`src/test/pure-helpers.test.ts`) focus on the pure helpers re-exported through `extension.ts` to avoid bootstrapping VS Code during test runs.

## Data Flow Basics

1. User launches the sidebar and submits a prompt (preview or apply).
2. `webviewProvider` forwards the request to the extension host via `postMessage`.
3. The message handler normalizes the prompt, calls `generateResponseForUser` with the selected model, and awaits the result.
4. The response is cleaned with `unwrapCodeFence`/`stripComments` and either posted back to the webview (preview) or written into the active editor (apply). For JSON actions we delegate to `modelActions` instead.
5. The webview updates its activity log, status label, and (for preview) the response display.

## Tests and Tooling

- `npm run compile` – build TypeScript once (runs before launch/debug).
- `npm run watch` – continuously build while editing.
- `npm test` – mocha suite covering helper utilities and JSON parsing logic.

Future automated tests can hook into VS Code’s integration harness (`@vscode/test-electron`) if UI-level coverage is needed.

## Documentation Set

- `USAGE.md` – end-user walkthrough with screenshots cues and tips.
- `CHALLENGES.md` – list of current limitations, workarounds, and ideas for contributors.

Keep these docs updated when you change the UI flow, adjust the default LLM configuration, or add/remove model capabilities. Consistency between this folder and the root README helps new contributors ramp up quickly. Feel free to add new pages (e.g., architecture decisions or troubleshooting guides) as the project evolves.
