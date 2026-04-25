# Umlay DSL Grammar

**spec version: 0.8.0** (RFC 0001–0030 accepted)

This file + [`grammar.bnf`](./grammar.bnf) + [`ir.schema.json`](./ir.schema.json) + [`index.ts`](./index.ts) form the canonical spec. Japanese version: [`grammar.md`](./grammar.md).

`grammar.bnf` is the machine-readable source of truth; this document is the human-oriented prose companion.

## 1. File structure

```
<file>      ::= <file-level-directive>* <namespace-decl> <import-decl>* <top-level>*
<top-level> ::= <type-decl>  | <enum-decl>  | <model-decl> | <view-decl>
              | <protocol-decl> | <union-decl> | <module-decl>
```

- Every file **must** declare exactly one `namespace <identifier>` at the top.
- File-level directives (`@@mode` / `@@theme`) may precede or follow the namespace declaration.
- `import` declarations (RFC 0009) go **right after** the namespace declaration.

### 1.1 `import` (RFC 0009 + 0014)

```prisma
namespace pm_feature_a

import pm_core                                 // same-project namespace
import "./shared/infra.umlay" as infra          // relative path with alias
import "@umlay/examples/samples/..." as ext   // npm package (future)

// RFC 0014: glob patterns (alias not allowed)
import "./tasks/*.umlay"
import "./phases/**/*.umlay"
import "./modules/{core,shared}/*.umlay"
```

- Without an import, cross-namespace references (`pm_core.X`) are a parse error.
- Glob supports `*` / `**` / `?` / `[abc]` / `{a,b}` (minimum: `*` and `?`; others are implementation options)
- Glob imports do not allow `as` (file count is variable); zero matches is a warning.

## 2. Built-in types

| Type | Meaning |
| --- | --- |
| `string` | String |
| `int` | 32-bit integer |
| `bigint` | 64-bit integer |
| `decimal` | Arbitrary-precision decimal |
| `bool` | Boolean |
| `UUID` | 128-bit UUID |
| `Date` | Calendar date (year/month/day) |
| `Timestamp` | Date-time with timezone |

User-defined `type <Name> @value_object { ... }` declarations and `enum`s are also usable as attribute types.

## 3. Visibility and nullability

| Symbol | Meaning |
| --- | --- |
| `+` | public (default) |
| `-` | private |
| `#` | protected |
| `~` | package (spec 1.3.0) |
| `!` | NOT NULL |
| `?` | NULL allowed (explicit) |
| `??` | NULL allowed with default NULL |

Visibility prefixes the field name; nullability follows the type.

## 4. Declaration syntax

### 4.1 namespace / type / enum / model / view / trait

- `namespace <identifier>`
- `type <Name> = <TypeRef>` — alias form (spec 1.3.0)
- `type <Name> @value_object { <field>* <block>* }` — body form
- `enum <Name> { V1, V2, ... }`
- `model <Name> <Stereotype> { <field>* <relation>* <fn>* <block>* }`
- `trait <Name> { <field>* <relation>* }` — RFC 0034, spec 1.3.0
- `view <id> <kind> { include: ..., exclude?: ..., layout?: ..., ... }`

Stereotypes (5 values): `@entity` / `@aggregate_root` / `@value_object` / `@service` / `@interface`.

View kinds (**11 values**): `@er_diagram` / `@class_diagram` / `@sequence_diagram` / `@component_diagram` / `@package_diagram` / `@state_machine` / `@activity_diagram` / `@deployment_diagram` / `@wbs_diagram` / `@gantt_chart` / `@composite` (RFC 0033, spec 1.3.0).

### 4.x trait (RFC 0034, spec 1.3.0)

Attribute-level mixin. `@@include(Trait)` inside a model body expands the
trait's attributes into the model at parse time.

```prisma
trait Timestamped {
  -createdAt Timestamp!
  -updatedAt Timestamp!
}

model Order @aggregate_root {
  @@include(Timestamped)
  +id    UUID!    @id
  +total decimal!
}
```

Collision diagnostics: L040 (model attr collides with trait), L041 (two
traits both contribute same name), L042 (include cycle), L045 (unknown
trait), L043 (unused trait, warn), L044 (<2 attrs, info).

### 4.x @composite view (RFC 0033, spec 1.3.0)

Composes multiple views onto one canvas.

```prisma
view overview @composite {
  @@include(auth-er)
  @@include(login-flow)
  layout: direction(LR), spacing(48)
}
```

