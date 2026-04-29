---
name: write-uml
version: 1.8.0
spec: "@umlay/spec >= 1.8.0 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, developer]
summary: Produce spec-conformant Umlay DSL (.umlay) from requirements or existing descriptions, with the requirement / design narrative embedded as `@@md` documentation
description: Use when the user wants to write a new Umlay DSL (.umlay) file from requirements, a natural-language description, or an existing codebase/schema. **Always co-author the requirement / basic-design narrative as `@@md` / `@@doc` blocks** and split structural views from prose into separate files (e.g. `er.umlay` / `class.umlay` / `requirement.umlay`). Produces a `@umlay/spec`-conformant file that parses into IR v1.0.
references:
  grammar: ../../../packages/spec/src/grammar.md
  schema: ../../../packages/spec/src/ir.schema.json
  keywords: ../../../packages/spec/src/index.ts
---

# write-uml

## Goal

Given natural-language requirements, an existing schema, or existing code, produce a `.umlay` file that is **conformant with `@umlay/spec`**. The output must parse and transform into IR version 1.0.

## Preconditions

- Target DSL version: `1.0`
- Target IR version: `1.0`
- The only canonical sources are `packages/spec/src/grammar.md` and `packages/spec/src/ir.schema.json`.

## Inputs / Outputs

| Item | Content |
| --- | --- |
| Input | Requirements text, existing DB schema, existing type definitions, use-case description |
| Output | One or more `.umlay` files |

## Procedure

### Step 0 — Decide the file split (important)

**Don't cram the whole domain into one `.umlay`.** Reviewers read at
different grains — "show me the ER", "show me the requirement" — so
split by audience:

| Filename | Main contents | `@@md` ratio | Audience |
| --- | --- | --- | --- |
| **`<domain>.requirement.umlay`** | **Requirements / basic design / ADRs / constraints** as `@@md` blocks plus the canonical model skeleton | **High (≥ 50% of the file)** | Product owner, architect |
| `<domain>.er.umlay` | model / attributes / `@ref` / `view @er_diagram` | Low (model `@intent` only) | DB designer, backend |
| `<domain>.class.umlay` | `fn` / `@pre` / `@post` / `protocol` / `view @class_diagram` | Medium (contract docs) | Logic implementer |
| `<domain>.sequence.umlay` | `view @sequence_diagram`, with `@@detail` for skeleton/detail toggles | Medium | API / flow designer |
| `<domain>.umlay` (optional) | Aggregator that `import`s the rest | — | One-page overview |

**Principles:**

1. **Write the requirement file first** — its intent / constraints flow
   into other files' `@intent` / `@inv`.
2. **Structural files (ER / class) stay structural** — don't bury long
   `@@md` blocks in `er.umlay`; reference the requirement file.
3. **Share canonical model defs via `import`** — never declare the same
   model in two files:

```umlay
// requirement.umlay defines the canonical models
namespace shop
@@md("""…requirement narrative…""")
model Order @aggregate_root { id UUID! @id; total decimal! }

// er.umlay just adds the ER view
namespace shop-er
import "./requirement.umlay"
view shop-overview @er_diagram { include: shop.* }
```

### Step 1 — Pick the namespace

The file must start with **exactly one `namespace`**. Split different domains into separate files.

```prisma
namespace ordering
```

### Step 2 — Extract value objects and enums

Define `type` with `@value_object` stereotype and closed-list `enum`s first.

```prisma
type Money @value_object {
  amount   decimal @scale(2)
  currency string  @pattern("^[A-Z]{3}$")
}

enum OrderStatus { DRAFT, CONFIRMED, SHIPPED, CANCELLED }
```

### Step 3 — Define entities

Use `model` with a stereotype. **The spec defines exactly 5 stereotypes**:

| Stereotype | Use case |
| --- | --- |
| `@aggregate_root` | Entry point of an aggregate boundary |
| `@entity` | Identity-bearing entity |
| `@value_object` | Equality-based value |
| `@service` | Stateless domain service |
| `@interface` | Contract definition |

