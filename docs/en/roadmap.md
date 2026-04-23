# Roadmap — scope and what's next

This repository (`umlay-oss`) publishes the **Umlay DSL spec, samples, developer / AI skill definitions, and documentation**. Implementations are built in separate repositories and are out of scope here.

## What's public today

| Package / directory | Contents | Version |
| --- | --- | --- |
| `@umlay/spec` | DSL grammar + normalized IR JSON Schema + formal BNF + conformance (manifest + expected-ir + id-hash-vectors) + **32 accepted RFCs** (through 0032 view-selectors) | 1.2.0 |
| `@umlay/examples` | 38 `.umlay` samples (live demos of every accepted RFC; google-oauth-login exercises view selectors across 5 views) | 1.2.0 |
| `skills/` | Skill definitions for developers / AI (scaffold) | — |
| `docs/` | User-facing documentation (this guide set) | — |

## DSL — **fully interpreted and renderable** (today)

- `namespace <identifier>`
- `type <Name> @value_object { ... }`
- `enum <Name> { V1, V2 }`
- `model <Name> [@entity|@aggregate_root|@value_object] { ... }`
- `view <id> @er_diagram | @class_diagram | @sequence_diagram | @component_diagram | @package_diagram | @state_machine | @activity_diagram | @deployment_diagram | @wbs_diagram | @gantt_chart { ... }`
- Annotations: `@id`, `@@id(a,b)`, `@ref`, `@unique`, `@index`, `@default`, `@codegenName`
- Blocks: `@@doc("""...""")`, `@@attachments(...)`, `@@theme("...")`, `@@mode(draft|strict)`, `@@dependencies(...)`, `@@sample(...)` (inline / external file), `@@implements(...)`, `@@override(from: ...)` (RFC 0011)
- Extended declarations: `protocol<out T: Foo & Bar> extends A, B { ... }` (C3 MRO + variance + bounds, RFC 0015/0019), `union X = A | B { payload: T! } | Recursive { child: X! }`, `module X { ... }`, `import <ns>` / `import "path" as alias` / `import "./glob/**/*.umlay"` (RFC 0014)
- `impl` blocks: `impl<T> P for M where (T: Q) { }` (regular + blanket, RFC 0016/0020)
- Sequence fragments: `alt`/`else`/default, `opt`, `par`/`and`/`await all|any|(labels)|all timeout(...)`, `loop`, `critical "X" on (a,b) timeout(5s) { } catch { } finally { }` (RFC 0017/0021)
- Nullability: `!` / `?` / `??`

## DSL — **reserved only** (future implementation)

The following are accepted at parse time but not yet semantically processed / rendered:

`function`, `queue`, `component`, `worker`, `kv`, `actor`, `event`, and more (the full list lives under `@umlay/spec` as `RESERVED_KEYWORDS`).

## How the spec evolves

### Backward-compatible changes

- Adding annotations
- Adding view kinds
- Adding optional IR fields

These happen within `version: "1.0"`.

### Breaking changes

- Changing semantics of existing keywords
- Removing / renaming required IR fields
- Changing reference-resolution rules

These bump to `version: "2.0"` with a migration guide under `docs/`. All breaking changes go through the RFC process described in [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Planned items (in priority order)

| # | Item | Where |
| --- | --- | --- |
| 1 | Skills catalog buildout (write / review / evolve / codegen) | This repo |
| 2 | Rendering support for reserved keywords (function / queue / component) | Implementation + spec coordination |
| 3 | Tightening JSON Schema (required constraints, patterns, etc.) | This repo |
| 4 | RFC process wiring (`packages/spec/src/rfcs/`) | This repo |
| 5 | Conformance test suite for implementers | This repo |
| 6 | English `grammar.md` | This repo |

## Versioning

- `@umlay/spec` follows semver
- `@umlay/examples` tracks spec major versions
- Each file under `skills/` carries its own version tag (front matter)

## Out of scope for this repository

- Umlay parser / lint engine / SVG renderer implementations
- Web editor UI / server-side infrastructure
- Commercial features / billing / authentication
- Internal roadmap / business decisions

## See also

- [Overview](./overview.md)
- [Design Principles](./design-principles.md)
- [FAQ](./faq.md)