Each `@@include(viewId)` embeds that view's rendered SVG; layout
`direction(LR|TB|…)` controls tiling. Selectors on child views still
apply. Missing targets render as red-dashed placeholder panels.

### 4.2 protocol / union / module (RFC 0006 + 0010)

```prisma
// RFC 0006: basic form
protocol Repository<T> @intent("Persistence contract") {
  fn get(id: UUID!)   -> T?
  fn save(entity: T!) -> void
}

// RFC 0010: multiple inheritance
protocol UserRepository extends Repository<User>, Auditable, Cacheable<User>
  @intent("User-specific repo with audit and cache") {
  fn findByEmail(email: string!) -> User?
}

// RFC 0006: simple union
union OrderStatus = DraftState | ActiveState | ClosedState

// RFC 0010: inline payload variant
union OrderEvent =
  | Created   { orderId: UUID!, customerId: UUID!, at: Timestamp! }
  | Confirmed { orderId: UUID!, at: Timestamp! }
  | Cancelled { orderId: UUID!, reason: string!, at: Timestamp! }

module catalog @intent("Product catalog") {
  model Product @aggregate_root { /* ... */ }
}
```

- `protocol` supports generics (`<T>`) and multi-parent `extends` (RFC 0010).
- `union` variants can be existing model references or inline payload definitions, mixed freely.
- `module` introduces a sub-namespace. References use `<ns>.<module>.<Model>` form.

## 5. Field annotations

### 5.1 Identifiers / references

| Annotation | Purpose |
| --- | --- |
| `@id` | Single-column primary key |
| `@ref(<Target>.<attr>[, onDelete:, onUpdate:, inverse:])` | Foreign reference |
| `@unique` | Single-column uniqueness |
| `@index` | Single-column index |
| `@default(<value>)` | Default value (DB / runtime) |
| `@codegenName("<EnglishName>")` | English name for code generation |

`onDelete` / `onUpdate` accept 4 values: `CASCADE` / `RESTRICT` / `SET_NULL` / `NO_ACTION`.

### 5.2 Constraints

| Annotation | Purpose |
| --- | --- |
| `@maxLength(<n>)` | Maximum string length |
| `@pattern("<regex>")` | Regular-expression constraint |
| `@scale(<n>)` | Decimal precision |

### 5.3 Contracts

| Annotation | Purpose |
| --- | --- |
| `@intent("...")` | Intent for AI generation / review |
| `@inv("<expr>")` | Invariant |
| `@auto` | Auto-generated value |
| `@deprecated("<note>")` | Deprecation marker |

## 6. Relations (`->`)

```
-> <kind> <multiplicity> <role>: <Target>
```

`<kind>` is one of `composition` / `aggregation` / `association` / `inheritance`.  
`<multiplicity>` is one of `1` / `0..1` / `1..*` / `0..*` / `n..m`.

## 7. Methods (`fn`)

```
fn <name>(<arg>: <type>[, ...]) -> <return-type>
  [@pre("<expr>")]
  [@post("<expr>")]
  [@raises(<ExceptionType>)]
  [@intent("...")]
```

Declared inside `model`, `type`, or `protocol` bodies.

## 8. Block directives

| Block | Scope | Purpose |
| --- | --- | --- |
| `@@mode(draft\|strict)` | File | Validation mode |
| `@@theme("<path>")` | File / view | External CSS theme |
| `@@doc("""...""")` | model / view / type | Documentation (Markdown supported, RFC 0031) |
| `@@md("""...""")` | model | Free-form Markdown body (tables, code fences, multi-paragraph — RFC 0031) |
| `@@attachments(<item>, ...)` | model / view | Supplementary material |
| `@@id(<attr>, ...)` | model | Composite primary key |
| `@@unique(<attr>, ...)` | model | Composite uniqueness |
| `@@index(<attr>, ...)` | model | Composite index |
| `@@dependencies(<dep>, ...)` | model | Gantt / WBS predecessors |
| `@@sample(<row>, ...)` | model | Instance data (RFC 0004) |
| `@@implements(<Protocol>[<T>])` | model | Protocol conformance (RFC 0006) |

### `@@dependencies` (cross-namespace, RFC 0005)

```prisma
@@dependencies(TaskA, pm_core.InfraReady)         /* short form, cross-ns ok */
@@dependencies(
  { on: TaskA,          kind: FS, lag: 0 },
  { on: pm_core.Infra,  kind: SS, lag: 2 }        /* full form, cross-ns ok */
)
```