```prisma
model Order @aggregate_root @intent("Customer order aggregate") {
  id         UUID!  @id
  customerId UUID!  @ref(Customer.id)
  total      Money! @inv("total >= 0")
  status     OrderStatus = DRAFT
}
```

### Step 4 — Decorate attributes

In the IR, an attribute requires `name` and `type`. Always set these explicitly:

| Decoration | Meaning | Default (Draft) |
| --- | --- | --- |
| `!` | NOT NULL | Default is `!` |
| `?` | NULL allowed | No default |
| `??` | NULL allowed, default NULL | — |
| `@id` | Single primary key | — |
| `@@id(a, b)` | Composite primary key | — |
| `@ref(X.y)` | Foreign key | — |
| `@unique` | Unique constraint | — |
| `@index` | Index | — |
| `@default(v)` | Default value | — |
| `@codegenName("Foo")` | English name for codegen | — |
| Visibility `+` / `-` / `#` | public / private / protected | `public` |

`visibility` in IR only accepts `public / private / protected / package`.

### Step 5 — Write relations

**The 4 relation kinds**:

```prisma
model Order {
  -> composition 1..* lines: OrderLine     // ownership (cascade-capable)
  -> aggregation 0..* tags: Tag            // weak ownership
  -> association 1    customer: Customer   // plain association
  -> inheritance AuditableEntity           // inheritance
}
```

Multiplicity must be one of `1`, `0..1`, `1..*`, `0..*`, `n..m`. **Required under Strict mode.**

### Step 6 — Reference options

`@ref` supports the following. The IR enum allows **exactly 4 values: CASCADE / RESTRICT / SET_NULL / NO_ACTION**:

```prisma
@ref(Customer.id, onDelete: CASCADE, onUpdate: RESTRICT, inverse: "orders")
```

### Step 7 — Add intent and contracts

Boost AI generation and review quality by adding:

```prisma
model Order @aggregate_root
  @intent("Customer order aggregate")
  @inv("total.amount >= 0")
  @inv("status in ['DRAFT', 'CONFIRMED', 'CANCELLED']") {
  total  Money!
  status OrderStatus!

  fn confirm() -> void
    @pre("status == DRAFT")
    @post("status == CONFIRMED")
    @raises(InvalidStateError)
    @intent("Confirm draft")
}
```

**⚠️ L021 pitfall (strict error)**: `@aggregate_root` requires **at
least one `@inv("...")` on the model header**. Attribute-level `@inv`
does NOT satisfy L021.

```prisma
// ❌ NG (L021 fires) — only attribute-level @inv
model Order @aggregate_root @intent("...") {
  total Money! @inv("total >= 0")
}

// ✅ OK — header carries one or more @inv
model Order @aggregate_root
  @intent("...")
  @inv("total.amount >= 0") {
  total Money!
}
```

Treat **model-level invariants** as cross-attribute / business rules
and **attribute-level invariants** as single-field value-range
constraints. Both can coexist; both flow into different lint surfaces.

### Step 7.5 — Layer the documentation (`@@md` / `@@doc` / Markdown trailer) **required for `requirement.umlay`**

In requirement / basic-design files (`requirement.umlay`), the
documentation layer should outweigh the structural layer. Aim for a
review experience where the `.umlay` alone explains "what we're
building", "why this boundary", and "how it'll be used".

#### Four documentation layers (RFC 0031 / 0035, spec 1.1+)

| Layer | Syntax | Use |
| --- | --- | --- |
| **A. Markdown in strings** | `@intent("...")` / `@inv("...")` | One-line "what for / what to uphold" |
| **B. `@@md(""" ... """)`** | inside model bodies *or* before declarations (RFC 0035) | Multi-paragraph, tables, code fences, diagrams. **The body of the requirement file** |
| **C. `@@doc("""...""")`** | Same positions as `@@md` | Single-paragraph public-doc-style description |
| **D. Markdown trailer (after `---`)** | End of file | Cross-cutting (constraints / glossary / open questions / external links) |

