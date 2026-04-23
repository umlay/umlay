# Neovim — nvim-treesitter registration

## 1. Local use (before upstreaming)

```lua
-- In your init.lua
local parser_config = require('nvim-treesitter.parsers').get_parser_configs()
parser_config.umlay = {
  install_info = {
    url = 'https://github.com/umlay/umlay',     -- or a dedicated umlay/tree-sitter-umlay mirror
    branch = 'main',
    files = { 'src/parser.c' },
    location = 'packages/tree-sitter-umlay',   -- drop this if using a dedicated mirror
  },
  filetype = 'umlay',
}

vim.filetype.add({
  extension = { umlay = 'umlay' },
})

-- Install the grammar once:
-- :TSInstall umlay
```

## 2. Upstreaming — nvim-treesitter/nvim-treesitter

Submit a PR adding to `lua/nvim-treesitter/parsers.lua`:

```lua
list.umlay = {
  install_info = {
    url = 'https://github.com/umlay/tree-sitter-umlay',   -- dedicated mirror
    branch = 'main',
    files = { 'src/parser.c' },
  },
  maintainers = { '@keydrop' },
  filetype = 'umlay',
}
```

Add `queries/umlay/{highlights,injections}.scm` by copying from
`packages/tree-sitter-umlay/queries/`.

## 3. Requirements before PR

- [ ] Dedicated `tree-sitter-umlay` repo (subtree split of the subdir)
- [ ] Tagged release `v0.1.0` so parsers.lua can pin a revision
- [ ] `tree-sitter test` passes
- [ ] highlights.scm + injections.scm validated via
      `:TSPlaygroundToggle` on a few real `.umlay` samples

nvim-treesitter moves fast; expect the PR to be reviewed within 1–2 weeks.
