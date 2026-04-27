---
name: transcribe-design
version: 1.6.4
spec: "@umlay/spec >= 1.6.4 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, developer, architect]
summary: Transcribe an existing natural-language design document into a `.umlay` skeleton — the NL counterpart of `reverse-engineer`
description: Use when an existing design document (Markdown / Word / PDF / Confluence page) needs to be lifted into Umlay DSL. `reverse-engineer` handles "code → .umlay"; this skill handles "**natural-language doc → .umlay**" via NLU. Output structure only with `@@confidence` + `@@status("in-review")` flags so reviewers can verify before promotion.
references:
  grammar: ../../../packages/spec/src/grammar.md
  schema: ../../../packages/spec/src/ir.schema.json
  keywords: ../../../packages/spec/src/index.ts
---

# transcribe-design

## Goal

Take a free-form design document (text, Markdown, Wiki) and produce a
**structural** Umlay DSL skeleton. Design judgement (intent /
invariant / stereotype) is **flagged with `@@confidence`** rather than
asserted with certainty.

Relationship to `reverse-engineer`:

| Aspect | `reverse-engineer` | **`transcribe-design`** |
| --- | --- | --- |
| Input | Prisma / SQL / TS (machine-readable) | Markdown / NL (human-readable) |
| Determinism | Fully deterministic | LLM-required (NLU) |
| Confidence | High (types are explicit) | Medium-low (inferred from prose) |
| Stereotype | Never guessed (TODO marker) | Guessed *with evidence* and `@@confidence` |
| Pair use case | Lift existing system | Lift existing documentation |

## Preconditions

| Item | Content |
| --- | --- |
| Input | NL document (Markdown / plain text / extracted PDF text) |
| Output | `.umlay` text (UTF-8) + leading TODO header |
| Out-of-scope | Image-only docs (need OCR or human transcription first) |

## Extraction targets (in order)

1. **Namespace candidate** — feature name / module name / chapter title
2. **Entities / models** — phrases like "X master", "Y record", "Z information"
3. **Attributes** — bullet lists of fields, types, optionality, length
4. **Relations (`@ref` / relation)** — "linked to", "belongs to", "owns"
5. **Enums** — "X kind: A / B / C", "Y status: ..."
6. **State transitions** — "draft → confirmed" tables → state_machine view
7. **Business rules / invariants** — "must be ≥ 0", "only when X" → `@inv` candidates (model-level → header)
8. **Screen / API flow** — sequence diagram view candidates
9. **Compliance / PII** — "personal info" / "PCI" / "GDPR" → `@@compliance(tags: [...])`
10. **Owner / team** — "managed by X team" → `@@owner(team: ..., reviewer: ...)`

## Determinism boundary (where the LLM is allowed)

| OK | Not OK |
| --- | --- |
| **Stereotype guess** with evidence + `@@confidence` | Inventing attributes |
| **Type inference** ("amount" → `decimal`, "date" → `Timestamp`) | Inventing business rules as invariants |
| **Name normalisation** (English / camelCase, original kept in `@codegenName`) | Inventing numeric values / enum members |
| **Multiplicity inference** ("multiple" → `0..*`) | Summarising / dropping statements |

Every uncertain decision flagged with **`@@confidence(0..1)`** +
**`@@status("in-review")`** + **`@@doc("source: <quote from doc>")`**.

## Output template

```umlay
// --- transcribed-by transcribe-design (from <doc-name> @ <ISO date>) ---
// TODO(review-uml): verify @@confidence < 0.7 entries
// TODO(architect):  fill in business rules as @@inv / @@pre / @@post
// TODO(write-uml):  add audience-specific views
// TODO(architect):  promote @@status to "active" once verified

namespace <ns>

@@boundary(exposes: [...], hides: [...])

enum <Status> { ... }

model <Entity> @<stereotype>
  @intent("<quote from source or AI summary>")
  @inv("<business rule extracted>")            // model-level invariant
{
  @@confidence(0.6)
  @@status("in-review", since: "<ISO date>")
  @@provenance(agent: "claude-opus-4-7", from: "<doc-name>", at: "<ISO date>")
  @@compliance(tags: ["PII"])                  // when applicable

  +id      UUID! @id
  +<attr>  <type>! @maxLength(<n>)
  +<attr2> <type>? @@doc("source: '<original phrase>'")
}

view <ns>-er @er_diagram { include: <ns>.* }
```

## Procedure

### Step 1 — Decompose the document
Sections / chapters → namespace candidates. Bullet lists → attributes.
Tables → enums or state machines. "X has Y" phrases → relations.

### Step 2 — Extract entities
Enumerate nouns, dedupe synonyms, identify the design "actors".

### Step 3 — Author model headers
Stereotype guess, **based on evidence**:

| Cue | Stereotype | Default confidence |
| --- | --- | --- |
| "X master" + ID + child elements | `@aggregate_root` | 0.7 |
| "X value" + no ID, only fields | `@value_object` | 0.8 |
| "X service" / "X manager" | `@service` | 0.6 |
| Otherwise | `@entity` | 0.5 |

`@intent("...")` carries 1–3 sentences of source quotation.

### Step 4 — Author attributes
Type inference table:

