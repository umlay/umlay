# Contributing to Umlay

Thanks for your interest. This repository publishes the **Umlay DSL specification, samples, and developer-facing skill definitions**. Implementations (parser, lint, renderer, web editor) live in separate repositories and are not covered by this guide.

## Repository layout

- `packages/spec` — DSL grammar + IR JSON Schema (the contract)
- `packages/examples` — `.umlay` sample files
- `skills/` — developer / AI agent oriented skill definitions

## Quickstart

```bash
pnpm install
pnpm -r typecheck
pnpm lint
pnpm -r build
```

Node version is pinned via `.node-version` (Volta / fnm / nvm compatible).

## Development workflow

1. Fork and clone the repo.
2. Create a feature branch: `git checkout -b feat/my-change`.
3. Make changes. Keep diffs focused.
4. Run: `pnpm -r typecheck && pnpm lint`.
5. Update docs / samples when spec changes:
   - `packages/spec/src/grammar.md` for grammar
   - `packages/spec/src/ir.schema.json` for IR shape
   - Affected samples in `packages/examples/samples/`
6. Commit with a clear message (see *Commit messages* below).
7. Open a PR against `main` using the PR template.

## Commit messages

We follow a lightweight Conventional-Commits style:

- `feat(spec): add new view kind`
- `fix(examples): correct cascade sample`
- `docs(skills): clarify review skill usage`
- `chore(ci): bump pnpm`

Scopes are preferred (`spec`, `examples`, `skills`, `ci`, `docs`). Breaking changes append `!`:

- `feat(spec)!: remove legacy keyword`

## DSL / IR changes

Changes that touch the DSL grammar or the normalized IR **are contract changes** and need extra care:

1. Open an issue using the "Feature request" template and describe the shape.
2. For significant changes (new top-level keyword, new IR field that downstream tooling would depend on), draft an RFC under `packages/spec/src/rfcs/NNNN-title.md` and link it from the issue.
3. Update the grammar entry in `packages/spec/src/grammar.md` and the schema in `packages/spec/src/ir.schema.json`.
4. Bump schema version if backward-incompatible.
5. Add or update a sample in `packages/examples/samples/` demonstrating the change.

## Skills

`skills/` contains `.md` files that guide developers and AI agents working with Umlay DSL. Keep each skill focused on a single task, with concrete DSL examples. When behavior depends on spec, link to the relevant grammar / schema section.

## Releases

Spec and examples follow semver. Publishing is not yet automated.

## Code of Conduct

This project adopts the Contributor Covenant v2.1. See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## Licensing

By contributing to `packages/spec`, you agree that your contribution is licensed under Apache License 2.0. `packages/examples` contributions are under MIT. No CLA is required, but your commit is taken as a DCO-style sign-off.