#### Principles

1. **`requirement.umlay` should be ≥ 50% Markdown.** If it isn't, you've
   made another ER file and forgotten the requirements.
2. Use **pre-declaration `@@md` / `@@doc` (RFC 0035)** to give each
   model a paragraph + table on **why it exists, its business role, what
   reviewers must know**.
3. Keep the **header `@intent("...")`** as the **one-line summary** of
   the Markdown block — together they read as "TOC line + body".
4. Use the **trailing `---`** for ADR pointers, glossaries, and open
   questions. The parser stores it in `IR.docTrailer`; Document mode
   surfaces it.

#### Example: `requirement.umlay` opening

```umlay
namespace shop

@@md("""
# Order domain — basic design

## Background
The 2026-Q2 redesign moves the legacy `Order` table into a proper
aggregate boundary. Anchored by ADR-021 (boundary decision) and
ADR-024 (inventory split-off).

## Business rules (summary)
- Order moves **DRAFT → CONFIRMED → SHIPPED** one-way (CANCELLED is
  reachable from any state)
- After CONFIRMED the `total` is immutable; price corrections happen
  via a new return / additional order
- 1–200 lines per order

## Out of scope
- Inventory reservation lives in `inventory` namespace
- Shipping status lives in `shipping` namespace
""")

@@md("""
## Aggregate: Order
The single entry point for confirmation. **OrderLine is composed**
(deleted with the parent). Status transitions are governed by
`confirm()` / `ship()` / `cancel()` `@pre` / `@post`.
""")
model Order @aggregate_root
  @intent("Customer order aggregate — immutable after confirmation")
  @inv("total >= 0")
{
  id     UUID!         @id
  status OrderStatus!  @states(initial: DRAFT, final: [SHIPPED, CANCELLED])
  total  decimal!

  fn confirm()
    @pre("status == DRAFT")
    @post("status == CONFIRMED")
}

---

# Glossary

| Term | Definition |
| --- | --- |
| Order | The Order aggregate, distinct from the legacy DB table |
| Confirmed | The state after `confirm()` returns |

# Open questions
- [ ] Partial cancellation is out of v1 scope (only full cancel).
- [ ] Reservation sync point — pre- or post-`confirm()`? Awaiting ADR-025.
```

#### Anti-patterns

| ❌ Don't | ✅ Do |
| --- | --- |
| `requirement.umlay` with just `@intent("Order")` and no `@@md` | Pre-decl `@@md` paragraph + business-rules table |
| Cram everything into one giant `@@md` and drop header `@intent` | Both: pre-decl `@@md` (body) + header `@intent` (one-line summary) |
| Write a long `@@md` inside `er.umlay` | Keep ER files structural; reference `requirement.umlay` for prose |
| Scatter glossary entries across multiple `@@md` blocks | Concentrate them in the trailing `---` block |

### Step 7.7 — Sequence diagrams: multiple `seq` blocks per view (RFC 0053, spec 1.8+)

When you want to put several scenarios (success / failure / cancel,
etc.) into a single **report view**, declare multiple `seq <name> { ... }`
blocks inside one `@sequence_diagram`. Each block stacks vertically
under a `« seq: <name> »` header with a divider line.

```umlay
view report @sequence_diagram
  @intent("Success / failure / cancel paths in one diagram") {
  participants: Customer as c, OrderService as svc, OrderDao as dao

  seq success {
    c   ->> svc : "confirm(orderId)"
    svc ->> dao : "save(order)"
    svc -.> c   : "ConfirmedOrder"
  }

  seq failure {
    c   ->> svc : "confirm(orderId)"
    svc ->> dao : "save(order)"
    svc -.> c   : "503 ServiceUnavailable"
  }
}
```

**When to multi-`seq` vs split into views:**

