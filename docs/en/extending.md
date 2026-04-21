# Extending — A Practical Guide to Umlay DSL Extension

A hands-on guide for **extending Umlay DSL within your own project**: authoring custom protocols / unions / modules / impls, and knowing where the spec-versus-project boundary lies.

## Target audience

- Authoring a domain model on top of Umlay DSL
- Defining shared protocol contracts (Repository / Auditable / ...)
- Working across multiple files and namespaces
- Deciding whether to file an RFC for a missing feature

## 1. Three layers of extension

| Layer | Example | Spec change |
| --- | --- | --- |
| **L0 Model addition** | New `model` / `enum` / `type` | None |
| **L1 Structural extension** | New `protocol` / `union` / `module` + compose via `impl` / `@@implements` | None |
| **L2 Language extension** | New annotation / view kind / block directive | **RFC required** |

L0 / L1 are free within your project; L2 goes through the RFC process.

## 2. L0: Add a new model

```prisma
@@mode(strict)
namespace myapp

model Subscription @aggregate_root @intent("Monthly subscription") {
  +id        UUID!       @id
  +userId    UUID!       @ref(User.id, onDelete: RESTRICT)
  +plan      string!
  +startedAt Timestamp!  @auto
  +endsAt    Timestamp?
}
```

Follow Steps 1–10 of `skills/en/write-uml.md`. No new features needed.

## 3. L1a: Compose a new protocol from existing contracts

Multiple-inheritance protocols (RFC 0010):

```prisma
namespace myapp

protocol SoftDeletable @intent("Supports logical deletion") {
  fn markDeleted() -> void
  fn isDeleted()   -> bool!
}

// Compose existing + custom protocols
protocol AuditableSoftDelete extends Auditable, SoftDeletable, Timestamped
  @intent("Audit + soft-delete + timestamp combined")
```

## 4. L1b: Apply a contract to an external model via `impl`

Attach `SoftDeletable` to `core.User` later (RFC 0016 impl):

```prisma
namespace myapp

import core

// Orphan rule: SoftDeletable is owned by myapp, so this is allowed
impl SoftDeletable for core.User {
  fn markDeleted() -> void { /* ... */ }
  fn isDeleted()   -> bool! { /* ... */ }
}
```

## 5. L1c: Automatic derivation with blanket `impl` (RFC 0020)

```prisma
namespace myapp

// For every type that is both Timestamped and SoftDeletable,
// automatically provide Archivable.
impl<T> Archivable for T where (T: Timestamped & SoftDeletable) {
  fn archive() -> void { /* ... */ }
}
```

## 6. L1d: Express expressions / state machines with `union` (+ recursive)

```prisma
namespace myapp.ast

// RFC 0010 inline variant + RFC 0012 recursive
union Expr =
  | NumLit { value: int! }
  | Ref    { name: string! }
  | Call   { fn: Expr!, args: string! }
  | Let    { name: string!, binding: Expr!, body: Expr! }
  @intent("Domain-specific language AST")
```

## 7. L1e: Separate subdomains with `module`

```prisma
namespace myapp

module billing {
  model Invoice @aggregate_root { /* ... */ }
  model Payment @aggregate_root { /* ... */ }
}

module notifications {
  model EmailTemplate @entity { /* ... */ }
}
```

References use `myapp.billing.Invoice` / `myapp.notifications.EmailTemplate`.

## 8. L1f: Strengthen generics with type constraints (RFC 0015 / 0019)

```prisma
namespace myapp

// RFC 0015: bounded + RFC 0019: variance
protocol EventBus<in E: Hashable> @intent("Publish hashable events") {
  fn publish(event: E!) -> void
}

protocol TypedRepository<T: Identifiable & SoftDeletable, out K>
  @intent("Repository for identifiable, soft-deletable types") {
  fn findByKey(key: K!) -> T?
}
```

## 9. L1g: Extending Gantt / WBS (RFC 0004 / 0005 / 0014)

Build on `project-schedule.umlay` / `with-glob-imports/`:

```prisma
namespace myapp.planning

import "./tasks/*.umlay"    // glob-aggregate sprint files

view global-roadmap @gantt_chart {
  include: sprint_q1.Task, sprint_q2.Task, sprint_q3.Task, sprint_q4.Task
  layout: direction(LR), engine(elk)
}
```

