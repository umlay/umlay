# DSL Guide — a practical walkthrough

How to write Umlay DSL (`.umlay`), organized by category. The canonical grammar is [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md).

## 1. Basic elements

### namespace

Logical package boundary. Declare at the top of the file.

```prisma
namespace ordering
```

### type (value object)

A value object composed of multiple primitive fields.

```prisma
type Money @value_object {
  amount   decimal @scale(2)
  currency string  @pattern("^[A-Z]{3}$")
}
```

### enum

```prisma
enum OrderStatus { DRAFT, CONFIRMED, SHIPPED, CANCELLED }
```

### model (entity / aggregate)

Core domain concept. Stereotypes clarify the role.

```prisma
model Order @aggregate_root @intent("Customer order aggregate") {
  id          UUID!      @id
  customerId  UUID!      @ref(Customer.id)
  total       Money!     @inv("total >= 0")
  status      OrderStatus = DRAFT
  #createdAt  Timestamp! @auto

  -> composition 1..* lines: OrderLine
}
```

## 2. Nullability

| Symbol | Meaning |
| --- | --- |
| `!` | NOT NULL (required) |
| `?` | NULL allowed (explicit) |
| `??` | NULL allowed, default is NULL |

## 3. Key annotations

| Annotation | Purpose |
| --- | --- |
| `@id` | Single-column primary key |
| `@@id(a, b)` | Composite primary key |
| `@ref(X.y, onDelete?, onUpdate?, inverse?)` | Foreign key |
| `@unique` | Unique constraint |
| `@index` | Index |
| `@default(value)` | Default value |
| `@codegenName("Foo")` | English name mapping for code generation |
| `@inv("expr")` | Invariant |
| `@pre("...")` / `@post("...")` | Pre / post-conditions (on methods) |
| `@intent("...")` | Intent — hints for AI generation / review |
| `@aggregate_root` / `@entity` / `@value_object` / `@service` | Stereotypes |

## 4. Visibility prefixes

Apply at the start of a field or method; defaults to `public` if omitted.

| Symbol | Meaning |
| --- | --- |
| `+` | public (default) |
| `-` | private |
| `#` | protected |
| `~` | package (spec 1.3.0+) |

## 5. Relations

```prisma
model Order {
  -> composition 1..* lines: OrderLine     // composition (cascade-capable)
  -> aggregation 0..* tags: Tag            // aggregation (weak ownership)
  -> association 1    customer: Customer   // plain association
  -> inheritance AuditableEntity           // inheritance
}
```

Multiplicity supports `1`, `0..1`, `1..*`, `0..*`, `n..m`.

## 6. Block directives

### `@@doc`

```prisma
@@doc("""
  Order is the fundamental unit for booking revenue.
  ...
""")
```

### `@@attachments`

Attach images as supplementary material (never embedded in the SVG).

```prisma
@@attachments("wireframe.png", "board-photo.jpg")
```

### `@@theme`

Specify an external CSS theme.

```prisma
@@theme("themes/dark.css")
```

### `@@mode`

Switch validation mode at the file level.

```prisma
@@mode(strict)   // Strict: unset fields become errors
@@mode(draft)    // Draft (default): unset fields get defaults
```

### `@@dependencies` (Gantt / WBS)

Declare multiple predecessor relationships at the model level. Drives Gantt arrows and WBS ordering.

```prisma
// Short form (FS / lag 0)
@@dependencies(BackendDev, FrontendDev)

// Full form (explicit kind / lag)
@@dependencies(
  { on: UnitTesting, kind: FS, lag: 0 },
  { on: E2EUAT,      kind: FS, lag: 2 }
)
```

- `kind` — `FS` / `SS` / `FF` / `SF` (PMBOK, defaults to `FS`)
- `lag` — integer days; negative = lead (defaults to `0`)

## 7. Views

Views project one or more models into a diagram. To avoid duplicate model definitions, **views reference models only** — they cannot contain model bodies.