| Document phrase | Umlay type |
| --- | --- |
| "amount" / "total" | `decimal!` (+ `@scale(2)`) |
| "id" / "identifier" | `UUID!` |
| "date" | `Date!` |
| "datetime" / "timestamp" | `Timestamp!` |
| "flag" / "enabled" | `bool!` |
| "count" / "quantity" | `int!` |
| "name" / "title" / "description" | `string!` (with length constraint) |
| "email" | `string! @pattern("^[^@]+@[^@]+$")` |

Length constraints ("up to 1024 chars") → `@maxLength(1024)`.

### Step 5 — Relations
- "one A has many B" → composition / `0..*` on A
- "B references A" → `B.aId UUID! @ref(A.id)`
- Cascade hint → `onDelete: CASCADE`

### Step 6 — Enums
Bullet lists like "Status: draft / confirmed / shipped" → `enum`. Use
the **inter-decl `@@doc`** (RFC 0035, spec 1.4+) to capture context:

```umlay
@@doc("Order lifecycle — DRAFT → CONFIRMED → SHIPPED, + CANCELLED")
enum OrderStatus { DRAFT, CONFIRMED, SHIPPED, CANCELLED }
```

### Step 7 — Business rules → invariants
- "amount ≥ 0" → `@inv("total >= 0")`
- "one per customer" → `@inv("customer.id is unique")`
- "must contain @" → `@inv("contains(email, '@')")`

Always on the **model header** (so L021 passes for `@aggregate_root`).

### Step 8 — Declare view candidates
- Whole-namespace overview: `view all-er @er_diagram { include: <ns>.* }`
- Audience-specific: from chapter titles ("for sales", "for admin")
- State machine if transitions are documented

### Step 9 — Hand off via TODO header
```umlay
// TODO(review-uml): verify @@confidence < 0.7 entries
//   - shop.Order   (stereotype @aggregate_root, 0.6)
//   - shop.Address (stereotype @value_object, 0.5)
// TODO(architect):  validate these business rules as invariants
//   - "shipping fee varies by purchase amount" (dynamic — may not
//     fit a fixed @inv)
// TODO(write-uml):  add views
//   - state machine for Order.status
//   - sequence: order confirmation flow
```

### Step 10 — Hand off
1. `umlay check <file>` for parse + lint clean pass
2. Run `review-uml` skill for quality audit
3. Human verifies uncertain entries → promote `@@status` to `"active"`,
   raise `@@confidence` to 0.9+

## Checklist

- [ ] Input doc name + ingest timestamp recorded in TODO header
- [ ] Every model carries `@@provenance` + `@@confidence` + `@@status("in-review")`
- [ ] Stereotype guess justified in `@intent` or `@@doc("source: ...")`
- [ ] Business rules placed on the **model header** (`@inv("...")`) so
      L021 passes for `@aggregate_root`
- [ ] Enum values preserve source order
- [ ] Uncertain numeric types use the narrowest safe choice (`int` over
      `bigint`) + `@@doc` flag
- [ ] PII / sensitive cues → `@@compliance(tags: [...])`
- [ ] `umlay check` shows zero parse errors
- [ ] `review-uml` requested

## Example — Markdown spec → `.umlay`

Input (Markdown excerpt):

```markdown
## Order Management

### Order

An order is a single purchase by a customer. Each order belongs to one
customer and has multiple order lines.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| order ID | UUID | yes | primary key |
| customer ID | UUID | yes | reference to customer |
| total amount | decimal (2 dp) | yes | ≥ 0 |
| status | draft / confirmed / shipped / cancelled | yes | default: draft |
| created at | timestamp | yes | |

Business rules:
- Total amount must be ≥ 0
- Status transitions are draft → confirmed → shipped (one-way)
- Cancel is allowed from any state

Owner: order-team (@order-team)
```

Output `.umlay`:

```umlay
// --- transcribed-by transcribe-design (from order-spec.md @ 2026-04-27) ---
// TODO(review-uml): verify @@confidence < 0.7 entries
//   - shop.Order (stereotype @aggregate_root, 0.7)
// TODO(architect):  add a state_machine view for Order.status
// TODO(architect):  consider whether transitions are better expressed
//                   as fn confirm() @pre/@post rather than a flat @inv

namespace shop

@@doc("Order lifecycle — DRAFT → CONFIRMED → SHIPPED, + CANCELLED at any time")
enum OrderStatus { DRAFT, CONFIRMED, SHIPPED, CANCELLED }

model Order @aggregate_root
  @intent("An order is a single purchase by a customer")
  @inv("totalAmount >= 0")
{
  @@confidence(0.7)
  @@status("in-review", since: "2026-04-27")
  @@provenance(agent: "claude-opus-4-7", from: "order-spec.md", at: "2026-04-27")
  @@owner(team: "order-team")

  +id          UUID!         @id
  +customerId  UUID!         @ref(Customer.id, onDelete: RESTRICT)
                             @@doc("source: 'reference to customer'")
  +totalAmount decimal!      @scale(2)
                             @@doc("source: 'total amount. ≥ 0'")
  +status      OrderStatus!  @default(DRAFT)
  +createdAt   Timestamp!
}

// Customer is out of scope for this doc — author it elsewhere via write-uml
// TODO(write-uml): define Customer in a sibling file and `import` it

view orders-er @er_diagram { include: shop.* }
```

## References

- Grammar: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- Sibling skill: [`reverse-engineer`](../reverse-engineer/SKILL.md) (code → `.umlay`)
- Downstream skill: [`review-uml`](../review-uml/SKILL.md) — always pipe through
- Complement: [`write-uml`](../write-uml/SKILL.md) — fill missing views / invariants