| Concern | Multi-`seq` in one view | Separate views |
| --- | --- | --- |
| Same participants reappear | ✅ shared lifelines, ideal for reports | — |
| Different participant sets | — | ✅ |
| Want to read paths side-by-side | ✅ (success vs failure in one image) | — |
| Want to filter individually with view selectors | — | ✅ |
| Need to fit on one printed page | ✅ | — |

**Rules:**
- When ≥ 2 blocks coexist, **each block must have a unique name** (lint L057).
- Names must be unique within the view.
- Single-block views may be anonymous (`seq { ... }`) or named (`seq main { ... }`).
- `participants:` is declared at the view level once and shared across all `seq` blocks.

### Step 8 — Declare views

**Views reference models only** — model bodies are forbidden inside views.

```prisma
view order-er @er_diagram {
  include: ordering.*, customer.Customer
}
```

**The IR schema allows 10 view kinds**: `er_diagram`, `class_diagram`, `sequence_diagram`, `component_diagram`, `package_diagram`, `state_machine`, `activity_diagram`, `deployment_diagram`, `wbs_diagram`, `gantt_chart`.

### Step 9 — Gantt / WBS predecessors (`@@dependencies`)

Declare multiple predecessor relationships as a model-level block. Drives Gantt arrows and WBS ordering.

```prisma
// Short form (FS / lag 0)
model Integration @entity {
  @@dependencies(BackendDev, FrontendDev)
  +id UUID! @id
  // ...
}

// Full form (explicit kind / lag)
model Release @entity {
  @@dependencies(
    { on: UnitTesting, kind: FS, lag: 0 },
    { on: E2EUAT,      kind: FS, lag: 2 }
  )
  +id UUID! @id
  // ...
}
```

- `on` — a model name in the same namespace
- `kind` — `FS` / `SS` / `FF` / `SF` (defaults to `FS`)
- `lag` — integer days; negative means lead (defaults to `0`)
- Always normalized to the object form (`{ on, kind, lag }`) in IR

### Step 10 — Choose a mode

```prisma
@@mode(strict)   // Production / pre-merge
@@mode(draft)    // Drafting (default)
```

Strict mode turns missing `visibility` / `multiplicity` / `intent` into errors.

## Constraints (spec prohibitions)

| # | Forbidden | Reason |
| --- | --- | --- |
| 1 | Writing a model body inside a view | Views are reference-only (no duplicate definitions) |
| 2 | Omitting `namespace` | IR requires `namespaces` |
| 3 | Using a non-v1 keyword as an identifier | Collides with `RESERVED_KEYWORDS` |
| 4 | Using an undefined stereotype | Only `entity / aggregate_root / value_object / service / interface` |
| 5 | Combining `?` and `!` on one attribute | Nullability is exclusive |
| 6 | Using both `@@id` and `@id` | Pick one primary-key form |
| 7 | Using an unknown view kind | Rejected by IR schema |

## **Common AI mistakes (must read)**

Umlay's syntax is **not Prisma / TypeScript / GraphQL** — habits from
those languages produce parse errors. The most common offenders:

| Form | Status | Pre-1.6.3 parser error |
| --- | --- | --- |
| `id UUID! @id` | ✅ canonical (no colon) | — |
| `id: UUID! @id` | ✅ **accepted (1.6.3+)** as Prisma / TS sugar | `Expecting Identifier, found ':'` (≤ 1.6.2) |
| `email: string?` | ✅ accepted (1.6.3+) | same |
| `model User:` | ❌ model body must be `{}` — `:` is not allowed there | `Expecting LCurly, found ':'` |
| `fn pay(): Receipt` | `fn pay() -> Receipt` | `Expecting Identifier, found ':'` (before return type) |
| `fn pay() => Receipt` | `fn pay() -> Receipt` | parser reject |
| `name = string` | `name string` | `=` is reserved for `type X = Y` (alias) |
| `field UUID @id?` | `field UUID? @id` | nullability goes between type and annotations |
| `attribute "comment"` | `attribute @@doc("comment")` | bare strings not allowed |
| `foreignKey(User.id)` | `@ref(User.id)` | function-call style not allowed |
| `model X @aggregate_root @@confidence(0.3) {` | move into body: `{ @@confidence(0.3) ... }` | `@` (header) and `@@` (body) live in different positions |
| `@@inv(...)` / `@@owner(...)` / `@@status(...)` at the header | header takes single-at: `@inv("...")` / `@intent("...")` — the `@@`-form is body-only | same rule |

