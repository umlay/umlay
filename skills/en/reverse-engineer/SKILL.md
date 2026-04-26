---
name: reverse-engineer
version: 1.6.0
spec: "@umlay/spec >= 1.6.0 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, developer, architect]
summary: Produce a spec-conformant Umlay DSL (.umlay) from an existing Prisma schema / SQL DDL / TypeScript type source
description: Use when the user wants to import an existing codebase — Prisma `schema.prisma`, PostgreSQL / MySQL DDL, or TypeScript `class` / `interface` / `type` declarations — into Umlay, so the rest of the pipeline (review-uml, evolve-schema, codegen-mapping) can operate on it.
references:
  grammar: ../../../packages/spec/src/grammar.md
  schema: ../../../packages/spec/src/ir.schema.json
  keywords: ../../../packages/spec/src/index.ts
---

# reverse-engineer

## Goal

Given an existing **source-of-truth schema** — not a hand-authored `.umlay` — produce an Umlay DSL file that:

1. Parses cleanly under `@umlay/core` (no S-level violations)
2. Preserves the **shape and integrity** of the input (models, attributes, PKs, FKs, uniques, enums)
3. Leaves **design-quality judgment** (stereotypes, bounded contexts, intent) as `TODO` comments rather than guessing silently

This closes the round-trip: forward lives in `codegen-mapping`; this skill is the inverse. Once an `.umlay` exists, hand it off to `review-uml` for quality audit and `evolve-schema` for subsequent changes.

## Preconditions

| Item | Content |
| --- | --- |
| Input | Prisma `schema.prisma`, PostgreSQL / MySQL DDL (`CREATE TABLE`), or TypeScript `class` / `interface` / `type` declarations |
| Output | `.umlay` text (UTF-8) conforming to DSL 1.0 — parser must accept it |
| Out-of-scope | Method bodies, middleware, migrations, business logic — only the **structural skeleton** |

## Determinism contract

- Same input → identical output (model order follows input order; attributes follow declaration order)
- **Never invent** attributes, stereotypes, or relations that are not present in the input. When a choice is ambiguous, emit a `@@doc` comment noting the ambiguity and the safe default chosen
- No LLM required for the structural part. LLMs may **post-process** intent / stereotype hints, but the structural DSL must come from a deterministic walk

## 1. Base type mapping (inverse of codegen-mapping §1)

### From Prisma

| Prisma | Umlay |
| --- | --- |
| `String` | `string` |
| `String @db.VarChar(n)` | `string @maxLength(n)` |
| `Int` | `int` |
| `BigInt` | `bigint` |
| `Decimal` / `Decimal @db.Decimal(p, s)` | `decimal` / `decimal @scale(s)` |
| `Boolean` | `bool` |
| `String @db.Uuid` | `UUID` |
| `DateTime` | `Timestamp` |
| `DateTime @db.Date` | `Date` |
| `Json` | `Json` (reserved type; note unknown shape) |
| Enum ref `OrderStatus` | `OrderStatus` (+ emit `enum OrderStatus { ... }` once per namespace) |
| Composite type (Prisma 6+) | `type X @value_object { ... }` |

### From PostgreSQL DDL

| SQL | Umlay |
| --- | --- |
| `text` / `varchar` | `string` |
| `varchar(n)` | `string @maxLength(n)` |
| `integer` / `int4` | `int` |
| `bigint` / `int8` | `bigint` |
| `numeric(p, s)` | `decimal @scale(s)` |
| `boolean` | `bool` |
| `uuid` | `UUID` |
| `timestamptz` / `timestamp with time zone` | `Timestamp` |
| `date` | `Date` |
| `jsonb` / `json` | `Json` |
| `CREATE TYPE foo AS ENUM (...)` | `enum Foo { ... }` |

### From TypeScript

| TS | Umlay |
| --- | --- |
| `string` | `string` |
| `number` | `int` (lossy — flag for review) |
| `bigint` | `bigint` |
| `boolean` | `bool` |
| `Date` | `Timestamp` (emit `@@doc` noting `Date` vs `Timestamp` ambiguity) |
| Literal union `'A' \| 'B'` | `enum X { A, B }` (name by attribute name in PascalCase) |
| `T \| null` | nullable attribute |
| `T \| undefined` / optional `foo?:` | nullable attribute |
| `unknown` / `any` | emit as `Json` + `@@doc("was any/unknown — revisit")` |

