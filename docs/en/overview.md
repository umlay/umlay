# What is Umlay

> **UML, relaid.** — a modeling foundation that relays legacy UML onto the Node / cloud / AI era.

## The problem

Existing UML / ER modeling tools and conventions suffer from a few recurring constraints in modern software development:

| Area | Existing pain |
| --- | --- |
| Syntax | Relation names + multiplicity are hard to read together; identifiers with spaces or non-Latin scripts break easily |
| Expressiveness | ER diagrams cannot express **port arrows** (column-level references); sequence / component support is thin |
| Model separation | "One diagram = one definition" causes the same class to be redefined across diagrams |
| AI integration | Surface-level DSLs carry only rendering hints — no **semantics** (intent, contracts, invariants) for code generation |
| Validation | Missing "visibility / multiplicity / type" or vague naming cannot be caught statically |
| Review | Diagrams live separately from code, so they rarely ride the Git / PR review culture |

Umlay reframes this by holding **a single source of truth** and deriving multiple diagrams, code artifacts, and IR from it.

## The Umlay approach

```
┌──────────────────────────────────────────────────┐
│ Authoring DSL (.uml)     Prisma-flavored, human  │
├──────────────────────────────────────────────────┤
│ Normalized IR (.uml.json) internal, for review    │
├──────────────────────────────────────────────────┤
│ Interop       (.uml.yaml) for AI / external tools │
└──────────────────────────────────────────────────┘
```

- **Single source of truth** — humans write `.uml` (Prisma-flavored DSL); tools operate on the normalized IR (JSON) internally
- **Multiple views** — ER, class, sequence, component, WBS, and Gantt are derived from one model
- **Semantics baked in** — types, multiplicity, invariants, and `@intent` live in the DSL so AI can generate faithful code
- **Git / PR native** — text-first, diff-friendly; review comments attach at the attribute level

## Scope of this repository

This repository (`umlay-oss`) publishes:

| Component | Contents |
| --- | --- |
| [`packages/spec`](../../packages/spec/) | DSL grammar + normalized IR JSON Schema |
| [`packages/examples`](../../packages/examples/) | `.uml` sample collection |
| [`skills/`](../../skills/) | Skill definitions for developers and AI agents |
| [`docs/`](../../docs/) | These documents |

**Implementations (parser, lint, SVG renderer, web editor) are developed in separate repositories** and are out of scope here. This repository exists to publish the specification and contract that any implementation can conform to.

## How Umlay relates to other tools

| Tool | Strength | How Umlay differs |
| --- | --- | --- |
| **Mermaid** | Adoption / web ergonomics | Umlay carries semantics (contracts, intent) and targets AI / lint integration |
| **PlantUML** | Broad UML coverage | Umlay focuses on Node / cloud, keeps the grammar compact, and has no JVM dependency |
| **DBML** | DB-focused, easy to write | Umlay covers ER plus class / sequence / WBS / Gantt from one model |
| **Structurizr DSL** | Model-then-views idea | Umlay is not C4-only; it covers UML + ER + schedule diagrams |
| **D2** | Layout aesthetics | Umlay invests in UML semantics, lint, and AI review instead |

## Further reading

- [getting-started.md](./getting-started.md) — write your first `.uml`
- [dsl-guide.md](./dsl-guide.md) — DSL reference
- [design-principles.md](./design-principles.md) — the 6 North Star principles
