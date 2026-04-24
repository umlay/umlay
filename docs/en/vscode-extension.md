# VS Code extension

The **Umlay** VS Code extension delivers the full Umlay experience inside
the editor: language server, live diagnostics, a React-based diagram
preview that mirrors the web editor, 19 snippets, and completions.

The extension is published from the reference implementation repo and
shares its viewer React components with the web editor via
`@umlay/webview-ui`, so the two surfaces stay in visual lock-step.

## Install

### From Marketplace (coming soon)

```sh
code --install-extension keydrop.umlay-vscode
```

### From a local `.vsix`

1. [Download a `.vsix`](https://github.com/e98AZQZxMsYeMNm/uml.keydrop.net/releases)
   release asset (or build locally — see below).
2. In VS Code: **Extensions → `…` menu → Install from VSIX…**
3. Or via CLI: `code --install-extension umlay-vscode-<version>.vsix`

### Build locally

```sh
git clone https://github.com/e98AZQZxMsYeMNm/uml.keydrop.net.git
cd uml.keydrop.net && pnpm install
pnpm -F umlay-vscode package    # → apps/vscode/umlay-vscode-<v>.vsix
```

## Feature map

| Feature | Surface |
| --- | --- |
| Syntax highlighting | `.umlay` + `.umlay.md` (Markdown injection) |
| Diagnostics (69 rules) | Problems panel, inline squiggles |
| Hover | model intent / `@@doc` / `@@md` / attribute table |
| Go to Definition | F12 from `@ref(X.y)` / dotted types / view-id |
| Completion | `@stereotype`, `@@directive`, view kinds, `@ref`, `include:` |
| Document Symbols | Outline panel + breadcrumbs |
| Rename | F2 on model / enum names |
| Quick Fix | L001 / L002 / L008 automatic inserts |
| Format Document | ⇧⌥F — canonical DSL via `irToDsl` |
| **Diagram preview** | tabs (All / per-view / Document) + zoom + pan + jump |
| **Diagnostics sidebar** | click → reveal source line |
| **Theme-aware** | dark / light / high-contrast palette switch |

## Preview tips

- **Click any model box** → editor reveals that declaration.
- **Click a diagnostic** in the right sidebar → editor jumps to the
  reported line and column.
- `+` / `-` / `0` / `F` keys zoom in / out / reset / fit the diagram.
- Scale persists per view across reloads (localStorage).
- **`.umlay.md` literate mode** — open a literate file (fenced
  ` ```umlay ` blocks inside Markdown) and the preview renders every
  fence's diagrams combined.
- **`@@sample(from: "./file.jsonl")` expansion (spec 1.3.0)** — relative
  paths resolve against the current doc, constrained to open workspace
  folders (no arbitrary-path reads). Parsed rows land in
  `model.sampleSources`.
- **Explorer right-click → Open Preview to the Side** / editor context
  menu offers the same.
- **Umlay: Export Diagram as Image…** — SVG or PNG (`@2x` with white
  background), per-view or All views to a folder.
- **Review mode (diff strip + hotspot overlay) — 0.4.8+**:
  - Baseline IR is auto-persisted to `workspaceState` (only on clean
    parses).
  - Changed models on ER / Class canvases are highlighted green (added)
    / amber (modified).
  - A `baseline diff: + ModelA  ~ ModelB  − ModelC` strip appears
    directly under the view tabs — click a name to jump to its
    declaration.
  - **Umlay: Reset Diff Baseline (start a fresh review)** command
    re-anchors the baseline.

## Settings

| Setting | Default | Purpose |
| --- | --- | --- |
| `umlay.diagnostics.mode` | `draft` | Lint mode — `strict` promotes more rules to errors |
| `umlay.preview.autoRefresh` | `true` | Re-render the preview when the source file changes |
| `umlay.llm.provider` | `anthropic` | BYOK LLM provider (`anthropic` / `openai`) |
| `umlay.llm.model` | `claude-sonnet-4-6` | Model id passed to the provider |
| `umlay.llm.apiKey` | `""` | API key. Prefer setting via `Umlay: Configure LLM API key` (stored in User settings, not Workspace) |

### Default editor settings (`[umlay]` scope)

Extension 0.4.0+ ships the following via **`configurationDefaults`**:

```jsonc
"[umlay]": {
  "editor.formatOnSave": true,      // irToDsl on save
  "editor.tabSize": 2,
  "editor.defaultFormatter": "keydrop.umlay-vscode"
}
```

Users can override per-workspace or per-user as usual.

### Commands

- `Umlay: Open Preview`
- `Umlay: Open Preview to the Side`
- `Umlay: Configure LLM API key` — interactive provider / model / key setup
- `Umlay: Reset Diff Baseline (start a fresh review)` — clears the
  stored baseline IR so the next clean parse becomes the new reference
  point for review mode

## Architecture

```
.umlay source
   │
   ├─ @umlay/core (parse → IR)
   │    │
   │    ├─ @umlay/lint           (69 rules)
   │    ├─ @umlay/renderer-er    (11 view kinds → SVG)
   │    └─ @umlay/webview-ui     (React components — shared with apps/web)
   │
   └─ @umlay/lsp  (diagnostics / hover / goto / completion / symbols / format / rename / code actions)
        ▲
        │ stdio IPC
        │
   VS Code host ──▶ Webview (React preview)
```

The extension bundles the LSP and the React preview into `dist/` — zero
workspace dependency at runtime.

## Screenshots

<!--
Add these to `apps/vscode/icons/screenshots/` in the reference
implementation repo and this doc will link them automatically:
  - preview-dark.png   — dark theme, split view + diagnostics
  - preview-light.png  — light theme equivalent
  - hover.png          — hover popover on a model
  - completion.png     — context-aware completion
-->

| | |
| --- | --- |
| ![Dark-theme preview](https://raw.githubusercontent.com/e98AZQZxMsYeMNm/uml.keydrop.net/main/apps/vscode/icons/screenshots/preview-dark.png) | ![Hover](https://raw.githubusercontent.com/e98AZQZxMsYeMNm/uml.keydrop.net/main/apps/vscode/icons/screenshots/hover.png) |

## Links

- Reference implementation repo:
  https://github.com/e98AZQZxMsYeMNm/uml.keydrop.net
- Web editor: https://umlay.keydrop.net
- [Japanese version of this page](../ja/vscode-extension.md)