```prisma
view order-er @er_diagram {
  include: ordering.*, customer.Customer
}

view class-overview @class_diagram {
  include: ordering.*
  layout: direction(LR), hint("Order @center")
}

view confirm-flow @sequence_diagram {
  participants: Customer as cust, Order as order, OrderLine as line
  seq {
    cust ->> order : confirm()
    loop "for each line" { order ->> line : validate() }
    order -.> cust  : OrderConfirmed
  }
}
```

Supported view kinds (per IR schema): `@er_diagram`, `@class_diagram`, `@sequence_diagram`, `@component_diagram`, `@package_diagram`, `@state_machine`, `@activity_diagram`, `@deployment_diagram`, `@wbs_diagram`, `@gantt_chart`.

## 8. Non-Latin identifiers

The DSL allows identifiers in any Unicode letter class. Use `@codegenName` when code generation needs an English-safe name.

```prisma
model 注文 @aggregate_root @codegenName("Order") {
  id UUID! @id
}
```

## 9. Draft vs Strict mode

| Mode | Unset fields | Use case |
| --- | --- | --- |
| **Draft** (default) | Filled with defaults; `@intent` optional | Sketching, drafting |
| **Strict** | Missing multiplicity / visibility / `@intent` raise errors | Pre-merge, production promotion |

## 10. Advanced features (spec 0.3.0 → 0.8.0)

Everything above is the Phase 1 core DSL. The following are accepted RFCs layered on top. See [`grammar.md`](../../packages/spec/src/grammar.md) for full BNF, [`ir.schema.json`](../../packages/spec/src/ir.schema.json) for IR shape, and [`packages/spec/src/rfcs/`](../../packages/spec/src/rfcs/) for rationale.

### 10.1 protocol / union / module (RFC 0006, spec 0.3.0)

```
protocol Printable  @intent("something we can print") {
  fn print() -> string
}

union Result<T, E> =
  | Ok<T>(value: T)
  | Err<E>(error: E)

module shop.catalog {
  model Product @entity { ... }
}
```

### 10.2 Generics + Variance + Bounded (RFC 0015 / 0019)

```
protocol Repository<T: Entity>  @intent("CRUD for T") {
  fn save(entity: T!) -> T!
  fn findById(id: UUID!) -> T?
}

protocol Supplier<out T>  @intent("covariant: read side of T") { fn get() -> T! }
protocol Consumer<in  T>  @intent("contravariant: write side of T") { fn put(x: T!) -> void }
```

- `T: Entity` adds a bound (any stereotype / protocol / union / model)
- `<out T>` = covariance, `<in T>` = contravariance (see type-inference.md for the use-site checks)

### 10.3 impl / blanket impl / @@override (RFC 0011 / 0016 / 0020)

```
impl<T> Repository<T> for SqlRepo<T> where (T: AggregateRoot) {
  fn save(entity: T!) -> T! { /* codegen target */ }
  fn findById(id: UUID!) -> T?  { /* codegen target */ }
}

// blanket: every T with Q automatically gets P
impl<T> Printable for T where (T: Debug) {
  fn print() -> string { "<debug>" }
}

// diamond MRO ambiguity is unresolvable by C3, so make the override explicit
protocol Named  { fn name() -> string }
protocol Titled { fn name() -> string }
model Book implements Named, Titled {
  @@override(name from: Titled)
  fn name() -> string { "title" }
}
```

### 10.4 critical / timeout / retry / catch / finally (RFC 0017 / 0021 / 0028)

```
seq {
  critical "payment flow" timeout(3s) retry({ attempts: 3, backoff: exponential, initial: 100ms, jitter: true }) {
    api ->> pg : POST /charge
    pg  -.> api: 200 { txnId }
  } catch "exhausted" {
    api ->> m : track("payment.failed")
  } finally {
    api ->> m : track("payment.completed")
  }
}
```

- `timeout(N)`: overall limit (ms/s/m/h)
- `retry(N)` or `retry({ attempts, backoff: exponential|linear|constant, initial, max, jitter })`
- `catch` / `finally` for failure / completion notifications

