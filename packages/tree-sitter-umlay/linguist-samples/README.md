# Linguist submission package — Umlay

This directory gathers everything github-linguist/linguist needs in a
single place so the submission PR is straightforward.

## 1. Changes to `linguist/lib/linguist/languages.yml`

Add the following entry under the `U` alphabetical section:

```yaml
Umlay:
  type: data
  color: "#3B82F6"
  extensions:
  - ".umlay"
  tm_scope: source.umlay
  ace_mode: text
  language_id: 893812046     # Pick any unused 9-digit id; linguist docs say >100000000
```

## 2. Tree-sitter grammar source

Linguist pulls tree-sitter grammars as git submodules under
`vendor/grammars/`. Submission needs:

- Upstream repo: `https://github.com/umlay/umlay` (this repo)
- Subdir within repo: `packages/tree-sitter-umlay`
- Linguist's `grammars.yml` entry:

  ```yaml
  vendor/grammars/tree-sitter-umlay:
  - source.umlay
  ```

Linguist requires the grammar to be a **top-level git repo**. Option A
is to mirror `packages/tree-sitter-umlay` into a dedicated
`tree-sitter-umlay` repo (subtree split or git-filter-repo). Option B is
to ask the linguist team to vendor from a subdir — they don't currently
support this, so plan on A.

## 3. Samples

Linguist requires at least a few `.umlay` samples to verify probability
weighting. Copy these from `packages/examples/samples/`:

- `hello-order.umlay`
- `blog.umlay`
- `google-oauth-login.umlay`

Place them as `samples.linguist/Umlay/*.umlay` in the linguist repo.

## 4. Heuristics (optional)

No disambiguation needed — `.umlay` is unique to us. If a future
collision appears, add to `linguist/lib/linguist/heuristics.yml`:

```yaml
- extensions: ['.umlay']
  rules:
  - language: Umlay
    pattern: '^namespace '  # our sources always start with `namespace X`
```

## 5. PR checklist

Linguist's CONTRIBUTING.md demands:

- [ ] 200+ unique non-forked repos on GitHub using the extension
- [ ] Or, 200 files from single upstream project
- [ ] tree-sitter grammar that passes `tree-sitter test`
- [ ] `samples/Umlay/` with varied examples
- [ ] `languages.yml` entry follows alphabetical order
- [ ] `grammars.yml` entry added (if grammar is new)
- [ ] Changes to `vendor/README.md` (if grammar is new)

## 6. Commands to run before submitting

```sh
# In linguist checkout:
script/bootstrap
script/update-tags
bin/git-linguist --commit HEAD breakdown  # must list Umlay
bundle exec rake samples                   # re-classify samples
bundle exec rake test                      # green
```

## 7. Blocker — "200 unique repos" criterion

Linguist requires ~200+ GitHub repos using an extension before adding
it. Strategies to reach this:

- Publish `@umlay/*` to npm (P0-1) so new adopters emerge
- Announce on https://github.com/topics/modeling and
  https://github.com/topics/uml
- Ask a few consenting teams to commit `.umlay` files

Track progress via:

```
gh search repos 'language:Umlay' --limit 200
# or
gh search code 'extension:umlay'
```

Submit when the count clears ~150 and there's continuous growth.
