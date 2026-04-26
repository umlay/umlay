---
name: codegen-mapping
version: 1.5.0
spec: "@umlay/spec >= 1.5.0 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, codegen-author, tool-author]
summary: Deterministic mapping rules from Umlay normalized IR to Prisma / SQL DDL / TypeScript types
description: Use when the user asks to convert Umlay IR into Prisma schema, SQL DDL, or TypeScript types, or wants to inspect the deterministic mapping rules (type mapping, nullability, relation → FK, etc.).
references:
  grammar: ../../../packages/spec/src/grammar.md
  schema: ../../../packages/spec/src/ir.schema.json
  keywords: ../../../packages/spec/src/index.ts
---

# codegen-mapping

## Goal

Provide a mapping ruleset that **deterministically** (no LLM) transforms IR 1.0-conformant JSON (or a parsed `.umlay`) into these three targets:

- Prisma schema (`schema.prisma`)
- PostgreSQL DDL (`CREATE TABLE`)
- TypeScript type definitions (`type` / `interface`)

## Preconditions

- Input: IR JSON conforming to schema `https://umlay.dev/schemas/ir-1.0.json`
- Required: `version === "1.0"`, `kind === "UmlModel"`
- Scope: **type / column / reference skeletons only**. Method bodies and business logic are out of scope.

## Determinism contract

- Same IR in → identical output (whitespace and order preserved)
- Output order matches IR traversal (namespace → model → attribute → relation, ascending)
- No LLM involved

## 1. Base type mapping

| Umlay type | Prisma | PostgreSQL | TypeScript |
| --- | --- | --- | --- |
| `string` | `String` | `text` | `string` |
| `string @maxLength(n)` | `String @db.VarChar(n)` | `varchar(n)` | `string` |
| `int` | `Int` | `integer` | `number` |
| `bigint` | `BigInt` | `bigint` | `bigint` |
| `decimal` | `Decimal` | `numeric` | `Prisma.Decimal` / `string` |
| `decimal @scale(s)` | `Decimal @db.Decimal(p, s)` | `numeric(p, s)` | `Prisma.Decimal` |
| `bool` | `Boolean` | `boolean` | `boolean` |
| `UUID` | `String @db.Uuid` | `uuid` | `string` |
| `Timestamp` | `DateTime` | `timestamptz` | `Date` |
| `Date` | `DateTime @db.Date` | `date` | `Date` |
| `enum E` | `E` (generated) | user-defined enum or text + CHECK | `E` (union type) |
| `type T @value_object` | embedded (Prisma 6+) / flattened | composite type / flattened | `T` (interface) |
| Unknown type | error / `Json` fallback | `jsonb` | `unknown` |

## 2. Nullability

| IR | Prisma | PostgreSQL | TypeScript |
| --- | --- | --- | --- |
| `nullable: false` | `Foo` | `NOT NULL` | `foo: T` |
| `nullable: "null"` | `Foo?` | (omit) | `foo: T \| null` |
| `nullable: "undefined"` | `Foo?` + `@default(dbgenerated())` | (omit) | `foo?: T` |

## 3. Primary key

### Single PK

IR:

```jsonc
"attributes": [
  { "_id": "...", "name": "id", "type": "UUID", "pk": true, "nullable": false }
]
```

Output:

- Prisma: `id String @id @db.Uuid`
- SQL: `id uuid PRIMARY KEY NOT NULL`
- TS: `id: string`

### Composite PK

IR:

```jsonc
"identity": ["orderId", "lineNo"]
```

Output:

- Prisma: `@@id([orderId, lineNo])`
- SQL: `PRIMARY KEY (order_id, line_no)`
- TS: No separate PK type; emit the whole shape as a `type`

## 4. Foreign references (`ref`)

IR:

```jsonc
{
  "name": "customerId",
  "type": "UUID",
  "ref": {
    "target": "customer.Customer.id",
    "onDelete": "RESTRICT",
    "onUpdate": "CASCADE",
    "inverse": "orders"
  }
}
```

### Prisma

```prisma
customerId String   @db.Uuid
customer   Customer @relation(fields: [customerId], references: [id], onDelete: Restrict, onUpdate: Cascade)
```

On the Customer side (inverse):

```prisma
orders Order[]
```

### PostgreSQL

```sql
customer_id uuid NOT NULL REFERENCES customer(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE
```

### TypeScript

```ts
customerId: string;
// Inverse is expressed via a separate relation object
```

### onDelete / onUpdate mapping

| IR | Prisma | SQL |
| --- | --- | --- |
| `CASCADE` | `Cascade` | `CASCADE` |
| `RESTRICT` | `Restrict` | `RESTRICT` |
| `SET_NULL` | `SetNull` | `SET NULL` |
| `NO_ACTION` | `NoAction` | `NO ACTION` |

## 5. Unique / Index

| IR | Prisma | SQL |
| --- | --- | --- |
| `"unique": true` (single) | `@unique` | `UNIQUE` |
| Composite unique | `@@unique([a, b])` | `UNIQUE (a, b)` |
| `"index": true` (single) | `@@index([a])` | `CREATE INDEX ... (a)` |
| Composite index | `@@index([a, b])` | `CREATE INDEX ... (a, b)` |

## 6. Enum

IR:

```jsonc
"enums": {
  "OrderStatus": { "values": ["DRAFT", "CONFIRMED", "SHIPPED", "CANCELLED"] }
}
```

### Prisma

```prisma
enum OrderStatus {
  DRAFT
  CONFIRMED
  SHIPPED
  CANCELLED
}
```

### PostgreSQL

```sql
CREATE TYPE order_status AS ENUM ('DRAFT', 'CONFIRMED', 'SHIPPED', 'CANCELLED');
```

### TypeScript

