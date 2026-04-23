# LSP Integration — Language Server Protocol Guide

A guide for implementing a Language Server / IDE extension for Umlay DSL, mapping `@umlay/spec` artifacts to LSP capabilities.

## Target audience

- Developers building VS Code / JetBrains / Neovim extensions for Umlay DSL
- Teams adding Umlay support to a custom editor
- Familiar with LSP (Language Server Protocol) and DAP basics

## 1. LSP building blocks

A Umlay DSL LSP implementation typically composes:

| Component | Purpose | Source in this repo |
| --- | --- | --- |
| **Parser** | `.umlay` → AST | `grammar.bnf` conformant (implemented in a separate repo) |
| **IR Builder** | AST → normalized IR | `ir.schema.json` conformant |
| **Resolver** | Reference resolution (@ref / @@dependencies.on / protocol extends) | `skills/*/write-uml.md` Step 6 / RFC 0005 / 0030 |
| **Linter** | S / L / R / W / C rules | `skills/*/review-uml.md` + RFC 0029 (lint-rules.md) |
| **Formatter** | Pretty-print DSL | Undefined (implementation choice; future RFC candidate) |
| **Hover / Completion** | Type info / protocol method completion | IR + Resolver output |

## 2. LSP method mapping

### textDocument/diagnostic

- Return parse errors and spec violations (S rules) as diagnostics
- Lint warnings (L / R / W) map to `Warning` / `Information`
- Deprecated (W001) / Experimental (W002) use `severity: Information` + `tags: [Deprecated]`

```ts
const diagnostic: Diagnostic = {
  range,
  severity: DiagnosticSeverity.Error,
  code: "S03",
  source: "umlay-lsp",
  message: "Unknown stereotype '@master'. Allowed: entity / aggregate_root / value_object / service / interface",
  tags: rule === "W001" ? [DiagnosticTag.Deprecated] : []
};
```

### textDocument/hover

- Hovering over an attribute / model / protocol shows `@intent` + type info + namespace
- Hovering the `X` in `@ref(X.y)` shows the target model summary
- `@@sample` row fields show the attribute description
- `@deprecated` / `@experimental` elements surface a banner at the top

### textDocument/completion

Priority ordering:

1. Local scope (attributes within the same model)
2. Same-namespace models / types / enums / protocols
3. Types from `import`-ed namespaces
4. Reserved words (`model` / `protocol` / `view` / `@@mode` / ...)
5. (Future) derivatives available via blanket `impl`

### textDocument/definition

- `@ref(X.y)` → X's declaration location
- `@@dependencies(on: pm_core.Task)` → `pm_core.Task` declaration
- `extends A, B` → declarations of A and B
- `@@implements(Repository<User>)` → both `Repository` and `User`

### textDocument/references

- List all references to a model / protocol / union
- Useful for verifying rename impact

### textDocument/rename

- Renames identifier (model / attribute / protocol) across all `impl` / `@ref` / `include`
- RFC 0026's `_id` (content hash based) stays stable, so review annotations survive

### textDocument/formatting

Implementation-defined, but recommended conventions:

- Visibility prefix stays aligned at attribute start
- Annotations follow the type (`+id UUID! @id`)
- Multiple annotations on one line, space-separated
- Block directives (`@@id`, `@@sample`) cluster at the top of the model body

The reference implementation (`@umlay/lsp` 1.2+) runs `irToDsl(ir)` and
replaces the whole buffer on save.

### workspace/symbol (Umlay 1.2+)

- ⌘T / Ctrl+T — project-wide symbol search.
- Returns models / enums / views / protocols / unions as FQN (`ns.Name`).
- Query match is case-insensitive substring.

### textDocument/references (Umlay 1.2+ refinement)

In addition to the regular reference resolution, the reference
implementation **ignores matches inside `// line comments` and
`"""triple-quoted"""` strings** so `@@doc` / `@@md` bodies don't
produce false positives when the body text happens to contain a
model name.

### textDocument/semanticTokens/full (Umlay 1.2+)

- IR-aware highlighting — distinguishes `User` (a model reference)
  from `User` (just a string literal or attribute name) which a pure
  tmLanguage grammar cannot.
- Token types: `namespace`, `class`, `enum`, `interface`, `struct`,
  `function` (view id), `property`, `variable`, `decorator`
  (`@annotation` / `@@directive`).
