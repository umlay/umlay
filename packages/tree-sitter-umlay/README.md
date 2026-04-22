# tree-sitter-umlay

A [tree-sitter](https://tree-sitter.github.io/) grammar for the
[Umlay](https://umlay.keydrop.net) DSL.

Powers:

- **GitHub syntax highlighting** for `.umlay` files (via Linguist) once the
  file is associated with this grammar in upstream Linguist.
- **Neovim** (`nvim-treesitter`), **Helix**, **Zed** — any editor that loads
  tree-sitter grammars.
- **Code folding** / **textobjects** / **indentation** for structural
  navigation.

## Status

**0.1.0 — skeleton.** Declarations, model/view bodies, directives,
annotations, and the file-level Markdown trailer (`---`) are covered.
Incremental reparse is fully supported (tree-sitter's core feature).

Semantic checks (well-foundedness, MRO, lint rules) are **not** in scope —
they live in the reference implementation
[`@umlay/core`](../../packages/spec/). Treat this grammar as
**highlight + navigation only**.

## Build & test

The default workspace `pnpm -r build` is a **no-op** for this package —
`tree-sitter generate` + `node-gyp build` need the native `tree-sitter`
binary (fetched via a postinstall script that CI blocks by default).

Run the real generator explicitly when you're working on the grammar:

```sh
pnpm install                                   # add postinstall approval for tree-sitter-cli
pnpm -F tree-sitter-umlay run build:grammar    # tree-sitter generate + node-gyp build
pnpm -F tree-sitter-umlay run generate         # grammar.js → src/parser.c only
pnpm -F tree-sitter-umlay run test             # corpus/*.txt snapshot suite
```

## Corpus tests

`test/corpus/*.txt` contains `=== name === / source / --- / expected tree`
records in the standard tree-sitter format. Current coverage:

- `declarations.txt` — namespace, enum, model, view, protocol, union
- `directives.txt` — line + block comments, `@@doc`, `@@md` triple-quoted,
  file-level `---` Markdown trailer

Add a new record whenever you extend the grammar.

## Layout

- [`grammar.js`](./grammar.js) — the grammar itself.
- [`queries/highlights.scm`](./queries/highlights.scm) — capture → scope map.
- [`queries/injections.scm`](./queries/injections.scm) — `@@doc` / `@@md`
  Markdown injection so triple-quoted bodies render as Markdown.

## License

Apache-2.0 — same as the rest of the `umlay-oss` repo.