## 2. Nullability

| Input | Umlay |
| --- | --- |
| `String` (Prisma) / `NOT NULL` (SQL) / `foo: T` (TS) | `name: Type!` |
| `String?` (Prisma) / column without `NOT NULL` (SQL) / `foo: T \| null` (TS) | `name: Type?` |
| `String? @default(dbgenerated())` / `foo?: T` (TS) | `name: Type?` |

Umlay's `!` = non-null; `?` = nullable. Emit `!` whenever the source is definitively non-null.

## 3. Primary key

- Single PK (`@id` / `PRIMARY KEY`) → `@id` on that attribute.
- Composite PK (`@@id([a, b])` / `PRIMARY KEY (a, b)`) → `identity: [a, b]` directive on the model (`@@identity(a, b)`).
- No PK detected → emit the model with a **`@@doc("TODO: no PK detected in source")`** and **flag for review** rather than synthesising one.

## 4. Foreign references (FK)

### Prisma

```prisma
customerId String   @db.Uuid
customer   Customer @relation(fields: [customerId], references: [id], onDelete: Restrict)
```

→

```umlay
customerId UUID! @ref(Customer.id, onDelete: RESTRICT)
```

Drop the explicit relation object — Umlay folds it into the scalar attribute.

### SQL

```sql
customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE RESTRICT
```

→

```umlay
customerId UUID! @ref(Customer.id, onDelete: RESTRICT)
```

Convert `snake_case` to `camelCase` for the attribute name, but **add `@codegenName("customer_id")`** so a later codegen round-trip maps back exactly.

### TypeScript

TS rarely encodes FK intent at the type level. Heuristic: an attribute named `xxxId: string` where `Xxx` exists as another exported `interface` / `class` → emit `@ref(Xxx.id)` with an `@@doc("inferred from name — please confirm")` note.

### onDelete / onUpdate mapping

| Prisma | SQL | Umlay |
| --- | --- | --- |
| `Cascade` | `CASCADE` | `CASCADE` |
| `Restrict` | `RESTRICT` | `RESTRICT` |
| `SetNull` | `SET NULL` | `SET_NULL` |
| `NoAction` | `NO ACTION` | `NO_ACTION` |

## 5. Unique / Index

| Input | Umlay |
| --- | --- |
| Attribute-level `@unique` / `UNIQUE` | `@unique` on attribute |
| `@@unique([a, b])` / `UNIQUE (a, b)` | `@@unique(a, b)` on model |
| `@@index([a])` / `CREATE INDEX` | `@@index(a)` on model |

## 6. Enum

Emit once per referenced enum, **inside the first namespace that uses it** (or at file top if namespaceless):

```umlay
enum OrderStatus {
  DRAFT
  CONFIRMED
  SHIPPED
  CANCELLED
}
```

Preserve source order.

### Attaching docs to an enum / type (spec 1.4+ / RFC 0035)

When the source has comments documenting an enum or type, emit `@@doc(...)`
/ `@@md(...)` **immediately preceding the declaration**. As of spec 1.4
the parser accepts directives interleaved with declarations and the IR
attaches them to `enum.docs[]` / `type.docs[]` (same mechanism as Model).

```umlay
@@doc("TS source: lowercase of enum value")
enum OrderStatus { DRAFT, CONFIRMED, SHIPPED, CANCELLED }

@@md("""
Internal settlement enum.
Not user-visible.
""")
enum SettlementStatus { PENDING, RECONCILED, WRITTEN_OFF }
```

⚠️ If output may be fed to a spec ≤ 1.3 parser, demote per-enum `@@doc`
to a regular `// comment` — pre-1.4 parsers reject it with `Expecting EOF`.

## 7. Stereotype inference (heuristic — safe defaults, flag for review)

**Never guess `@aggregate_root` without evidence.** The reverse-engineer is structural; design intent comes from `review-uml` / humans.

