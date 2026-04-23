# Web editor

`https://umlay.keydrop.net/` — a zero-install playground backed by the
same parser / renderer / lint stack the VS Code extension uses (via
`@umlay/webview-ui`).

## AI providers

The AI Review / AI Generate panels are **BYOK** — no Umlay server sees
your DSL or your keys. You pick one of three providers:

| Provider | Where the model runs | API key required |
| --- | --- | --- |
| `anthropic` | Anthropic (cloud) | yes (`sk-ant-…`, User-settings only) |
| `openai` | OpenAI (cloud) | yes (`sk-…`, User-settings only) |
| `webgpu` | **In your browser** via `@mlc-ai/web-llm` | **no** |

### WebGPU provider (spec 1.3.0)

- Lazy-loaded (~5 MB JS bundle + 2-4 GB model weights, cached in OPFS /
  IndexedDB so subsequent sessions skip the download).
- Three pre-validated model slots:
  - Llama 3.2 3B — 2.0 GB, 4 GB+ VRAM
  - Phi 3.5 mini — 2.2 GB, 4 GB+ VRAM
  - Qwen 2.5 7B — 4.4 GB, 8 GB+ VRAM
- Option appears only when `navigator.gpu` resolves a real adapter; falls
  back to Anthropic / OpenAI on machines without WebGPU.
- First run shows a download + compile progress bar; subsequent reviews
  are instant (on-device inference, no network).

## `@@sample(from: "./file.jsonl")` loading

The web editor loads external sample files via the **Attachments panel**:

1. Open the panel (right sidebar).
2. Upload your `.jsonl` / `.json` / `.csv` / `.yaml` file.
3. The parser picks it up on the next edit — matching by filename
   (basename first, then path-ending) against the path you wrote in
   `@@sample(from: "...")`.

Files stay in the browser's IndexedDB; nothing is uploaded to a server.

## URL sharing (`?d=`)

The editor compresses the current DSL into a URL fragment (up to ~8 KB
encoded). Paste a shared link, get the same IR — no login, no server
state.

## Export

| Format | Notes |
| --- | --- |
| SVG | per-view or all views, no raster loss |
| PNG | `@2x` with white background (via canvas) |
| DSL | the current buffer, verbatim |
| IR JSON | after parse + trait expansion + selector projection |

## Feature parity with VS Code

The rendering surface is identical — both use `@umlay/webview-ui`
(SvgViewer / AllViewsPane / DocumentView / ViewTabs / DiagnosticsSidebar
/ SelectorToggles / ReviewPins / Markdown). LSP features
(hover / completion / rename / references / workspace symbols / semantic
tokens) live only on the VS Code side today.