```ts
export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'SHIPPED' | 'CANCELLED';
```

## 7. Value object (`type @value_object`)

Two strategies; **be consistent per model**.

### Strategy A: Flatten

`Money { amount, currency }` → `order_total_amount`, `order_total_currency`. Safe across SQL / Prisma.

### Strategy B: Embedded / composite

- Prisma: composite type (v6+) or JSON column
- PostgreSQL: composite type
- TS: `interface Money { amount: Decimal; currency: string }`

## 8. Stereotypes

| Stereotype | Baseline policy |
| --- | --- |
| `@aggregate_root` | Its own table, its own repository |
| `@entity` | Its own table; PK is either native or composite with parent FK |
| `@value_object` | Embedded or flattened (§7) |
| `@service` | Not emitted in DDL (emit elsewhere as a function / class) |
| `@interface` | Not emitted in DDL (emit only as a TS interface) |

## 9. Naming conversion

- If IR identifiers are not `snake_case`, convert to `snake_case` for SQL
- `@codegenName("Foo")` wins — use the English name for stability
- Non-Latin identifiers require `@codegenName`; otherwise emit an error

## 10. `@@dependencies` (Gantt / WBS metadata)

IR `model.dependencies[]` is **metadata for Gantt / WBS rendering**. It is **not** emitted to DDL by default. Consumers may transform it as follows.

### Prisma

Usually **not emitted** (not used at runtime). If needed, hand-author a join table:

```prisma
model TaskDependency {
  fromId String
  toId   String
  kind   String @default("FS")
  lag    Int    @default(0)
  from   Task   @relation("deps_from", fields: [fromId], references: [id])
  to     Task   @relation("deps_to",   fields: [toId],   references: [id])
  @@id([fromId, toId])
}
```

### PostgreSQL

Hand-author a join table (`task_dependency`) as above.

### TypeScript

Emit dependency list types for Gantt runtime:

```ts
export interface TaskDependency {
  on:   string;  // predecessor model name
  kind: 'FS' | 'SS' | 'FF' | 'SF';
  lag:  number;
}
export interface TaskWithDependencies<T> extends T {
  dependencies: TaskDependency[];
}
```

## 11. Views

- Visual views (`er_diagram`, `class_diagram`, etc.) are **not DDL targets**
- `package_diagram` / `deployment_diagram` hint at module structure but are ignored in codegen
- A future `materialized_view` kind would emit SQL `CREATE VIEW`; not defined in 1.0

## 12. Errors / unsupported

The generator **must reject** the following:

| Condition | Reason |
| --- | --- |
| `version` !== `"1.0"` | This skill targets 1.0 only |
| Stereotype outside the spec enum | Anything other than `entity / aggregate_root / value_object / service / interface` |
| Undefined `type` not in the known list | Mapping is indeterminate |
| No PK (no identity) | Cannot create a table |
| Unresolved `@ref` | Cannot create the FK |
| Non-Latin identifier without `@codegenName` | Unsafe as a SQL column name |

## 13. Minimal example

IR input:

```jsonc
{
  "version": "1.0",
  "kind": "UmlModel",
  "namespaces": {
    "ordering": {
      "models": {
        "Order": {
          "_id": "sha1:ordering.Order",
          "name": "Order",
          "stereotype": "aggregate_root",
          "identity": ["id"],
          "attributes": [
            { "_id": "...", "name": "id", "type": "UUID", "pk": true, "nullable": false },
            { "_id": "...", "name": "total", "type": "decimal", "nullable": false }
          ]
        }
      }
    }
  },
  "views": []
}
```

Prisma output:

```prisma
model Order {
  id    String  @id @db.Uuid
  total Decimal
}
```

SQL output:

```sql
CREATE TABLE ordering.order (
  id    uuid    PRIMARY KEY NOT NULL,
  total numeric NOT NULL
);
```

TypeScript output:

```ts
export interface Order {
  id: string;
  total: Prisma.Decimal;
}
```

## Checklist

- [ ] Validated IR `version` and `kind`
- [ ] Every `type` maps to the base type table
- [ ] Every `@ref` target resolves inside the IR
- [ ] Every model has `identity` or a `pk: true` attribute
- [ ] Non-Latin identifiers carry `@codegenName`
- [ ] `@service` / `@interface` skipped from DDL output
- [ ] Output order matches IR traversal (deterministic)

## spec 1.3 additions → target mapping

| IR field | Prisma | SQL DDL | TypeScript | Notes |
| --- | --- | --- | --- | --- |
| `model.abstract: true` | Emit interface / parent type only; mark with `@@ignore` if a row table would otherwise be produced | Skip physical table | `abstract class` | Concrete bindings flow via `@@implements` |
| `attribute.static: true` | N/A (not a row column) | N/A | `static readonly` property | Class constant |
| `attribute.readonly: true` | `readonly` in the generated model type | No DB-level readonly (enforce in app layer) | `readonly` property | No post-construction writes |
| `attribute.derived: true` | Skip column | Skip column | Emit a getter (`get name() { … }`) | Computed value, not persisted |
| `model.typeParams` (generic) | Skip (no DB mapping) | Skip | `class User<T>` / `interface Repository<T>` | |
| `namespace.traits` | Emit only the expanded models (traits themselves are ignored) | Same | Same | Parse-time expansion is transparent to downstream |
| `view.composition` | Not applicable (rendering only) | N/A | N/A | |
| Backtick idents (`` `limit` ``) | `@map("limit")` to quote the column | `"limit"` (PG) / `` `limit` `` (MySQL) | Use as-is for the property name | Dialect-specific quoting |

## References

- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- Grammar: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- Related skills: [`write-uml`](./write-uml.md), [`evolve-schema`](./evolve-schema.md)
