# FAQ

## About the product

### How is Umlay different from Mermaid / PlantUML?

Umlay aims to be a "modeling foundation where one source of truth derives diagrams and code," not just a "DSL for drawing diagrams."

- **Semantics baked in** — types, multiplicity, invariants, and `@intent` live in the DSL
- **AI / lint integration from day one** — missing visibility / multiplicity / types are caught statically, paired with AI review
- **Port arrows** — ER diagrams can express FK / PK at the column level (Mermaid cannot)

See [overview.md](./overview.md#how-umlay-relates-to-other-tools) for the full comparison.

### Where does the implementation (parser / renderer) live?

**Not in this repository.** This repository publishes the **specification and contract** (JSON Schema). Implementations are developed in separate repositories.

Any implementation that conforms to `@umlay/spec` can be built independently — OSS or commercial.

### When will the web editor be public?

The web editor is out of scope for this repository. Its availability will be announced separately.

## Licensing and use

### Can I use Umlay commercially?

- `@umlay/spec` — Apache License 2.0 (commercial OK; attribution required)
- `@umlay/examples` — MIT (commercial OK)
- `skills/` — CC-BY 4.0 by default (commercial OK with attribution)

See [`LICENSE`](../../LICENSE) and [`NOTICE`](../../NOTICE) for details.

### Can I add my own keywords to the DSL?

Using keywords outside the current spec triggers a `parse error` in any `@umlay/spec`-conformant tool. If you want to propose an extension, follow the RFC process in [CONTRIBUTING.md](../../CONTRIBUTING.md).

Some keywords are **reserved for future implementation** and will parse today (e.g. `function`, `queue`, `component`). See [roadmap.md](./roadmap.md).

### Can I use non-Latin identifiers?

Yes. If code generation needs an English-safe name, add `@codegenName("Foo")`.

```prisma
model 注文 @aggregate_root @codegenName("Order") {
  id UUID! @id
}
```

## Technical

### Can I write the IR directly?

Technically yes (it's JSON), but we recommend authoring in the `.umlay` DSL. The IR is for tool interop, not humans.

### How is the quality of generated code ensured?

Deterministic parts (types / DDL / OpenAPI) are produced by template conversion for reproducibility. LLM-driven parts (method bodies, sample data) take the IR + `@intent` + contracts as prompt context, and outputs are re-validated by lint and type checks before being accepted.

See [design-principles.md](./design-principles.md).

### What does Strict mode enforce?

`@@mode(strict)` turns the following into errors:

- Every attribute must declare `visibility` (L001)
- Every relation must declare `multiplicity` (L002)
- Unresolved `@ref` references (L003)
- Duplicate IDs (L004)
- Cyclic `inheritance` (L007)

See [dsl-guide.md §9](./dsl-guide.md) for details.

## Contributing

### How do I contribute?

- **Propose a spec change** — open an issue, then add an RFC under `packages/spec/src/rfcs/`
- **Add a sample** — drop a `.umlay` into `packages/examples/samples/` and extend the README table
- **Add a skill** — add a `.md` under `skills/` with front matter and examples
- **Improve documentation** — update both `docs/ja/` and `docs/en/` in the same PR when possible

See [CONTRIBUTING.md](../../CONTRIBUTING.md).

### Do I need to sign a CLA?

No CLA. Commits are treated as DCO-style sign-offs.

### I found a vulnerability

Please report privately via GitHub Security Advisories (or `.github/SECURITY.md` if present). Don't open public issues for vulnerabilities.

## Other

### Where does the name "Umlay" come from?

**UML** + **lay** (to place / to re-pose). Tagline: "UML, relaid."

### Trademarks / logos?

Managed by Keydrop. Please reach out before using the name or logo in a fork or derivative tool.

### Community channels

- Discussions: GitHub Discussions
- Issues: GitHub Issues
- Vulnerabilities: GitHub Security Advisories