The single biggest pitfall: **no colon between attribute name and type**.
If you import from Prisma / TS schemas, use the `reverse-engineer`
skill — when authoring by hand, stick to `name Type` form.

The parser appends a **"Hint:"** line to these specific failures
starting in spec 1.6.1, so the error message itself tells you what to
write instead.

## Reserved keyword list

Accepted by the parser but **reserved and unavailable as identifiers**:

| Category | Keywords |
| --- | --- |
| v1 implemented | `namespace` / `type` / `enum` / `model` / `view` |
| Future UML | `protocol` / `union` / `fn` / `module` |
| React / Next.js | `component` / `page` / `layout` / `action` / `route` / `context` / `hook` |
| Cloud-native | `function` / `worker` / `queue` / `topic` / `stream` / `cache` / `store` / `scheduler` / `webhook` / `integration` / `gateway` / `cdn` |

Canonical source: `RESERVED_KEYWORDS` in [`packages/spec/src/index.ts`](../../packages/spec/src/index.ts).

**Escape hatch (spec 1.3+)**: wrap a field name in backticks to use any
reserved word or SQL keyword as an attribute: `` +`limit` int! ``. The
IR stores the unwrapped form, so `@ref(Model.limit)` resolves the same.

## spec 1.3 additions

Features to keep in mind while authoring:

### RFC 0033 — `@composite` view
Stitch multiple views onto one canvas:
```umlay
view overview @composite @intent("architect one-pager") {
  @@include(auth-er)
  @@include(login-flow)
  layout: direction(LR)
}
```

### RFC 0034 — `trait` (attribute mixin)
Factor out repeating audit / tenancy / soft-delete columns; expanded at
parse time into each model.
```umlay
trait Timestamped { -createdAt Timestamp!  -updatedAt Timestamp! }
trait Audited { @@include(Timestamped)  -createdBy UUID! }

model Order @aggregate_root {
  @@include(Audited)      // createdAt / updatedAt / createdBy flow in
  +id UUID! @id
}
```

### UML modifiers (class-diagram rendering)
| Annotation | Effect |
| --- | --- |
| `@abstract` (model) | italic name + dashed border |
| `@static` (attribute) | underlined row |
| `@readonly` (attribute) | `{readonly}` chip |
| `@derived` (attribute) | `/name` prefix |

### `type X = Y` alias form
```umlay
type ISBN = string
type UserId = UUID
```

### `~` package visibility
Joins `+ / - / #`. `~name` marks an attribute/method as package-private.

### ER layout auto-optimization
When `layout.direction` is unset and tables ≥ 8, the ER renderer
auto-switches to `DOWN` with `aspectRatio: 1.6`. Explicit `direction(LR)`
in the view still wins.

## Checklist (before finalizing)

### Structure (every file)

- [ ] Exactly one `namespace` declared at file top
- [ ] Every `model` has `@id` or `@@id(...)`
- [ ] Every `@ref(X.y)` resolves to an existing model attribute
- [ ] Attributes have explicit `visibility` and nullability (Strict mode)
- [ ] Relations carry multiplicity (Strict mode)
- [ ] Stereotypes are one of the 5 spec values
- [ ] View kinds are one of the 10 IR schema values
- [ ] No model bodies inside views
- [ ] No identifiers collide with `RESERVED_KEYWORDS`
- [ ] When multiple reviewer audiences share one `.umlay`, carve the
      views with **RFC 0032 selectors** (`exclude: seq:critical`,
      `stereotype:service`, `visibility:private`, …) instead of forking
      the file per reader.