| Heuristic | Suggested stereotype | Confidence |
| --- | --- | --- |
| Model has `@id` + at least one FK pointing inward | `@entity` (safe default) | medium |
| Model has `@id` and is **referenced** by N≥2 other models but references **none** outward | `@aggregate_root` candidate | low — emit `@@doc("candidate @aggregate_root — confirm")` |
| Model has no `@id` and is embedded via composite type / JSON column | `@value_object` | high |
| Name ends in `Service` / `Handler` / `Controller` (TS only) | `@service` | medium (flag) |
| Interface without fields, or abstract class with only abstract methods | `@interface` | high (TS); medium (Prisma — unused) |

**Default when nothing fires**: `@entity`. Record the decision as a trailing `@@doc` comment so review-uml can pick it up.

## 8. Namespace inference

| Input | Strategy |
| --- | --- |
| Prisma `schema.prisma` with `schemas = ["auth", "billing"]` + `@@schema("auth")` | One Umlay `namespace auth { ... }` per schema |
| SQL DDL with `CREATE SCHEMA` + schema-qualified tables | Same — one namespace per schema |
| Single-schema Prisma / SQL | Single namespace named after the database / service (lowercase) |
| TypeScript files in `src/features/auth/...` | Namespace = folder name (`auth`) |

When nothing is available, emit a single `namespace default { ... }` block and record the decision as a top-of-file `@@doc`.

## 9. Naming conversion

- Keep the source name verbatim in `@codegenName("...")` if it differs from what Umlay emits
- Convert `snake_case` (SQL) → `camelCase` (Umlay) for attributes, `PascalCase` for model names
- If the source has CJK or non-Latin identifiers, **preserve them** as the Umlay identifier (Umlay allows Unicode) and add `@codegenName("english_fallback")` so codegen-mapping stays safe
- Reserved-word columns (`limit`, `from`, `type`) → use backtick quoting: `` `limit`: int! ``

## 10. Comments / documentation carry-over

| Source | Umlay target |
| --- | --- |
| Prisma `/// triple-slash` on model | Preceding `@@md ("""..."""")` |
| Prisma `/// triple-slash` on attribute | Inline `@@doc("...")` |
| SQL `COMMENT ON TABLE / COLUMN` | `@@md` / `@@doc` respectively |
| TS JSDoc `@param` / leading block comment | `@@md` on model, `@@doc` on attribute |

## 11. What to **not** emit

Do not invent any of the following — the input does not contain them:

- `@@inv` / `@@pre` / `@@post` (invariants — design decisions)
- `@@sample(from: ...)` (attachments — test data)
- `view ... @er_diagram { include: ... }` — leave view authorship to humans or `write-uml`
- `rationale.intent` — explicit design intent, not inferable from shape
- `@abstract` — unless the TS class is `abstract` or the Prisma model is `@@ignore`d

Emit a **`TODO` block** at file top listing what the reviewer must add:

```umlay
// --- imported by reverse-engineer (from schema.prisma @ 2026-04-24) ---
// TODO(review-uml): verify stereotypes (marked with `confirm` in @@doc)
// TODO(write-uml):  add a view (@er_diagram / @class_diagram) for each audience
// TODO(architect):  add @@inv / @@pre / @@post where business rules apply
// TODO(architect):  fill rationale.intent on each aggregate_root
```

## 12. Procedure

### Step 1 — detect source type
Prisma (`datasource db` block or `model X { ... }` form) / SQL (`CREATE TABLE`) / TypeScript (AST — `class` / `interface` / `type` declarations).

### Step 2 — parse structure only
Use a deterministic parser (`@prisma/internals` for Prisma; `pgsql-parser` or equivalent for SQL; `ts-morph` / TypeScript compiler API for TS). Do **not** evaluate expressions or run migrations.

### Step 3 — build the IR skeleton
Namespace → models → attributes → relations. Attach `@codegenName` whenever the source uses a name Umlay would normalise.

### Step 4 — apply heuristic stereotypes (§7) + document uncertainty
Every low-confidence stereotype → `@@doc("candidate @X — confirm")`. Never silently upgrade `@entity` → `@aggregate_root`.

### Step 5 — emit DSL with TODO header (§11)
The file must start with the TODO block so the human reviewer sees the assumptions before reading models.