- Identifiers inside triple-quoted strings and line comments emit no
  token.

## 3. Reference resolution (RFC 0005 / 0009 / 0014)

Resolution order:

1. Local (same file)
2. Same-namespace other files (via `import` or implicit scan)
3. `import <ns>` imported namespaces
4. `import "./path" as alias` aliased imports
5. `import "./glob/**/*.umlay"` expanded namespaces

Glob expansion runs at build time with file-watch integration.

## 4. Caching strategy

For large Umlay workspaces:

- **Per-file cache**: parse result → AST + file-local IR
- **Workspace cache**: merged IR (namespace-resolved)
- **Invalidation**: on file change, drop caches for dependent namespaces

Recommended stack: Tree-sitter / Chevrotain incremental parsing + LRU cache.

## 5. IR-powered code lenses / inlay hints

- Display CPM `_cpm.totalFloat` (RFC 0024) as inlay hints on `@@sample` rows
- Error lens on `@@implements(Repository<User>)` when `User` doesn't implement `Identifiable`
- Inlay for `protocol extends A, B, C` MRO (RFC 0011)

## 6. DAP (Debug Adapter) integration (future)

Out of scope for current spec, but future directions:

- Breakpoints on individual sequence diagram messages
- Auto-traces when `@pre` / `@post` contracts fail
- Execution logs per `critical retry(n)` attempt

## 7. Sample LSP implementation (reference)

Implementation repo (to be published separately):

```
umlay-lsp/
├── src/
│   ├── parser.ts          # grammar.bnf → Chevrotain
│   ├── resolver.ts        # @ref / extends / impl resolution
│   ├── linter.ts          # lint-rules.md (RFC 0029) conformant
│   ├── diagnostic.ts      # LSP diagnostic conversion
│   ├── hover.ts
│   ├── completion.ts
│   └── server.ts          # vscode-languageserver entry
└── client/
    └── extension.ts       # VS Code extension
```

## 8. Conformance integration

An LSP implementation can open every sample in `packages/spec/src/conformance/manifest.yaml` and assert:

1. Parse success (L1)
2. IR matches expected (L2)
3. Hover / completion work as expected (L4, new)

Report under `conformance/reports/*-lsp.md` for "LSP level conformance".

## 9. Editor setup

Configuration snippets for the reference `@umlay/lsp` (npm).

### 9.1 VS Code

Install the official extension from the Marketplace (search
`keydrop.umlay-vscode`). The LSP server is bundled — no separate install.

### 9.2 Neovim (nvim-lspconfig)

```lua
-- ~/.config/nvim/lua/plugins/umlay.lua
return {
  "neovim/nvim-lspconfig",
  config = function()
    local configs = require("lspconfig.configs")
    if not configs.umlay then
      configs.umlay = {
        default_config = {
          cmd = { "umlay-lsp", "--stdio" },           -- npm i -g @umlay/lsp
          filetypes = { "umlay" },
          root_dir = require("lspconfig.util").root_pattern("package.json", ".git"),
          settings = { umlay = { diagnostics = { mode = "draft" } } },
        },
      }
    end
    require("lspconfig").umlay.setup({})
    vim.filetype.add({
      extension = { umlay = "umlay" },
      pattern   = { ["%.umlay%.md$"] = "markdown" },  -- literate is markdown
    })
  end,
}
```

### 9.3 Zed

```jsonc
// ~/.config/zed/settings.json
{
  "lsp": {
    "umlay": { "binary": { "path": "umlay-lsp", "arguments": ["--stdio"] } }
  },
  "languages": { "Umlay": { "language_servers": ["umlay"], "format_on_save": "on" } },
  "file_types": { "Umlay": ["umlay"] }
}
```

### 9.4 IntelliJ / WebStorm (LSP4IJ)

Register `umlay-lsp --stdio` via the LSP4IJ plugin. Server config (JSON):

```json
{ "umlay": { "diagnostics": { "mode": "strict" } } }
```

## 10. See also

- [Grammar (BNF)](../../packages/spec/src/grammar.bnf)
- [IR Schema](../../packages/spec/src/ir.schema.json)
- [Conformance Manifest](../../packages/spec/src/conformance/manifest.yaml)
- [RFCs](../../packages/spec/src/rfcs/README.md)
- [Extending Guide](./extending.md)
- [Japanese version](../ja/lsp-integration.md)