## 10. L2: Extending the spec itself (filing an RFC)

If your needs don't fit inside the project, an RFC is required for:

- New view kinds (beyond the 10, e.g. `@sankey_diagram`)
- New block directives (`@@policy(...)`, ...)
- New annotations (`@memo(...)`, ...)
- Semantic changes to existing annotations

### RFC filing procedure

1. Copy `packages/spec/src/rfcs/_template.md` as `NNNN-<slug>.md`
2. Pick a number per [`rfcs/README.md`](../../packages/spec/src/rfcs/README.md)
3. Write proposal / alternatives / compatibility / sample sketches
4. Open a PR → comment window (≥ 7 days)
5. On accepted status, update the spec core (`grammar.md` / `grammar.bnf` / `ir.schema.json` / `index.ts`)

## 11. Pre-extension checklist

- [ ] Is your extension at L0 / L1 / L2?
- [ ] For L1: can the need be met with existing accepted RFCs (0001–0022)?
- [ ] Did you set `@intent`, visibility, and nullability appropriately?
- [ ] Does it satisfy S01–S12 / L001–L013 / R01–R10 in `skills/en/review-uml.md`?
- [ ] Did you classify the change (A / B / C) per `skills/en/evolve-schema.md`?
- [ ] If L2 is required, did you file an RFC?

## 12. Common patterns → which RFC

| Need | RFC |
| --- | --- |
| Declare task instance data | RFC 0004 (`@@sample`) |
| Split across multiple files | RFC 0009 (`import`) + RFC 0014 (glob) |
| Compose common contracts onto concrete types | RFC 0010 (extends) + RFC 0016 (impl) |
| Auto-derive features for all constrained types | RFC 0020 (blanket impl) |
| Express expressions / AST / recursive structures | RFC 0012 (recursive union) |
| Model concurrency / critical regions / timeouts | RFC 0007 + 0013 + 0017 + 0021 |
| Strengthen generics | RFC 0015 (bounds) + 0019 (variance) |

## 13. Implementor-side extension (reference implementation)

The spec lives in this `umlay-oss` repo, but **implementations** are built separately. Typical implementor tasks:

### 13.1 Add a new lint rule

1. Reserve the smallest unused number under the appropriate prefix (S/L/R/W/C) in `packages/spec/src/lint-rules.md`
2. Add a row to the relevant table + RFC number (if any)
3. Implement `Rule` in the implementation repo (`packages/lint/src/rules/index.ts`):
   ```ts
   const L018: Rule = {
     code: 'L018',
     description: '...',
     fires: ['strict'],
     severityByMode: { strict: 'error' },
     check(ir) { /* return diags */ },
   };
   ```
4. Add to `rules` export + write a test
5. Flip the catalog row status from `⏳` to `✅`

### 13.2 Add a new view kind

1. File an RFC (additive, Class A)
2. Add to `ViewKindEnum` in `packages/spec/src/ir.ts`
3. Regenerate schema: `pnpm --filter @umlay/core gen:ir-schema`
4. Add mapping to `viewKindMap` in the visitor
5. Create a renderer (`packages/renderer-er/src/<kind>-renderer.ts`) — template: `activity-renderer.ts` / `state-machine-renderer.ts`
6. Re-export from `packages/renderer-er/src/index.ts`
7. Add to `SUPPORTED_KINDS` + dispatch chain in `apps/web/lib/worker-client.ts`
8. Add short label to `VIEW_KIND_LABELS` in the editor
9. Add a sample + expected-ir fixture
10. Update `packages/spec/src/conformance/expected-ir/README.md`

### 13.3 Run conformance

```ts
import { runConformance, formatReport } from '@umlay/spec/conformance/cli';
import { parse } from 'my-parser';

const report = await runConformance({ parse });
console.log(formatReport(report));
process.exit(report.l1Pass === report.total ? 0 : 1);
```

## 14. See also

- [DSL Guide](./dsl-guide.md)
- [IR Guide](./ir-guide.md)
- [Design Principles](./design-principles.md)
- [Roadmap](./roadmap.md)
- [Lint rule catalog](../../packages/spec/src/lint-rules.md)
- [Skills](../../skills/)
- [RFCs](../../packages/spec/src/rfcs/README.md)
- [Conformance helper](../../packages/spec/src/conformance/match.ts)
- [Japanese version](../ja/extending.md)
