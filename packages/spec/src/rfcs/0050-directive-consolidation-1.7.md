# RFC 0050 — Directive consolidation (spec 1.7 plan)

- Status: **Draft (planning)**
- Targets: spec **1.7.0**
- Class: **A — additive (new names) + deprecation (old names)**
- Related: RFC 0038 (1.6 metadata bundle), RFC 0049 (1.6.1 lints)

## Motivation

Spec 1.6.1 ships ~30 block directives (`@@id`, `@@unique`, `@@index`,
`@@doc`, `@@md`, `@@sample`, `@@dependencies`, `@@codegen`,
`@@implements`, `@@include`, `@@inv`, `@@pre`, `@@post`, `@@since`,
`@@deprecated`, `@@locked`, `@@example`, `@@detail`, `@@theme`,
`@@mode`, `@@owner`, `@@status`, `@@adrRef`, `@@provenance`,
`@@confidence`, `@@compliance`, `@@boundary`, …). Adding new
constructs in 1.5–1.6 was right for capability; the side effect is a
sprawling vocabulary that:

1. **Overloads authors** — the typical model carries 3–8 directives
   from semantically unrelated buckets (lifecycle, governance,
   documentation, codegen). Each directive is a separate name to
   memorise and look up.
2. **Bloats AI prompts** — `write-uml` / `evolve-schema` skills must
   describe every directive in their body. Today's catalog is
   already pushing the prompt budget.
3. **Hampers tooling** — completion lists 30 entries with no grouping.
   Quick-fix and round-trip code must special-case every directive.
4. **Encourages drift** — `@inv` (annotation, single-at) and `@@inv`
   (block, double-at) coexist with subtly different semantics.

Spec 1.7 consolidates by **grouping semantically related directives
behind a single namespaced name**, while preserving 100% backward
compatibility for the 1.6.x corpus.

## Proposal

### Phase 1 (1.7.0) — introduce four umbrella directives

| New (1.7) | Subsumes (1.6.x) | Shape |
| --- | --- | --- |
| `@@lifecycle` | `@@since`, `@@deprecated`, `@@locked` | `@@lifecycle(state: <enum>, since:, until:, removeIn:, replaceWith:, reason:, by:)` |
| `@@review` | `@@owner`, `@@status`, `@@adrRef` (repeatable) | `@@review(team:, reviewer:, contact:, state:, blockedBy:, since:, adrRefs: [...])` |
| `@@governance` | `@@compliance`, `@@confidence`, `@@provenance` | `@@governance(compliance: { tags:[...], residency:, retention: }, confidence: 0..1, provenance: { agent:, from:, at:, prompt: })` |
| `@@contract` | `@@inv`, `@@pre`, `@@post`, `@@example` | `@@contract(invariants: [...], pre: [...], post: [...], examples: [...])` |

### Phase 1 — leave alone (already coherent)

- Structural keys: `@@id`, `@@unique`, `@@index`, `@@identity`
- Documentation: `@@doc`, `@@md` (kept as-is — distinct ergonomics)
- Composition: `@@include` (trait + composite view, RFC 0033/0034)
- Codegen: `@@codegen` (RFC 0025, has its own composition story)
- Sample data: `@@sample` (RFC 0004/0008)
- View body: `@@detail`, `@@boundary` (kept)
- File-level: `@@mode`, `@@theme`

### Phase 1 — `@inv` / `@@inv` reconciliation

Single-at `@inv("…")` (annotation form, lives in `Rationale`) is
**deprecated** in 1.7. All invariants flow through `@@contract`. A
linter rule (L050) emits `@deprecated` warning; legacy parser
behaviour preserved.

### Phase 2 (1.7.1) — alias + lint

- Each subsumed directive emits `L051` (info): `@@since use is
  deprecated; use @@lifecycle(since:) instead.`
- Tooling (formatter `irToDsl`) emits the **consolidated form** by
  default; `--legacy-directives` flag for older parsers.

### Phase 3 (2.0) — drop the legacy aliases

Out of scope for this RFC.

## Consolidation example

Before (1.6.x):

```umlay
model Order @aggregate_root {
  @@owner(team: "billing", reviewer: "@taro")
  @@status("in-review", since: "2026-04-26", blockedBy: "ADR-007")
  @@adrRef("ADR-005")
  @@adrRef("ADR-007")
  @@provenance(agent: "claude-opus-4-7", from: "schema.prisma", at: "2026-04-26")
  @@confidence(0.6)
  @@compliance(tags: ["PII", "GDPR"], residency: "EU")
  @@since("1.6.0")
  @@locked(reason: "PCI-DSS")
  @@inv(field: total, op: ge, value: 0)
  @@example(input: { total: -1 }, expect: reject, reason: "non-negative")
  @@example(input: { total: 100 }, expect: accept)
  id    UUID! @id
  total decimal!
}
```