### `@@sample` (RFC 0004 + 0008)

```prisma
model Task @entity {
  +id UUID! @id
  +name string!
  +plannedStart Date!

  // Inline (RFC 0004)
  @@sample(
    { id: "t001", name: "Kickoff",   plannedStart: "2026-04-20" },
    { id: "t002", name: "Discovery", plannedStart: "2026-04-21" }
  )

  // External file (RFC 0008)
  @@sample(from: "./fixtures/tasks.jsonl")
  @@sample(from: "./legacy.csv", format: csv, encoding: "utf-8", limit: 1000)
}
```

Supported external formats: `json`, `jsonl`, `yaml`, `csv`. Inline and external forms may coexist within a model.

### `@@md` — Markdown block (RFC 0031)

Attaches a free-form CommonMark + GFM body to a model. Unlike `@@doc`,
multiple `@@md` blocks may coexist on the same model, and the body
preserves tables / code fences / multi-paragraph layout.

```prisma
model Order @aggregate_root {
  +id     UUID! @id
  +status OrderStatus!

  @@md("""
  ## State transitions

  | from | to |
  | --- | --- |
  | DRAFT | SUBMITTED |
  | SUBMITTED | PAID / CANCELLED |
  """)
}
```

Captured into `model.docs[]` (string array). The first `@@doc` also fills
`model.doc` (string) for backward compat.

### Top-level `@@doc` / `@@md` preceding a declaration (RFC 0035, spec 1.4.0)

Placing `@@doc(...)` / `@@md(...)` immediately before a top-level
declaration (`enum`, `type`, or `model`) attaches the directive content
to that declaration's **`docs[]`**. Spec 1.3 only allowed top-level
directives **before the first declaration**; inserting one between
declarations produced `Expecting EOF`. Spec 1.4 lifts that restriction.

```prisma
namespace messaging

@@doc("Order lifecycle as observed by the warehouse system.")
enum OrderStatus {
  DRAFT, CONFIRMED, SHIPPED, CANCELLED
}

@@md("""
Internal: settlement states are not user-visible.
Used by the finance pipeline only.
""")
enum SettlementStatus {
  PENDING, RECONCILED, WRITTEN_OFF
}
```

- Accumulated directives are attached to the next `enum` / `type` / `model`
  in source order. `EnumSchema`, `TypeDefSchema`, and `ModelSchema` all
  carry a `docs: string[]` field.
- `@@mode(...)` / `@@theme(...)` are file-level regardless of position.
- Trailing `@@doc` at end of file (no following declaration) is silently
  dropped (a future L046 lint may surface this).

## 9. Sequence diagram body

```
participants: <Model> as <alias>, ...

seq {
  <alias1> ->> <alias2> : "<label>"    /* sync */
  <alias2> -.> <alias1> : "<label>"    /* reply */
  <alias1>  -> <alias3> : "<label>"    /* async (fire-and-forget) */

  alt "<cond-A>" {                     /* RFC 0003 */
    <alias1> ->> <alias2> : "..."
  } else "<cond-B>" {
    <alias1> ->> <alias2> : "..."
  } else {                             /* default branch (no condition) */
    <alias1> ->> <alias2> : "..."
  }

  opt "<condition>" {                  /* RFC 0007: single optional */
    <alias1> ->> <alias2> : "..."
  }

  par {                                /* RFC 0007: parallel (2+ branches) */
    branch "<label-P1>" {
      <alias1> ->> <alias2> : "..."
    }
    branch "<label-P2>" {
      <alias1> ->> <alias3> : "..."
    }
  } await("P1", "P2")                  /* RFC 0013: all / ("P1","P2") / all timeout(500ms) */

  loop "<condition>" {
    <alias1> ->> <alias2> : "..."
  }
}
```

Arrows:
- `->>` = synchronous call (sync)
- `-.>` = reply (dashed arrow returning a value)
- `->`  = asynchronous (fire-and-forget)

Message labels **must be string literals** (`"…"`) so they can contain whitespace, slashes and symbols.

### 9.1 critical + timeout + retry + catch + finally (RFC 0017 / 0021 / 0028)

Wrap external API calls or transactions that need failure handling in a `critical` block.

```
seq {
  critical "<label>" timeout(<duration>) retry(<N | config>) on (<alias1>, <alias2>) {
    <alias1> ->> <alias2> : "request"
    <alias2> -.> <alias1> : "200 ok"
  } catch "<catch-label>" {
    <alias1> ->> <metrics> : "track failure"
  } finally {
    <alias1> ->> <metrics> : "track complete"
  }
}
```

