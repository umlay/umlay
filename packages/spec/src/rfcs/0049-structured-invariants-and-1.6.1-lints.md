# RFC 0049 — Structured invariants + spec 1.6.1 lint enforcement (L046–L049)

- Status: **Accepted**
- Shipped in: spec **1.6.1**
- Class: **A — additive (parser); B — newly active (lints)**
- Related: RFC 0038 (1.6 metadata bundle), RFC 0042 (`@@locked`), RFC 0043 (`@@example`)

## Motivation

Spec 1.6.0 introduced metadata directives without enforcement. Real
review flows immediately surfaced gaps:

1. `@@locked` declarations were invisible in `review-uml` output —
   reviewers couldn't tell at a glance that a model carried an edit
   ban.
2. `@@boundary` declarations referenced model / attribute names that
   could rot silently after a rename.
3. PII / GDPR / PCI-DSS attributes had no enforced contract — authors
   could mark a column as PII without supplying a single rejection
   example.
4. `@@example(...)` was free-form text without any consistency check
   against `@@inv("string")` invariants.

This RFC ships the four lint rules that close those gaps **and** the
small parser extension that L049 needs (a structured form of `@@inv`).

## 1. Structured `@@inv` form

```umlay
model Order @aggregate_root {
  // String form — preserved for back-compat (parsed into rationale.invariants).
  @@inv("total >= 0")

  // Structured form — parsed into rationale.structuredInvariants.
  @@inv(field: total,    op: ge, value: 0)
  @@inv(field: status,   op: in, values: ["OPEN", "PAID"])
  @@inv(field: createdAt, op: present)
  @@inv(field: email,    op: match, value: "^[^@]+@[^@]+$")

  id        UUID! @id
  total     decimal!
  status    string!
  email     string!
  createdAt Timestamp!
}
```

### IR addition

```ts
StructuredInvariantSchema = z.object({
  field: z.string(),
  op: z.enum(['ge', 'gt', 'le', 'lt', 'eq', 'ne', 'in', 'notIn', 'present', 'match']),
  value: z.unknown().optional(),
  values: z.array(z.unknown()).optional(),
});

RationaleSchema gains: structuredInvariants: StructuredInvariant[] (default [])
```

`@@inv("string")` continues to land in `rationale.invariants`. The
visitor branches on whether `field:` + `op:` keys are present.

## 2. Lint rules

### L046 — `@@locked` review hint

For every model / attribute with `@@locked`, emit an **info** diagnostic
listing the lock reason. When the locked declaration has no
`@@adrRef`, append a recommendation to add one.

Severity (always): `info`.

### L047 — `@@boundary` ghost references

Walk every `Namespace.boundary.exposes` / `boundary.hides`. For each
FQN, check that it resolves to a model (`Model`) or attribute
(`Model.attr`) that exists in the namespace.

Severity: `warn` in draft / beta, `error` in strict.

### L048 — PII attribute without reject `@@example`

If any of:

- a model carries `@@compliance(tags: ["PII" | "GDPR" | "PCI-DSS" | "PHI" | ...])`
- an attribute on the model carries the same tag

then the model SHOULD have at least one `@@example(expect: reject, ...)`.

Severity: `info` / `warn` / `error` by mode.

### L049 — `@@example` × structured `@@inv` consistency

For every `@@example(input: { ... })` and every structured `@@inv` on
the same model, evaluate the invariant against the example's input.
Report a warning when:

- `expect: accept` but the input violates a defined invariant
- `expect: reject` but the input satisfies all defined invariants

The check skips invariants whose `field:` is not present in the
example's `input` (cannot judge).

Severity: `warn` in draft / beta, `error` in strict.

#### Operator semantics

| op | input value | invariant value | satisfied iff |
| --- | --- | --- | --- |
| `ge` / `gt` / `le` / `lt` | number | number | numeric comparison |
| `eq` / `ne` | any | any | strict equality |
| `in` / `notIn` | any | (uses `values: [...]`) | membership |
| `match` | string | string (regex) | regex match |
| `present` | n/a | n/a | field is in `input` (any value) |

## Implementation status

- `@umlay/core` — visitor branches on structured form, IR field added,
  conformance fixtures regenerated.
- `@umlay/lint` — L046, L047, L048, L049 implemented, total **73 / 73
  rules**.
- `@umlay/cli` — re-bundled at 0.4.0 to ship spec 1.6.1.

## Backward compatibility

- All spec 1.6.0 inputs continue to parse and lint with **identical
  diagnostics** for ≤ L045.
- The new rules emit **info-level** in draft mode by default, so adding
  the lint catalog does not turn previously-clean files into "errors"
  (except for L047, which is `warn` in draft — explicit ghost-FQN
  detection is a clear authoring bug).

## Conformance

L3 implementations MUST:

1. Parse `@@inv(field:..., op:..., value:..., values:[...])` into
   `rationale.structuredInvariants`.
2. Emit L046–L049 with the severities documented in `lint-rules.md`.
3. Round-trip via `irToDsl` — the structured form re-emits exactly
   (field, op, value/values) from the IR shape.
