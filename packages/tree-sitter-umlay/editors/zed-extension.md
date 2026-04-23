# Zed — extension manifest

Zed supports tree-sitter grammars via the public
[zed-extensions](https://github.com/zed-industries/extensions) registry.

## 1. Layout

```
umlay-zed/
├── extension.toml            # manifest
├── languages/
│   └── umlay/
│       ├── config.toml
│       ├── highlights.scm    # copied from packages/tree-sitter-umlay/queries/
│       └── injections.scm
└── README.md
```

## 2. `extension.toml`

```toml
id = "umlay"
name = "Umlay"
description = "UML / ER modeling DSL — syntax highlighting + tree-sitter"
version = "0.1.0"
schema_version = 1
authors = ["Keydrop <takegami@ichiseki.co.jp>"]
repository = "https://github.com/umlay/tree-sitter-umlay"

[grammars.umlay]
repository = "https://github.com/umlay/tree-sitter-umlay"
commit = "<pin to the first stable tag>"

[languages.umlay]
grammar = "umlay"
```

## 3. `languages/umlay/config.toml`

```toml
name = "Umlay"
grammar = "umlay"
path_suffixes = ["umlay"]
line_comments = ["// "]
autoclose_before = ";:.,=}])>"
brackets = [
  { start = "{", end = "}", close = true, newline = true },
  { start = "(", end = ")", close = true, newline = false },
  { start = "[", end = "]", close = true, newline = false },
  { start = "\"", end = "\"", close = true, newline = false },
]
```

## 4. Submission PR

1. Fork `zed-industries/extensions`
2. Place `extensions/umlay/` under the fork
3. Add an entry to `extensions.toml`:
   ```toml
   [umlay]
   submodule = "extensions/umlay"
   version = "0.1.0"
   ```
4. Add the submodule: `git submodule add https://github.com/umlay/zed-extension extensions/umlay`
5. `pnpm -C ~/.zed/... install-dev-extension extensions/umlay` to local-test
6. Open PR

Zed turnaround is typically fast (~1 week for uncontroversial
highlight-only extensions).

## 5. Helix — `languages.toml`

Helix is simplest of the three because the registry is in the core repo.
Submit a PR to `helix-editor/helix` adding to `languages.toml`:

```toml
[[language]]
name = "umlay"
scope = "source.umlay"
file-types = ["umlay"]
comment-token = "//"
indent = { tab-width = 2, unit = "  " }

[[grammar]]
name = "umlay"
source = { git = "https://github.com/umlay/tree-sitter-umlay", rev = "<pinned-rev>" }
```

Copy queries to `runtime/queries/umlay/{highlights,injections}.scm`.