### 10.5 CPM (Critical Path Method) on Gantt (RFC 0024)

```
view schedule @gantt_chart {
  include: pm.Task, pm.TaskDependency
  // The renderer auto-computes CPM (forward / backward pass)
  // and highlights tasks with slack = 0 as the critical path (red).
}
```

- Currently FS (Finish-to-Start) + lag = 0 only. PMBOK's SS / FF / SF + lag support is a planned follow-up to RFC 0024.
- CPM calculation is exposed as `computeCpm` from `@umlay/renderer-er` (with unit tests).

### 10.6 @@codegen hooks (RFC 0025)

```
model User @aggregate_root {
  @@codegen(
    { target: "prisma",    emit: "prisma/schema.prisma" },
    { target: "typescript", emit: "src/types/User.ts" }
  )
  ...
}
```

Each target is produced by an external codegen plugin that reads the IR. Official target examples live in [`skills/en/codegen-mapping.md`](../skills/en/codegen-mapping.md).

### 10.7 @deprecated / @experimental (RFC 0023 / 0027)

```
model LegacyUser @entity
  @deprecated({ since: "0.6.0", removeIn: "1.0.0", replaceWith: User,
                message: "use User with the new auth flow" }) { ... }

model StreamProcessor @aggregate_root
  @experimental({ since: "0.8.0", stabilizeIn: "1.0.0",
                  trackingIssue: "umlay/umlay#456" }) { ... }
```

- `@deprecated` surfaces call sites via lint W001
- `@experimental` surfaces via lint W002 and is a candidate for the migration-guide-1.0.md tables

## 10.5 Markdown integration (RFC 0031, spec 1.1.0+)

Four ways to put Markdown into a `.umlay` file. **All additive** — existing
files work unchanged.

### A. Markdown inside doc strings

```prisma
model User @aggregate_root @intent("""
## Role

- authentication subject
- **email** is unique
""") {
  id UUID! @id
}
```

`@intent` / `@@doc` / `@review` / `@fix` bodies render as CommonMark + GFM
across consumers (LSP hover, VS Code preview, web editor).

### B. `@@md` directive — free-form Markdown block

```prisma
model Order @aggregate_root {
  id UUID! @id

  @@md("""
  ## State transitions

  | from | to |
  | --- | --- |
  | DRAFT | SUBMITTED |
  """)
}
```

Unlike `@@doc`, multiple `@@md` blocks may coexist on the same model and
preserve tables / code fences / multiple paragraphs.

### D. Markdown trailer at end of file

```
namespace shop
model Order @entity { id UUID! @id }

---

# Design notes

ADR / implementation rationale lives here.
```

A standalone `---` line ends the DSL section; everything after it is
captured as `IR.docTrailer` (string). A `---` inside a triple-quoted
string is ignored.

### C. Literate `.umlay.md`

Save the file as `.umlay.md` and write Markdown freely with ` ```umlay `
fenced blocks for the DSL parts. GitHub renders the file as a normal
Markdown document.

````markdown
# Auth domain

## Entities

```umlay
namespace auth
model User @entity { id UUID! @id }
```
````

Reference implementation API: `parseLiterate(source)` in `@umlay/core`.

## 10.6 View selectors (RFC 0032, spec 1.2+)

`include:` and `exclude:` now accept **selectors** beyond bare model names,
so one DSL can serve multiple review audiences without duplicating models.

### Available selectors

| Selector | Matches | Example | Phase |
| --- | --- | --- | --- |
| `ns.Model` / `ns.*` / `**` | model name pattern (legacy) | `auth.*` | 1 |
| `**.attr` | attribute name across every model | `**.passwordHash` | 1 |
| `visibility:X` | attribute visibility (`public` / `private` / `protected` / `package`) | `visibility:private` | 1 |
| `seq:X` | sequence-body statement kind (`critical` / `opt` / `alt` / `par` / `loop` / `catch` / `finally` / `retry` / `timeout` / `message` / `await`) | `seq:critical` | 1 |
| `stereotype:X` | model stereotype (`entity` / `aggregate_root` / `value_object` / `service` / `interface`) | `stereotype:value_object` | **2** |
| `kind:X` | relation kind (`composition` / `aggregation` / `association` / `dependency` / `inheritance` / `realization`) | `kind:dependency` | **2** |

### Examples

```umlay
// PM / exec overview: four actors, happy path only.
view exec @sequence_diagram {
  include: auth.Browser, auth.App, auth.Google, auth.AppCallback
  exclude: seq:critical, seq:opt, seq:alt
}

