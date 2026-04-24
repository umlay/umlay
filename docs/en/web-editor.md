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

## Diff review mode (spec 1.3+)

The **Diff tab** in the right sidebar compares the current IR against
the last snapshot persisted in IndexedDB.

### 1. Risk classification header
Every delta is auto-bucketed by `@umlay/core` field-level rules:

| Level | Examples | Color |
| --- | --- | --- |
| 🔴 **Breaking** | model removed, attribute removed, nullable→non-null, PK change | red |
| 🟡 **Caution** | stereotype changed, renamed, `onDelete: CASCADE` added, UNIQUE added, type change, non-null attribute added without a default | amber |
| 🟢 **Safe** | model added, nullable attribute added, default-backed add, doc-only edits | green |

### 2. Per-model delta chips
Each model row shows a `+2 / −1 / ~3 / ⇄1` attribute-delta badge and a
red/amber left border corresponding to the worst risk touching it.

### 3. SVG hotspot overlay
On the ER / class canvases, **added models get a thick green outline
with a halo, modified models get an amber outline**. Reviewers see
which boxes need attention without leaving the diagram view.

### 4. Impact report
Each changed model's `<details>` block lists who references it:
- **ref** — attributes with `@ref(Model.id)` or a relation pointing here
- **view** — views that `include:` this model (exact or `ns.*` / `**`)
- **participant** — sequence-diagram participants resolving to this model

### 5. AI change-impact summary (BYOK)
The 🤖 button calls the configured LLM with a **fixed 3-sentence
structure**:
- **Purpose** — the business / product outcome this change enables
- **Touch points** — downstream components that should pick up the
  change (specific model / view names from the impact list)
- **Do-not-miss** — the single thing a naive diff read would miss

Intent + impact are injected into the prompt, so the response is
actual change-impact analysis rather than a paraphrase of the diff.
Works with Anthropic / OpenAI / **WebGPU** providers.

### 6. Before/After comparison
The 🔀 button lazy-imports the ER renderer and draws the baseline
IR and current IR side-by-side for a visual sanity check.

### 7. Reviewer checklist (rule-based, no AI)
`apps/web/lib/review-checklist.ts` joins Risk × Impact and emits
actionable TODOs:
- attribute removed → "Plan DB column-drop migration" + "Update N
  referrer sites"
- CASCADE added → "Verify cascading delete is intended"
- stereotype changed → "Document the semantic shift (ADR)"
- view includes changed model → "Re-review N views"
- participant resolves to changed model → "Re-validate sequence flow"

### 8. Namespace grouping
Changed models cluster under a namespace header
(`auth (3 changes) / billing (1 change)`) for feature-level
orientation before drilling into rows.

### 9. Model intent surfacing
Each changed model shows its `rationale.intent` italicised directly
under the name — the *purpose* is anchored before every attribute
diff, so reviewers never lose sight of why the model exists.

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
