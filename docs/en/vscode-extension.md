# VS Code extension

The **Umlay** VS Code extension delivers the full Umlay experience
inside the editor: language server, live diagnostics, a React-based
diagram preview that mirrors the web editor, 19 snippets, context-aware
completion, workspace-wide navigation, and an opt-in Review Assistant.

The viewer-side React components are **shared verbatim** with the web
editor through `@umlay/webview-ui`, so any UX improvement on either
surface lands in the other on the next release.

## Install

### Marketplace

```sh
code --install-extension Umlay.umlay
```

[Marketplace listing](https://marketplace.visualstudio.com/items?itemName=Umlay.umlay)
or search for "Umlay" in the Extensions sidebar.

### Local `.vsix`

1. Download a `.vsix` from the [release assets](https://github.com/e98AZQZxMsYeMNm/uml.keydrop.net/releases)
2. **Extensions → `…` → Install from VSIX…**
   or `code --install-extension umlay-<version>.vsix`

### Build locally

```sh
git clone https://github.com/e98AZQZxMsYeMNm/uml.keydrop.net.git
cd uml.keydrop.net && pnpm install
pnpm -F umlay package    # → apps/vscode/umlay-<version>.vsix
```

## Features

| Area | What you get |
| --- | --- |
| **Language** | Syntax highlighting (`.umlay` + `.umlay.md` Markdown injection) / Hover (intent + `@@doc` + `@@md` + attribute table) / F12 Go to Definition / F2 Rename / `⌘.` Quick Fix / `⇧⌥F` Format (canonical via `irToDsl`) / 19 snippets |
| **Diagnostics** | Lint rules L001–L058 + S/W/C/R; `umlay.diagnostics.mode` switches `draft`/`beta`/`strict`; `disabledRules` / `severityOverrides` for per-rule tuning |
| **Preview** | Tabs (All / Document / per-view) + per-view zoom/pan + IR-driven inline diagrams in Document tab (lazy mount) + Reference Docs aesthetic + 8 theme presets including high-contrast |
| **Workspace tree** | Activity Bar "Umlay" entry — every `.umlay` in the workspace as a 3-tier file → namespace → model/enum tree, stereotype-aware icons, per-file lint badge (`2⚠ 5ℹ`) |
| **Navigation** | Quick Switcher (`Ctrl/Cmd+Alt+U`) for fuzzy view + model search / `Alt+1`–`9` for nth view / `Alt+0` All / `Alt+D` Document / `F8` next diagnostic / `Show in Umlay` (jump from a model name in TS/Prisma/SQL to its `.umlay` declaration) |
| **Status bar** | mode (click → settings UI) / lint count `✗⚠ℹ` (click → next diagnostic) / current theme (click → switcher) |
| **Export** | Single view or All views to SVG / PNG (`umlay.export.defaultDpi` for resolution) |
| **Diff review** | Baseline IR persisted to `workspaceState`; added / modified / removed rendered as hotspot overlays + Document tab diff summary |
| **Review Assistant (opt-in)** | Enabled via `umlay.ai.enabled = true`. Anthropic / OpenAI keys live exclusively in `vscode.SecretStorage` (never in settings.json). `Umlay: Run Review Assistant` streams provider feedback (SSE) into a dedicated **Umlay AI** output channel |

## Keyboard shortcuts

| Action | Keys (mac/Win) |
| --- | --- |
| Activate nth view | `Alt+1` … `Alt+9` |
| All / Document tab | `Alt+0` / `Alt+D` |
| Next/prev diagnostic (in preview) | `F8` / `Shift+F8` |
| Next/prev diagnostic (from editor) | `Cmd/Ctrl+F8` / `Cmd/Ctrl+Shift+F8` |
| Quick Switcher | `Cmd/Ctrl+Alt+U` |
| Find widget inside preview | `Cmd/Ctrl+F` (built-in) |

## Settings (`umlay.*`)

Search `umlay.` in the Settings UI. Highlights:

| Category | Setting (selected) | Purpose |
| --- | --- | --- |
| **diagnostics** | `mode` / `disabledRules` / `severityOverrides` / `autoFixOnSave` | Lint mode / silence rules / per-rule severity / auto-fix on save |
| **preview** | `theme` / `defaultTab` / `tabIcons` / `refreshDebounceMs` / `showDiagnosticsSidebar` / `diagnosticsSidebarWidth` | Auto/manual theme / initial tab / kind icons / debounce / sidebar visibility + width |
| **document** | `showInlineDiagrams` / `maxInlineDiagramSize` / `density` / `showStereotypeBadges` | Document tab inline SVG / per-diagram byte cap / spacing density / stereotype chips |
| **render** | `showReviews` / `allViewsLayout` / `zoomBehavior` | `@review`/`@fix` annotations / All Views grid/column/row / per-view initial zoom |
| **format** | `attributeAlignment` | `none` / `column` (column-aligned attributes) |
| **parse** | `specVersion` | `auto` / `1.8` / `1.9` (cap) |
| **export** | `defaultFormat` / `defaultDpi` | svg/png / 72-600 dpi |
| **workspace** | `fileGlob` | Activity Bar tree discovery glob |
| **ai (opt-in)** | `enabled` / `provider` / `model` | Enable Review Assistant / `anthropic`/`openai` / model id |

**Important:** there is **no** `umlay.ai.apiKey` setting. API keys live
in `vscode.SecretStorage` (OS keychain) only — they never appear in
`settings.json`, exported configs, or sync.

## Review Assistant (opt-in)

`umlay.ai.enabled` defaults to `false`, so a fresh install does no
network traffic. To use it:

1. Set `umlay.ai.enabled = true`
2. Command palette → `Umlay: Configure Review Assistant…`
   → paste an API key (password-style input box, stored in
   SecretStorage)
3. With a `.umlay` open, run `Umlay: Run Review Assistant`
4. Output streams (SSE) into the **Umlay AI** output channel —
   the first bullet appears in ~1 second

You can wipe the key any time with
`Umlay: Remove Stored Review Assistant Credentials`. **The setting
itself is never blanked out** — credentials only ever flow through
SecretStorage.

## Commands (`Umlay:`)

| Command | Use |
| --- | --- |
| `Open Preview` / `Open Preview to the Side` | Open the diagram preview |
| `Export Diagram as Image…` | SVG / PNG export |
| `Reset Diff Baseline` | Start a fresh review cycle |
| `Refresh Preview` | Force re-render every open preview |
| `Go to Next/Previous Diagnostic` | Walk diagnostics from the editor |
| `Pick Preview Theme…` | Switch theme (also from the status bar) |
| `Quick Switch` | Fuzzy view + model search (`Cmd/Ctrl+Alt+U`) |
| `Refresh Workspace` | Re-scan the Activity Bar tree |
| `Configure Review Assistant…` / `Run Review Assistant` / `Remove Stored Review Assistant Credentials` | AI commands (opt-in) |
| `Show in Umlay` | Jump from a model name in TS/Prisma/SQL to its `.umlay` declaration (editor context menu) |

## Versions and compatibility

- **VS Code**: `^1.118.0` (engines)
- **Spec**: 1.9.0 (RFCs 0001–0054)
- **Marketplace identifier**: `Umlay.umlay`

## Related

- The VS Code extension source lives in the reference implementation
  repo
  [e98AZQZxMsYeMNm/uml.keydrop.net](https://github.com/e98AZQZxMsYeMNm/uml.keydrop.net)
  under `apps/vscode/`.
- Spec (`@umlay/spec`) and public RFCs are in this repository
  [umlay/umlay](https://github.com/umlay/umlay) under `packages/spec/`.
- Site: <https://umlay.keydrop.net>