// Reviewer view: critical blocks visible, catch/finally suppressed.
view senior-review @sequence_diagram {
  include: auth.*
  exclude: seq:catch, seq:finally
}

// ER overview — no private / audit columns.
view er-overview @er_diagram {
  include: auth.*
  exclude: visibility:private, **.createdAt, **.updatedAt
}

// Phase 2: drop @service actors to see only domain entities.
view business-only @er_diagram {
  include: auth.*
  exclude: stereotype:service
}

// Phase 2: structural relationships only — no dependencies.
view structural @class_diagram {
  include: core.*
  exclude: kind:dependency
}
```

### Semantics

- Empty `include` still means "every model" (unchanged).
- `exclude` is applied after `include`, to the same candidate set.
- Dropping `seq:critical` drops the whole critical frame; dropping
  `seq:catch` / `seq:retry` / `seq:finally` / `seq:timeout` prunes only
  that sub-property of a surviving `critical`.
- `stereotype:X` drops the whole model whose stereotype matches.
- `kind:X` drops relations of that kind while keeping the models.
- Unknown kinds (`foo:bar`) raise lint L034 but do not block parsing.

Showcase: `packages/examples/samples/google-oauth-login.umlay` contains
five canonical views demonstrating every selector family.

## 10.7 Traits — attribute mixins (RFC 0034, spec 1.3+)

Repeating columns like `createdAt` / `updatedAt` / `deletedAt` / `tenantId`
are factored into a **trait**. A model pulls them in with `@@include(Trait)`;
expansion happens at parse time, so lint / renderer / codegen only see the
final flat attribute list.

```prisma
namespace shared

trait Timestamped {
  -createdAt Timestamp!
  -updatedAt Timestamp!
}

trait SoftDelete {
  -deletedAt Timestamp?
}

// Traits can themselves `@@include` other traits (recursive expansion).
trait Audited {
  @@include(Timestamped)
  -createdBy UUID!
  -updatedBy UUID!
}

model Order @aggregate_root {
  @@include(Audited)          // brings Timestamped transitively
  +id    UUID!    @id
  +total decimal!
}
```

Diagnostics: L040 (model vs trait clash), L041 (two traits clash),
L042 (include cycle), L045 (unknown trait), L043 (unused trait, warn),
L044 (<2 attrs, info).

Traits don't carry methods — use `protocol` + `impl` for those. They're
a pure structural mixin, so codegen / Prisma / SQL all see concrete rows.

Real example: `packages/examples/samples/traits-audit.umlay`.

## 10.8 Composite views (RFC 0033, spec 1.3+)

`@composite` views embed other views on one canvas — ER + sequence +
Gantt in a single architect-friendly picture.

```prisma
view auth-er       @er_diagram       { include: auth.* }
view login-flow    @sequence_diagram { participants: ...  seq { ... } }
view impl-schedule @gantt_chart      { include: auth.ImplTask }

