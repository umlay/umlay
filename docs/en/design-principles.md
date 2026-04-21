# Design Principles — the 6 North Star rules

Every Umlay design decision is made against these 6 principles, in this order. When they conflict, the lower-numbered rule wins.

> "Inherit the UML concepts, but do not lean on legacy (Java-centric DDD) languages." Functions, immutability, async, and distribution are first-class citizens.

## 1. AI generation produces the right thing

**Meaning**: When a model is handed to an AI, the generated code / DDL / configuration matches the intent.

**Success metric**: ≥ 90% pass rate on golden tests.

**Consequences**: The DSL / IR carries enough information (types, invariants, intent) to drive the shape of generated code. Surface-level rendering hints are avoided when they would pollute the model.

## 2. Node / cloud primitives are first-class

**Meaning**: Functional components, Lambda, queues, workers, and KV stores are first-class citizens. No legacy class-inheritance DDD assumptions.

**Success metric**: End-to-end generation works for representative stacks (e.g. Next.js + Prisma + AWS).

**Consequences**: Reserved words include `function`, `queue`, `component`, `worker`, `kv`, etc. `@service` can represent a function group as well.

## 3. Review loops actually close

**Meaning**: Findings are easy to spot → easy to fix → easy to reflect back into the model.

**Success metric**: Median time from comment to merge is under 10 minutes.

**Consequences**: The DSL is text-first and Git-friendly. Review annotations (`@review`, `@fix`) bind at the attribute level. Stable IDs give rename resilience.

## 4. AI flags design risks proactively

**Meaning**: "Should this be multithreaded?" "Is this ref going to cause re-render churn?" — raised **before** the developer asks.

**Success metric**: Hit rate against a curated risk catalog.

**Consequences**: Not only lint and scoring, but also antipattern heuristics plus AI review. The IR exposes attachment points for `data-risk` markers.

## 5. Output diagrams are CSS-extensible

**Meaning**: Colors, sizes, fonts, and layout can be carried and shared as user-owned assets.

**Success metric**: Applying a theme is a single-file action.

**Consequences**: SVG output is structured with CSS variables (`--uml-*`) and semantic classes (`uml-*`). Themes ship as external CSS files.

## 6. Images can be attached as supplementary material

**Meaning**: Wireframes, whiteboard photos, and screenshots can travel with the model as **supplementary documentation** without polluting the structural data.

**Success metric**: Changing an attached image does not change the model IR.

**Consequences**: `@@attachments(...)` is a separate namespace and never lands in the SVG body.

---

## Leaving legacy UML behind (a statement)

The following are **not assumed** by Umlay — we explicitly distance ourselves from tools that require them:

- Inheritance-heavy structure (don't force is-a relationships)
- Getters / setters as a baseline (property access is a surface concern)
- Synchronous-only interaction (async / message passing are first-class)
- Single-process assumption (distributed / event-driven is supported)

## Non-goals

| Goal | Why we avoid it |
| --- | --- |
| Mouse-drag visual editing | We don't chase Lucidchart / draw.io |
| Full BPMN / SysML support | Early scope is UML + ER + schedule diagrams |
| OS-level diagrams (deployment) | Deferred to later phases |

## See also

- [Overview](./overview.md)
- [Roadmap](./roadmap.md)