After (1.7):

```umlay
model Order @aggregate_root {
  @@review(
    team: "billing",
    reviewer: "@taro",
    state: "in-review",
    since: "2026-04-26",
    blockedBy: "ADR-007",
    adrRefs: ["ADR-005", "ADR-007"]
  )
  @@governance(
    compliance: { tags: ["PII", "GDPR"], residency: "EU" },
    confidence: 0.6,
    provenance: { agent: "claude-opus-4-7", from: "schema.prisma", at: "2026-04-26" }
  )
  @@lifecycle(state: "active", since: "1.6.0", locked: { reason: "PCI-DSS" })
  @@contract(
    invariants: [{ field: total, op: ge, value: 0 }],
    examples: [
      { input: { total: -1 }, expect: reject, reason: "non-negative" },
      { input: { total: 100 }, expect: accept }
    ]
  )
  id    UUID! @id
  total decimal!
}
```

12 directives → 4 directives. Same IR.

## IR shape (1.7 additive)

`Model` keeps the 1.6 fields (typed). The 1.7 reader maps the umbrella
directives to the **same fields** (no new IR shape). For a 1.7 author:

- `@@review(...)` → fills `model.owner`, `model.status`, `model.adrRefs`
- `@@governance(...)` → fills `model.compliance`, `model.confidence`,
  `model.provenance`
- `@@lifecycle(...)` → fills `model.since`, `model.deprecated`,
  `model.locked`
- `@@contract(...)` → fills `model.rationale.invariants` /
  `structuredInvariants` / `preconditions` / `postconditions` and
  `model.examples`

The IR is the contract. Surface syntax is sugar.

## Argument shape standard

1.7 standardises directive args as **either**:

- **Positional only** (≤ 3 args, simple values): `@@id(a, b, c)`
- **Keyword-only** (object form): `@@review(team: ..., reviewer: ...)`

Mixed (positional + keyword) is **deprecated**. `@@compliance("PII")`
becomes `@@governance(compliance: { tags: ["PII"] })` in 1.7.

Container arguments use `[ ... ]` / `{ ... }` consistently (already
allowed since 1.6 grammar; 1.7 codifies usage in lint).

## Backward compatibility

- All 1.6.x `.umlay` files parse unchanged in 1.7.
- IR shape unchanged (1.7 does not add IR fields; it adds parser sugar).
- `irToDsl` defaults to **emitting consolidated form**. Legacy form via
  `--legacy-directives` flag for tooling that pins to 1.6 readers.

## Lint additions (1.7)

| ID | Rule | Severity |
| --- | --- | --- |
| L050 | `@inv` (single-at) is deprecated; use `@@contract` | info / warn / error |
| L051 | Subsumed directive used (`@@since`, `@@locked`, etc.) — prefer `@@lifecycle` | info |
| L052 | Mixed positional + keyword in directive args | info / warn / warn |

These are advisory until 2.0; they exist to nudge migration during the
1.7 lifetime.

## Migration tooling (1.7.x)

- `umlay format --consolidate <file>` rewrites legacy → 1.7 syntax in place
- VS Code: code action "Convert to consolidated directive" on each
  legacy directive
- skill `evolve-schema`: gains a "consolidate" mode that targets ≥ 1.7

## Out of scope for 1.7

- Removing legacy directives (deferred to 2.0)
- `@@codegen` consolidation (codegen has its own RFC pipeline)
- View directives (`@@boundary`, `@@detail`) — already coherent
- Top-level (`@@mode`, `@@theme`) — file-level remains separate

## Conformance

L3 implementations claiming spec 1.7 MUST:

1. Parse the four umbrella directives and map to the IR fields shown
   in §"IR shape" above.
2. Continue parsing all 1.6.x directives without diagnostic
   degradation (same IR for the same input).
3. Emit L050–L052 at the documented severities.
4. `irToDsl` defaults to consolidated emission.

## Test coverage plan

- `packages/core/src/rfc-0050.test.ts` — round-trip tests for each
  umbrella directive
- 1.6 → 1.7 corpus: every `.umlay` in `packages/examples/samples`
  parsed by 1.6 reader and 1.7 reader produce **identical IR**
- New conformance fixture: `consolidated-metadata.umlay` exercising
  all four umbrella directives

## Open questions

1. Should `@@review` allow positional-shorthand `@@review("@taro")` →
   reviewer-only? Pros: ergonomic; cons: mixes positional/keyword.
   Tentative: **no**.
2. Should `@@contract` accept the legacy string form
   `@@contract("total >= 0")` for a single invariant? Pros:
   migration; cons: revives the string-vs-structured ambiguity.
   Tentative: **no**.
3. Should `@@lifecycle` enum (`active` / `deprecated` / `locked` /
   `experimental`) be a closed set? Tentative: **yes** (use Zod
   enum).

These are decided at RFC `Accepted` time, not now.