view overview @composite @intent("Architect-friendly one-canvas view") {
  @@include(auth-er)
  @@include(login-flow)
  @@include(impl-schedule)
  layout: direction(LR), spacing(48)
}
```

Child views keep their own `include:` / `exclude:` (this is a pure compose).
`@@include` accepts a view id directly (hyphens OK, comma-separated for
multiple). Missing ids render as a red-dashed placeholder (L038 warning).
Composites-of-composites are allowed (recursive). Layout defaults to `TB`.

Real example: `packages/examples/samples/composite-overview.umlay`.

## 10.9 UML class-diagram modifiers (spec 1.3+)

UML-friendly flags for class / attribute rendering.

| Annotation | DSL | Rendered as |
| --- | --- | --- |
| `@abstract` | `model Shape @entity @abstract { ... }` | italic class name + dashed border |
| `@static` | `+total int! @static` | underlined attribute row |
| `@readonly` | `+createdAt Timestamp! @readonly` | `{readonly}` chip |
| `@derived` | `+discount decimal! @derived` | `/discount` prefix (UML derived-attribute) |

Protocol generic type params appear in the class-diagram header
verbatim: `Repository<T>`, `Collection<out R, in W>`.

## 10.10 Backtick identifiers — reserved-keyword escape (spec 1.3+)

Wrap a field name in backticks to use a SQL reserved word (`limit`,
`from`, `order`, …) or an Umlay-reserved keyword (`type`, `cache`,
`stream`, …) as an attribute name. The IR stores the unwrapped form,
so `@ref(X.limit)` resolves exactly like any other identifier.

```umlay
namespace api

model Page @entity @intent("paginated list response") {
  +id         UUID!   @id
  +`limit`    int!    @default(100)
  +`from`     string! @intent("cursor start")
  +`type`     string! @intent("list | detail")
  +createdAt  Timestamp! @auto
}
```

- Non-reserved names are NOT re-wrapped on `irToDsl` round-trip.
- Reserved names (per a built-in SQL + Umlay hot zone) are automatically
  backticked when the formatter emits them.

## 10.10e Metadata bundle — RFC 0038–0044 / spec 1.6+

Eight optional, additive directives that attach reviewer / AI / PM
metadata to model / attribute / namespace declarations.

```umlay
@@boundary(exposes: ["Order.id", "Order.status"], hides: ["Order.internalSeq"])
@@compliance(tags: ["PII"], residency: "EU")

namespace billing

model Order @aggregate_root {
  @@owner(team: "billing-platform", reviewer: "@taro")     // RFC 0038
  @@status("in-review", since: "2026-04-26", blockedBy: "ADR-007")
  @@adrRef("ADR-005")
  @@provenance(agent: "claude-opus-4-7", from: "schema.prisma", at: "2026-04-26")
  @@confidence(0.6)                                         // RFC 0039
  @@compliance(tags: ["PII", "GDPR"], residency: "EU")      // RFC 0040
  @@since("1.6.0")                                          // RFC 0041
  @@locked(reason: "PCI-DSS — change requires security review")  // RFC 0042
  @@example(input: { total: -1 }, expect: reject, reason: "non-negative invariant")  // RFC 0043
  @@example(input: { total: 100 }, expect: accept)

  id        UUID! @id
  email     string!  @@compliance(tags: ["PII"])            // inline on attribute
  cardLast4 string!  @@locked(reason: "do not log")
}
```

- Arrays `[ ... ]`, objects `{ ... }`, negative numbers, booleans, and
  quoted strings are accepted as directive arguments.
- IR gains typed fields: `Model.owner / status / adrRefs / provenance /
  confidence / compliance / since / locked / examples`,
  `Attribute.compliance / since / locked`, and `Namespace.boundary /
  compliance`.
- IR root carries `specVersion: "1.6.0"` (distinct from IR schema
  version `version: "1.0"`).
- Lint enforcement (L046+) is staged in subsequent RFCs.

## 10.10c Class / ER reference-hop (`refs: N`) — RFC 0036 / spec 1.5+

Expand a class or ER view's seed `include:` set by N reference hops at
projection time. Pre-1.5 you had to hand-list every neighbour in
`include:`; the view fell out of sync silently when `User` gained or
dropped a reference.

```umlay
view user-only       @class_diagram { include: shop.User }                    // exact only
view user-with-refs  @class_diagram { include: shop.User; refs: 1 }           // + 1-hop
view user-deep       @class_diagram { include: shop.User; refs: 2 }           // + 2-hops
view user-no-address @class_diagram { include: shop.User; refs: 2; exclude: shop.Address }
```

- `refs: 0` (default if omitted) = exact include.
- BFS walks `attribute.ref.target` and `relations[].target`.
  Outgoing references only (reverse navigation is a future RFC).
- `exclude:` applies after expansion — it removes hop-added models too.
- Honored by `er_diagram` / `class_diagram` / `package_diagram` /
  `component_diagram`. Other kinds ignore it.

## 10.10d Sequence detail levels (`@@detail` + `level:`) — RFC 0037 / spec 1.5+

Write the sequence body **once** and switch granularity via the view's
`level:` setting.

```umlay
view checkout-skeleton @sequence_diagram {
  level: high
  participants: shop.OrderService as S, shop.OrderDao as D, shop.OrderEntity as E
  seq {
    S ->> D: "save"
    @@detail("low") {
      S ->> S: "validate"
      S ->> S: "calcTax"
    }
    D ->> E: "insert"
    @@detail("low") {
      D ->> D: "buildSql"
    }
  }
}

