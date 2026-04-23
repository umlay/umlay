---
name: write-uml
version: 1.3.0
spec: "@umlay/spec >= 1.3.0 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, developer]
summary: Produce spec-conformant Umlay DSL (.umlay) from requirements or existing descriptions
description: Use when the user wants to write a new Umlay DSL (.umlay) file from requirements, a natural-language description, or an existing codebase/schema. Produces a `@umlay/spec`-conformant file that parses into IR v1.0.
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
  @intent("Customer order aggregate") {
  total Money! @inv("total >= 0")

  fn confirm() -> void
    @pre("status == DRAFT")
    @post("status == CONFIRMED")
    @raises(InvalidStateError)
    @intent("Confirm draft")
}
```

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

## Reserved keyword list

Accepted by the parser but **reserved and unavailable as identifiers**:

| Category | Keywords |
| --- | --- |
| v1 implemented | `namespace` / `type` / `enum` / `model` / `view` |
| Future UML | `protocol` / `union` / `fn` / `module` |
| React / Next.js | `component` / `page` / `layout` / `action` / `route` / `context` / `hook` |
| Cloud-native | `function` / `worker` / `queue` / `topic` / `stream` / `cache` / `store` / `scheduler` / `webhook` / `integration` / `gateway` / `cdn` |

Canonical source: `RESERVED_KEYWORDS` in [`packages/spec/src/index.ts`](../../packages/spec/src/index.ts).

## Checklist (before finalizing)

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

## Complete sample

```prisma
@@mode(strict)

namespace ordering

type Money @value_object {
  amount   decimal @scale(2)
  currency string  @pattern("^[A-Z]{3}$")
}

enum OrderStatus { DRAFT, CONFIRMED, SHIPPED, CANCELLED }

model Customer @aggregate_root @intent("Purchaser") {
  id    UUID!   @id
  email string! @unique
}

model Order @aggregate_root @intent("Customer order") {
  id          UUID!       @id
  customerId  UUID!       @ref(Customer.id, onDelete: RESTRICT, inverse: "orders")
  total       Money!      @inv("total.amount >= 0")
  status      OrderStatus = DRAFT

  -> composition 1..* lines: OrderLine
}

model OrderLine @entity {
  @@id(orderId, lineNo)
  orderId UUID! @ref(Order.id, onDelete: CASCADE)
  lineNo  int!
  qty     int!  @inv("qty > 0")
  price   Money!
}

view ordering-er @er_diagram {
  include: ordering.*
}
```

## References

- Grammar: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- Reserved words: [`packages/spec/src/index.ts`](../../packages/spec/src/index.ts)
- Samples: [`packages/examples/samples/`](../../packages/examples/samples/)
- Related skills: [`review-uml`](./review-uml.md), [`evolve-schema`](./evolve-schema.md)