- `timeout(<duration>)`: `3s` / `500ms` / `1m` / `1h` (optional)
- `retry(<N>)`: short form, `retry(3)` = attempts=3 with default backoff
- `retry({ attempts: N, backoff: exponential|linear|constant, initial: <dur>, max: <dur>, jitter: true|false })`: long form
- `on (<aliases>)`: explicitly scope the block to specific participants
- `catch "<label>" { ... }`: runs when all attempts fail (optional)
- `finally { ... }`: always runs after the block (optional)
- Nestable — `critical` inside `critical` lets you layer timeouts and retries

### 9.2 Annotation object-literal arguments (RFC 0023 / 0027)

`@deprecated` / `@experimental` and similar annotations accept an object-literal payload.

```
@deprecated({
  message:     "use <NewModel> instead",
  since:       "0.8.0",
  removeIn:    "1.0.0",
  replaceWith: <NewModel>
})

@experimental({
  since:         "0.8.0",
  note:          "async interface may change before stabilization",
  stabilizeIn:   "1.0.0",
  trackingIssue: "umlay/umlay#456"
})
```

Array literals `[ ... ]` are also accepted. Object keys follow the same soft-identifier rule as `fieldNameToken`, so reserved words (`type`, `on`, ...) are allowed as keys.

## 10. View `layout:` (RFC 0002)

```prisma
view order-er @er_diagram {
  include: ordering.*
  layout: direction(LR), engine(elk), spacing(40), align(center)
}
```

| Option | Values |
| --- | --- |
| `direction` | `TB` / `BT` / `LR` / `RL` (default `TB`) |
| `engine` | `elk` / `dagre` / `grid` / `manual` (default `elk`) |
| `hint` | Any string (implementation-specific placement hint) |
| `spacing` | Integer px (default 40) |
| `align` | `start` / `center` / `end` (default `start`) |

## 11. Reference resolution

- Attribute types (`Foo`) resolve against the same namespace first, then other namespaces via `<namespace>.<Name>`.
- In `@ref(X.y)`, `X` is a model name and `y` an attribute name.
- `view include: <namespace>.*` selects every model / type / enum within the namespace.
- `@@dependencies` `on` resolves within the same namespace by default, or with `<namespace>.<Model>` form for cross-namespace.

## 12. Reserved words (spec 0.8.0)

`RESERVED_KEYWORDS` in [`index.ts`](./index.ts) is the source of truth. Using a reserved word as a plain identifier (model / attribute / enum name) is usually a parse error, but several contexts (`fieldNameToken` / `directiveArgToken` / `participantIdent` / `annotationName`) **accept reserved words as soft identifiers** when the grammar is unambiguous (common field-name collisions like `type`, `queue`, `cache`).

| Category | Keywords |
| --- | --- |
| Declarations (core, frozen at 1.0) | `namespace` / `type` / `enum` / `model` / `view` |
| Declarations (RFC 0006, 0.3.0+) | `protocol` / `union` / `module` |
| Declarations (RFC 0016, 0.5.0+) | `impl` / `for` / `where` |
| Methods (RFC 0001+) | `fn` |
| Imports (RFC 0009, 0.3.0+) | `import` / `as` |
| Variance (RFC 0019, 0.6.0+) | `out` / `in` |
| Sequence body (RFCs 0003/0007/0013/0017/0021/0028) | `participants` / `seq` / `alt` / `else` / `opt` / `par` / `branch` / `await` / `loop` / `critical` / `catch` / `finally` / `timeout` / `retry` / `on` |
| React / Next (0.1+, parse-accepted, render TBD) | `component` / `page` / `layout` / `action` / `route` / `context` / `hook` |
| Cloud-native (0.1+, same as above) | `function` / `worker` / `queue` / `topic` / `stream` / `cache` / `store` / `scheduler` / `webhook` / `integration` / `gateway` / `cdn` |

### 12.1 Soft-identifier contexts

The following contexts accept reserved words as identifiers (within the limits of non-ambiguity):

