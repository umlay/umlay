---
name: review-uml
version: 1.3.0
spec: "@umlay/spec >= 1.3.0 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, reviewer]
summary: Mechanically review Umlay DSL / IR for spec conformance and design quality
description: Use when the user asks to review, audit, or analyse an existing Umlay DSL / IR for spec conformance, lint violations, and design risks. Produces structured `@review` / `@fix` annotations.
references:
  grammar: ../../../packages/spec/src/grammar.md
  schema: ../../../packages/spec/src/ir.schema.json
  keywords: ../../../packages/spec/src/index.ts
---

# review-uml

## Goal

Given a `.umlay` file (or IR JSON), detect issues across three layers:

1. **Spec violations** — rejected by parser or IR schema
2. **Lint violations** — syntactically fine but missing / vague
3. **Design risks** — structural antipatterns

## Inputs / Outputs

| Item | Content |
| --- | --- |
| Input | `.umlay` text or IR JSON (version 1.0) |
| Output | List of findings (severity / location / rule ID / suggested fix) |

## Rule Catalog (single source of truth)

All rules used for review are normatively defined in [`packages/spec/src/lint-rules.md`](../../packages/spec/src/lint-rules.md). This skill does **not** restate the full tables; it only references the category prefixes and rule IDs.

| Prefix | Purpose | Severity | Range |
| --- | --- | --- | --- |
| **S** | Spec violation (grammar violation, blocker) | error (blocker) | S01–S99 |
| **L** | Lint (mode-dependent conventions) | mode-dependent | L001–L199 |
| **R** | Risk (design antipattern, heuristic) | warn / info | R01–R99 |
| **W** | Warning (deprecated / experimental use) | info | W001–W099 |
| **C** | Compatibility (spec version mismatch) | warn | C001–C099 |

### Layer 1: Spec violations (blocker) — see `lint-rules.md` S section

- Rejected as errors by the parser or IR schema validation (S01–S17 at 0.8.0)
- All modes: **error** (mandatory)
- Any single hit → report as blocker and do NOT proceed to later layers

### Layer 2: Lint violations — see `lint-rules.md` L section

- L001–L016 (as of spec 0.8.0); Draft / Strict severities defined in the catalog
- `@@mode(strict)` will promote all rules to error at spec 1.0 (see migration-guide-1.0.md)

### Layer 3: Design risks — see `lint-rules.md` R section

- R01–R12 structural heuristics
- Attach a suggested fix (split / rename / boundary redesign) to each finding

### Layer 4: Deprecated / Compatibility — see `lint-rules.md` W / C sections

- W001 / W002: usage of `@deprecated` / `@experimental` elements
- C001 / C002: spec version deltas, `min-spec-version` mismatch

## Procedure

### Step 1 — Spec conformance

1. Parse the `.umlay` (or inspect the syntax)
2. Validate the IR JSON against the schema (Draft 2020-12)
3. Walk through `lint-rules.md` S section (S01–S17)
4. **If even one violation exists, return them as blockers without proceeding to later layers**

### Step 2 — Lint detection

1. Read `@@mode` at the file top (default `draft` if missing)
2. Evaluate `lint-rules.md` L section (L001–L016) at the severity appropriate for the mode
3. Record violation locations per attribute / relation / view / model

### Step 3 — Risk heuristics

1. Compute `lint-rules.md` R section (R01–R12): structural statistics / antipattern matching
2. Attach a **suggested fix** to each (split / rename / boundary redesign, etc.)

### Step 3.5 — Deprecated / Compatibility notices

1. Collect W001 / W002 hits (usage of `@deprecated` / `@experimental`)
2. Emit C001 / C002 if spec version deltas or `min-spec-version` mismatches are detected

### Step 4 — Report shape

```yaml
findings:
  - layer: spec
    rule: S03
    severity: error
    location: "ordering.Invoice"
    message: "Unknown stereotype '@master'. Allowed: entity / aggregate_root / value_object / service / interface"
    fix: "Replace '@master' with '@aggregate_root'"
  - layer: lint
    rule: L001
    severity: warn
    location: "ordering.Order.total"
    message: "Attribute lacks explicit visibility"
    fix: "Prefix with '-' (private) or '+' (public)"
  - layer: risk
    rule: R04
    severity: info
    location: "ordering.Order"
    message: "aggregate_root without @inv / @pre / @post"
    fix: "Add invariants describing domain rules"
```

## Example input

```prisma
namespace ordering

model Order @master {                        // ← S03: unknown stereotype
  id         UUID! @id
  customerId UUID! @ref(Customer.id)         // ← L003: Customer undefined
  totaL      Money                           // ← L001: visibility/nullability missing
}

view shop @er_diagram {
  include: ordering.*
  model ExtraFoo { id UUID! }                // ← S02: model body inside a view
}
```

Findings:

1. `S03` `Order @master` — unknown stereotype; use `@aggregate_root`
2. `S02` Views cannot contain model bodies; move out
3. `L003` `Customer.id` unresolved — add `model Customer`
4. `L001` `totaL` missing visibility — use `-totaL` etc.
5. Nullability missing — error in Strict, defaults to `!` in Draft
6. `Money` undefined — declare `type Money @value_object { ... }` first

## Matching the review grain — View Selectors (RFC 0032, spec 1.2+)

When one `.umlay` serves multiple reviewer audiences, **make the grain
explicit via view selectors** instead of saying "ignore this part" in
prose. The view name + its `exclude:` list become the contract.

```umlay
view exec @sequence_diagram {
  // PM / exec view — hide critical / catch / opt to show the happy path.
  include: auth.Browser, auth.App, auth.Google, auth.AppCallback
  exclude: seq:critical, seq:opt, seq:alt
}

view senior-review @sequence_diagram {
  include: auth.*
  exclude: seq:catch, seq:finally        // retry frame in scope, cleanup out
}

view er-overview @er_diagram {
  include: auth.*
  exclude: visibility:private, **.createdAt, **.updatedAt, stereotype:service
}
```

Review checklist:

- Is the view name (`exec`, `senior-review`, `sre`, …) aligned with
  **who** will read it?
- Is the `exclude` list too aggressive (hiding important `critical` /
  `catch`) or too lax (keeping audit columns that add noise)?
- Are L034 (unknown selector) or L035 (zero-match exclude) firing?

See RFC 0032 and [dsl-guide §10.6](../../docs/en/dsl-guide.md).

## References

- Grammar: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- Reserved words: [`packages/spec/src/index.ts`](../../packages/spec/src/index.ts)
- **Lint rule source of truth**: [`packages/spec/src/lint-rules.md`](../../packages/spec/src/lint-rules.md)
- Type inference rules: [`packages/spec/src/type-inference.md`](../../packages/spec/src/type-inference.md)
- Related skills: [`write-uml`](./write-uml.md), [`evolve-schema`](./evolve-schema.md)
