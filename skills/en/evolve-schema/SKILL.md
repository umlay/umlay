---
name: evolve-schema
version: 1.9.0
spec: "@umlay/spec >= 1.9.0 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, developer, architect]
summary: Evolve existing Umlay DSL / IR safely while preserving backward compatibility and reference integrity
description: Use when the user wants to modify an existing Umlay model / enum / protocol / view — add a field, rename, refactor — and needs the change to preserve backward compatibility and `@ref` integrity. Proposes a safe diff.
references:
  grammar: ../../../packages/spec/src/grammar.md
  schema: ../../../packages/spec/src/ir.schema.json
  keywords: ../../../packages/spec/src/index.ts
---

# evolve-schema

## Goal

Introduce meaningful changes to an existing `.umlay` / IR while minimizing impact on downstream IR consumers (renderers, code generators, stored review records).

## Preconditions

- Prefer staying within IR version `1.0`
- Only bump to `2.0` after confirming **no non-breaking path exists**

## Classifying changes

Every change falls into one of three classes.

| Class | Examples | IR version |
| --- | --- | --- |
| **A. Additive** | New model / attribute / view / enum value | Stay at 1.0 |
| **B. Relaxation** | `!` → `?`, remove unique, widen multiplicity | Stay at 1.0 (caution) |
| **C. Breaking** | Remove attribute, change type, remove reference, change PK, add `onDelete: CASCADE` | Bump to 2.0 |

Adding / strengthening `onDelete` is treated as **C** because it alters existing-data behavior.

## Procedure

### Step 1 — Decide the class

Use the following matrix to classify a proposed change.

| Change | Class |
| --- | --- |
| Add a new `model` | A |
| Add a new attribute with `?` | A |
| Add a new attribute with `!` and a `default` | A |
| Add a new attribute with `!` and no `default` | C |
| Change an attribute's `type` | C |
| Rename an attribute | C (rename: `_id` is stable, but display name changes) |
| Remove an attribute | C |
| Change `@ref` `onDelete` from `NO_ACTION` → `CASCADE` | C |
| Add `@ref` `inverse` | A |
| Add a new `view` | A |
| Add a model to an existing view's `include` | A |
| Add an `enum` value | A (check default impact) |
| Remove an `enum` value | C |
| Change a stereotype (`@entity` → `@aggregate_root`) | C |

### Step 2 — Check reference integrity

- Do `@ref` targets resolve after your changes?
- Are there `@ref`s pointing to attributes you removed?
- Do any view `include` / `exclude` patterns accidentally capture / drop models?

### Step 3 — Additive flow (A)

1. Add the new element following spec (see [write-uml](./write-uml.md))
2. Verify existing views' `include` / `exclude` still match intent
3. Add at least one use case in [`packages/examples/samples/`](../../packages/examples/samples/)
4. Update related docs / skills

### Step 4 — Relaxation flow (B)

1. Verify consumers that used the pre-change value still work
2. For `!` → `?`, ensure IR consumers handle null
3. Keep `@intent` describing the relaxation reason
4. Consider shipping both shapes in samples during the transition

### Step 5 — Breaking flow (C)

**Rule: spread the break across two releases, not one.**

```
[v1] old + new coexist → [v2] old deprecated → [v3] old removed
```

1. **Deprecation phase**
   - Mark the old element with `@deprecated("use X instead since 1.1")` (future construct)
   - Add the new element in parallel (same as Step 3)
   - Add a migration guide to docs

2. **Sunset phase**
   - Bump the major version (`IR_SCHEMA_VERSION` → `2.0`)
   - Publish a migration script (old IR → new IR)
   - Add a migration guide to `docs/ja/roadmap.md` and `docs/en/roadmap.md`

3. **RFC process**
   - File an RFC at `packages/spec/src/rfcs/NNNN-<slug>.md`
   - Follow the procedure in CONTRIBUTING.md

## Stable IDs and rename

IR `_id` is **content-hash based** and survives identifier (name) changes. Use this for safe renames:

```
1. Change attribute name (e.g. customerId → clientId)
2. IR diff reports same `_id`, different `name`
3. Consumers tracking `_id` are unaffected
4. Consumers keyed by `name` (SQL column, for instance) need migration
```

Note: `@codegenName` can stabilize code-generation output through renames.

## Keeping references consistent

```prisma
// ❌ NG: removing the target breaks every remaining @ref
model Customer {
  id UUID! @id
}
model Order {
  customerId UUID! @ref(Customer.id)
}

// → Before removing Customer, either redirect Order.customerId's @ref
//    to a new target, or remove it from Order as well
```

## Checklist

- [ ] Classified the change as A / B / C
- [ ] (C only) Two-phase migration plan
- [ ] (C only) RFC filed in `packages/spec/src/rfcs/`
- [ ] Verified `@ref` resolution for added / removed models
- [ ] View `include` / `exclude` patterns still match intent
- [ ] Samples updated to reflect the change
- [ ] Docs / skills updated
- [ ] IR version bump decision made (2.0 if breaking)

## spec 1.6 — leave a lifecycle marker on every change

When `evolve-schema` modifies a model / attribute, **stamp the change**:

```umlay
// new attribute
contactEmail string! @unique @@since("1.6.0")

// rename — flag the old name with a removal target
email string! @@deprecated(since: "1.6.0", until: "2.0.0", replaceWith: "contactEmail")

// model whose rules are now fully captured
model Order @aggregate_root {
  @@status("active", since: "2026-04-26")   // promote from in-review
  @@inv(field: total, op: ge, value: 0)
  @@example(input: { total: -1 }, expect: reject)
}
```

**Why**: `change-impact-diff` uses `@@since` / `@@deprecated` to bucket
risks more precisely (additive vs breaking). `@@status` is the
pre-merge checklist key — leaving "in-review" dangling is a common bug.

## Incremental refactors enabled by spec 1.3

- **De-duplicate audit columns**: `createdAt / updatedAt` scattered
  across 10+ models → introduce `trait Timestamped { … }` and
  `@@include(Timestamped)` everywhere. Class A (additive) — parse-time
  expansion keeps codegen / lint agnostic.
- **Introduce an abstract base**: `Shape / Circle / Square` → add
  `model Shape @entity @abstract` (or a `protocol Shape`) and connect
  concretes via `@@implements(Shape)`. Realization arrows visualise
  the hierarchy.
- **Rename to reclaim reserved words**: if you previously renamed
  `limit` / `from` / `type` attributes to avoid the lexer, you can
  restore the original name with `` +`limit` int! `` and keep the DB
  column as-is via `@codegenName("pageLimit")`.
- **Tame a sprawling view**: split one giant ER into several focused
  views and stitch them into a single canvas with `view overview
  @composite { @@include(...) }`.

## References

- Grammar: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- Roadmap: [`docs/en/roadmap.md`](../../docs/en/roadmap.md)
- Related skills: [`write-uml`](./write-uml.md), [`review-uml`](./review-uml.md), [`codegen-mapping`](./codegen-mapping.md)