### File split (per Step 0)

- [ ] Requirement / basic-design narrative is concentrated in
      `requirement.umlay` (or equivalent); ER / class files don't carry
      requirement prose.
- [ ] No model is declared in two files — share via `import`.
- [ ] One file per audience is fine; no "everything for everyone" file.

### Documentation layer (`requirement.umlay` mandatory, others recommended)

- [ ] **Requirement file ≥ 50% Markdown by volume.**
- [ ] Each model has a **pre-declaration `@@md` or `@@doc`** body
      (not just a one-line `@intent`).
- [ ] The trailing `---` carries the **glossary / open questions /
      ADR pointers**.
- [ ] `@intent("...")` (one line) and `@@md(""" ... """)` (body) are
      not used interchangeably — the intent is the summary line, the
      Markdown block is the body.

## Complete sample — three-file split

### `ordering.requirement.umlay` (requirements + basic design, `@@md` heavy)

```umlay
@@mode(strict)

namespace ordering

@@md("""
# Order domain — basic design (v1)

## Background
The 2026-Q2 redesign moves the legacy `Order` table into a proper
aggregate boundary. Anchored by ADR-021 (boundary decision) and
ADR-024 (inventory split-off).

## Business rules
- Order moves **DRAFT → CONFIRMED → SHIPPED** one-way
- CANCELLED is reachable from any state
- After CONFIRMED the `total` is immutable

## Out of scope
- Inventory reservation (`inventory` namespace)
- Shipping (`shipping` namespace)
""")

type Money @value_object {
  amount   decimal @scale(2)
  currency string  @pattern("^[A-Z]{3}$")
}

enum OrderStatus { DRAFT, CONFIRMED, SHIPPED, CANCELLED }

@@md("""
## Aggregate: Order
The single confirmation entry point. **OrderLine is composed**
(deleted with the parent).
""")
model Order @aggregate_root
  @intent("Customer order aggregate — immutable after confirmation")
  @inv("total.amount >= 0")
{
  id          UUID!         @id
  customerId  UUID!         @ref(Customer.id, onDelete: RESTRICT, inverse: "orders")
  total       Money!
  status      OrderStatus!  @states(initial: DRAFT, final: [SHIPPED, CANCELLED])

  -> composition 1..* lines: OrderLine
}

model Customer @aggregate_root
  @intent("Purchaser")
{
  id    UUID!   @id
  email string! @unique
}

model OrderLine @entity {
  @@id(orderId, lineNo)
  orderId UUID! @ref(Order.id, onDelete: CASCADE)
  lineNo  int!
  qty     int!  @inv("qty > 0")
  price   Money!
}

---

# Glossary

| Term | Definition |
| --- | --- |
| Order | The Order aggregate, distinct from the legacy DB table |
| Confirmed | The state after `confirm()` returns |

# Open questions
- [ ] Partial cancellation is v2 scope.
- [ ] Reservation sync point — pre- or post-`confirm()`? Awaiting ADR-025.
```

### `ordering.er.umlay` (ER diagram, structural only)

```umlay
namespace ordering-er
import "./ordering.requirement.umlay"

view ordering-er @er_diagram
  @intent("Schema overview of the order domain")
{
  include: ordering.*
}
```

### `ordering.class.umlay` (method contracts, class diagram)

```umlay
namespace ordering-class
import "./ordering.requirement.umlay"

view ordering-class @class_diagram { include: ordering.* }
view ordering-life @state_machine { include: ordering.Order, ordering.OrderStatus }
```

`ordering.requirement.umlay` reads on its own; the other two files
exist only to render specific diagram kinds. Reviewers pick whichever
file matches their grain.

## References

- Grammar: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- Reserved words: [`packages/spec/src/index.ts`](../../packages/spec/src/index.ts)
- Samples: [`packages/examples/samples/`](../../packages/examples/samples/)
- Related skills: [`review-uml`](./review-uml.md), [`evolve-schema`](./evolve-schema.md)