view checkout-detail @sequence_diagram {
  level: low
  participants: ...; seq { ...same body... }
}
```

- `@@detail("<level>") { ... }` wraps inner statements with a tag of
  any string (conventional: `"low"` / `"high"` / domain names).
- View `level: X`:
  - statements outside any group are always shown
  - groups with `level == X` are expanded inline
  - groups with a different level are **dropped**
- View without `level:` expands every group inline (legacy behavior).
- Groups may nest. Matching is per-group, not transitive.

## 10.10b Attaching docs to enum / type / model (RFC 0035 / spec 1.4+)

Place `@@doc(...)` / `@@md(...)` immediately before a top-level declaration
to attach its content to that declaration's **`docs: string[]`**. Spec 1.3
only allowed top-level directives **before the first declaration**;
inserting one between declarations failed with `Expecting EOF`. Spec 1.4
lifts that restriction.

```umlay
namespace messaging

@@doc("Order lifecycle as observed by the warehouse system.")
enum OrderStatus { DRAFT, CONFIRMED, SHIPPED, CANCELLED }

@@md("""
Internal: settlement states are not user-visible.
Used by the finance pipeline only.
""")
enum SettlementStatus { PENDING, RECONCILED, WRITTEN_OFF }
```

- `EnumSchema`, `TypeDefSchema`, and `ModelSchema` all carry
  `docs: string[]`.
- `@@mode(...)` / `@@theme(...)` remain file-level regardless of position.
- A trailing `@@doc` not followed by a declaration is silently dropped
  (a future L046 lint may surface this).

Use this for **per-enum documentation** in namespaces with many enums
(typical reverse-engineer / write-uml output).

## 10.11 View layout direction (spec 1.3+)

`view.layout: direction(...)` accepts `LR` (default) / `TB` / `RL` / `BT`.
For ER views specifically, ≥ 8 tables **auto-switches to DOWN** with
`elk.aspectRatio: 1.6` so a 30-table schema doesn't become a single
unreadable horizontal strip. Explicit `direction(...)` always wins.

```umlay
view wide-er @er_diagram {
  include: shop.*
  layout: direction(TB), spacing(40)
}
```

## 11. References

- [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md) — canonical grammar
- [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json) — IR JSON Schema
- [`packages/spec/src/lint-rules.md`](../../packages/spec/src/lint-rules.md) — Lint rule catalog
- [`packages/spec/src/type-inference.md`](../../packages/spec/src/type-inference.md) — variance / bound / diamond MRO rules
- [`packages/spec/src/rfcs/`](../../packages/spec/src/rfcs/) — accepted RFCs (0001–0030)
- [`packages/examples/samples/`](../../packages/examples/samples/) — real examples