- **Field names** (`fieldNameToken`): `type`, `queue`, `cache`, etc. are valid field names
- **Directive args** (`@@index(userId, type)` etc.): keywords can appear as plain arg values
- **Participant aliases / message endpoints** (`participantIdent`): only cloud / infra keywords (`cache`, `queue`, …); seq-body keywords (`critical`, `opt`, …) are excluded to avoid ambiguity
- **Annotation names** (`@timeout(30s)`, `@retry`, …): seq-body keywords plus `as` / `on` / `participants` are accepted
- **View IDs** (`view seq`, `view critical-flow`, …): same as above

## 12.5 Markdown integration (RFC 0031, spec 1.1.0)

Umlay integrates Markdown across four layers. **All additive** — existing
`.umlay` files keep parsing unchanged.

### Layer A — Markdown inside doc strings

`@intent("...")` / `@@doc("""...""")` / `@review("...")` / `@fix("...")`
strings are rendered as **CommonMark + GFM** by every consumer (LSP hover,
VS Code preview, web editor). Grammar / IR unchanged.

### Layer B — `@@md` directive

See §8. Captured into `model.docs[]` (`string[]`).

### Layer D — Markdown trailer (after `---`)

A standalone `---` line at the end of a `.umlay` file separates the DSL
from a free-form Markdown trailer that is stored verbatim in
`IR.docTrailer?: string`. A `---` inside a triple-quoted string is
ignored (the parser tracks `"""` open/close).

```
namespace shop
model Order @entity { id UUID! @id }

---

# Design notes

- orders are immutable
```

### Layer C — Literate `.umlay.md`

Files ending in `.umlay.md` are Markdown documents whose ` ```umlay `
fenced code blocks are extracted in document order, concatenated, and fed
to `parse()`. Diagnostic line numbers are remapped back to the original
Markdown source.

```markdown
# Auth domain

\`\`\`umlay
namespace auth
model User @entity { id UUID! @id }
\`\`\`

## Views

\`\`\`umlay
view er @er_diagram { include: auth.* }
\`\`\`
```

Reference implementation API: `parseLiterate(source)` in `@umlay/core`.

## 12.6 View Selectors (RFC 0032, spec 1.2.0)

`view`'s `include:` / `exclude:` accept **selectors** beyond bare model
patterns. The grammar is defined in [`grammar.bnf`](./grammar.bnf) under
`SelectorList`. Phase 1 + Phase 2 kinds:

| Selector | Matches | Example |
| --- | --- | --- |
| `ns.Model` / `ns.*` / `**` | model name pattern (legacy) | `auth.*` |
| `**.attr` | attribute name across every model | `**.passwordHash` |
| `visibility:X` | attribute visibility (`public` / `private` / `protected` / `package`) | `visibility:private` |
| `seq:X` | sequence body kind (`critical` / `opt` / `alt` / `par` / `loop` / `catch` / `finally` / `retry` / `timeout` / `message` / `await`) | `seq:critical` |
| `stereotype:X` | model stereotype (`entity` / `aggregate_root` / `value_object` / `service` / `interface`) | `stereotype:value_object` |
| `kind:X` | relation kind (`composition` / `aggregation` / `association` / `dependency` / `inheritance` / `realization`) | `kind:dependency` |

See RFC 0032 §Semantics. Unknown kinds (`foo:bar`) trigger lint L034
(warning), zero-match excludes trigger L035 (info), and redundant
visibility excludes trigger L036 (info).

## 13. Open issues (tracked in RFCs)

As of spec 0.8.0, all accepted RFCs (0001–0030) are reflected in the implementation. The following items remain open toward spec 1.0 RC:

| Item | RFC / Issue |
| --- | --- |
| Full PMBOK `@@dependencies` kinds (SS / FF / SF + `lag`) | 0024 follow-up |
| `@@sample` glob imports / secret detection | 0008 follow-up |
| L014 / L015 (`@default` type coherence, cascade cycles) promoted to error in strict mode | 0029 follow-up |
| IR `_id` hash algorithm freeze + migration tooling | 0026 / migration-guide-1.0.md |
| How far the soft-identifier rule on the implementation side should extend (spec alignment) | Not filed |

## References

- [Formal grammar (W3C EBNF)](./grammar.bnf) — machine-readable source of truth
- [Normalized IR JSON Schema](./ir.schema.json)
- [Version constants / reserved keywords](./index.ts)
- [RFCs](./rfcs/README.md) — 30 accepted (0001-0030) + 1.0 RC follow-ups
- [Conformance manifest](./conformance/README.md)
- [Sample DSL files](../../examples/samples/)
- [Skills](../../../skills/)
- [Japanese version (正本)](./grammar.md)