### Step 6 — hand off
Run (or ask the user to run) `review-uml` on the output. Typical first-pass findings will be: L-rule missing documentation, R04 (no `@@inv` on aggregate_root candidates), W-rules for suspicious naming.

## Checklist

- [ ] Input source type detected (Prisma / SQL / TypeScript)
- [ ] Namespace inferred and documented (§8)
- [ ] Every source attribute has a corresponding Umlay attribute (no drops)
- [ ] PK / composite PK correctly mapped to `@id` / `@@identity`
- [ ] Every FK mapped to `@ref(...)` with matching `onDelete` / `onUpdate`
- [ ] Unique / index preserved
- [ ] Enums emitted once, values in source order
- [ ] Stereotype per §7 with `@@doc` for low-confidence picks
- [ ] `@codegenName` attached when Umlay identifier differs from source
- [ ] Reserved-word columns escaped with backticks
- [ ] TODO header present at file top (§11)
- [ ] Output parses via `@umlay/core` without errors (verify or instruct the user to verify)

## Example — Prisma → Umlay

Input `schema.prisma`:

```prisma
enum OrderStatus { DRAFT CONFIRMED SHIPPED CANCELLED }

model Customer {
  id        String  @id @db.Uuid
  email     String  @unique
  createdAt DateTime @default(now())
  orders    Order[]
}

model Order {
  id         String      @id @db.Uuid
  customerId String      @db.Uuid
  status     OrderStatus @default(DRAFT)
  total      Decimal     @db.Decimal(18, 2)
  customer   Customer    @relation(fields: [customerId], references: [id], onDelete: Restrict)
  @@index([customerId])
}
```

Output `.umlay` (first pass):

```umlay
// --- imported by reverse-engineer (from schema.prisma @ 2026-04-24) ---
// TODO(review-uml): verify stereotypes marked `confirm`
// TODO(write-uml):  add an @er_diagram view for each audience
// TODO(architect):  add @@inv where business rules apply
// TODO(architect):  fill rationale.intent on aggregate_root candidates

namespace ordering

enum OrderStatus {
  DRAFT
  CONFIRMED
  SHIPPED
  CANCELLED
}

model Customer @aggregate_root {
  // @@doc("candidate @aggregate_root — referenced by Order, no outward FK. confirm.")
  id        UUID!     @id
  email     string!   @unique
  createdAt Timestamp!
}

model Order @entity {
  id         UUID!        @id
  customerId UUID!        @ref(Customer.id, onDelete: RESTRICT)
  status     OrderStatus!
  total      decimal!     @scale(2)
  @@index(customerId)
}
```

## Example — SQL → Umlay (excerpt)

Input:

```sql
CREATE TABLE public.user (
  id          uuid          PRIMARY KEY,
  email       varchar(255)  NOT NULL UNIQUE,
  "limit"     integer       NOT NULL DEFAULT 0,
  created_at  timestamptz   NOT NULL DEFAULT now()
);
```

Output:

```umlay
namespace public

model User @entity {
  id        UUID!             @id
  email     string! @maxLength(255) @unique
  `limit`   int!              @default(0)
  createdAt Timestamp!        @codegenName("created_at")
}
```

Note the backtick-quoted reserved word and the `@codegenName` preserving the snake_case column.

## spec 1.3 notes

- Source uses Prisma 5+ composite types → emit `type X @value_object { ... }` inside the namespace
- Source has Prisma `@@ignore`d models → emit `@abstract` on the Umlay model
- Source has generics (`class Repository<T> { ... }` in TS) → capture as `Repository<T>` — spec 1.3 grammar accepts generic type parameters
- Keep traits (`trait X { ... }`) out of the first pass. They're a **refactoring target** after import, not an import output — mention it in the TODO header so `evolve-schema` can collapse repeated attribute sets later

## References

- Grammar: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- Reserved words: [`packages/spec/src/index.ts`](../../packages/spec/src/index.ts)
- Inverse skill: [`codegen-mapping`](./codegen-mapping.md) (forward direction)
- Next-step skills: [`review-uml`](./review-uml.md), [`write-uml`](./write-uml.md), [`evolve-schema`](./evolve-schema.md)
