---
name: codegen-mapping
version: 1.6.1
spec: "@umlay/spec >= 1.6.1 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, codegen-author, tool-author]
summary: Umlay 正規IR を Prisma / SQL DDL / TypeScript 型へ決定論的にマッピングする規則
description: Umlay IR を Prisma schema / SQL DDL / TypeScript 型に変換したい、もしくは変換規則 (型マッピング、NULL 取扱、リレーション → FK 等) を確認したいときに起動する。
references:
  grammar: ../../../packages/spec/src/grammar.md
  schema: ../../../packages/spec/src/ir.schema.json
  keywords: ../../../packages/spec/src/index.ts
---

# codegen-mapping

## ゴール

IR 1.0 に準拠した JSON (または `.umlay` をパースした結果) から、以下の 3 ターゲットに**決定論的** (LLM 不使用) な変換を行うためのマッピング規則を提供する。

- Prisma schema (`schema.prisma`)
- PostgreSQL DDL (`CREATE TABLE`)
- TypeScript 型定義 (`type` / `interface`)

## 前提

- 入力: IR JSON (Schema `https://umlay.dev/schemas/ir-1.0.json` 準拠)
- 必須パス: `version` === `"1.0"`, `kind` === `"UmlModel"`
- 本 skill は **型・列・参照の骨格**のみを対象とする。メソッド本体や業務ロジックは対象外。

## 決定論の条件

- 同じ IR を入れたら同じ出力 (空白・順序まで)
- 出力順は IR の走査順と一致する (namespace → model → attribute → relation の昇順)
- LLM を含まない

## 1. 共通型マッピング

| Umlay 型 | Prisma | PostgreSQL | TypeScript |
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
| `enum E` | `E` (生成される enum) | user-defined enum または text + CHECK | `E` (生成される union) |
| `type T @value_object` | 埋込 (Prisma 6+) / 分解列 | composite type / 分解列 | `T` (生成される interface) |
| 未知型 | エラー / `Json` フォールバック | `jsonb` | `unknown` |

## 2. Nullability

| IR | Prisma | PostgreSQL | TypeScript |
| --- | --- | --- | --- |
| `nullable: false` | `Foo` | `NOT NULL` | `foo: T` |
| `nullable: "null"` | `Foo?` | (省略) | `foo: T \| null` |
| `nullable: "undefined"` | `Foo?` + `@default(dbgenerated())` 等 | (省略) | `foo?: T` |

## 3. 主キー

### 単一 PK

IR:

```jsonc
"attributes": [
  { "_id": "...", "name": "id", "type": "UUID", "pk": true, "nullable": false }
]
```

出力:

- Prisma: `id String @id @db.Uuid`
- SQL: `id uuid PRIMARY KEY NOT NULL`
- TS: `id: string`

### 複合 PK

IR:

```jsonc
"identity": ["orderId", "lineNo"]
```

出力:

- Prisma: `@@id([orderId, lineNo])`
- SQL: `PRIMARY KEY (order_id, line_no)`
- TS: PK 単体の型分離は行わない (全体を `type` として生成)

## 4. 外部参照 (`ref`)

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

Customer 側 (inverse):

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
// inverse は relation オブジェクトで別途表現
```

### onDelete / onUpdate 対応表

| IR | Prisma | SQL |
| --- | --- | --- |
| `CASCADE` | `Cascade` | `CASCADE` |
| `RESTRICT` | `Restrict` | `RESTRICT` |
| `SET_NULL` | `SetNull` | `SET NULL` |
| `NO_ACTION` | `NoAction` | `NO ACTION` |

## 5. Unique / Index

| IR | Prisma | SQL |
| --- | --- | --- |
| `"unique": true` (単一) | `@unique` | `UNIQUE` |
| 複合 unique | `@@unique([a, b])` | `UNIQUE (a, b)` |
| `"index": true` (単一) | `@@index([a])` | `CREATE INDEX ... (a)` |
| 複合 index | `@@index([a, b])` | `CREATE INDEX ... (a, b)` |

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

## 7. Value Object (`type @value_object`)

選べる戦略は 2 つ。**モデル単位で一貫**させること。

### 戦略 A: 分解列 (flatten)

`Money { amount, currency }` を `order_total_amount`, `order_total_currency` として列展開する。SQL / Prisma 共に安全。

### 戦略 B: 埋込 (composite / embedded)

- Prisma: composite type (v6+) または JSON 列
- PostgreSQL: composite type
- TS: `interface Money { amount: Decimal; currency: string }`

## 8. Stereotype の扱い

| stereotype | 基本方針 |
| --- | --- |
| `@aggregate_root` | 独立テーブル、独立 repository |
| `@entity` | 独立テーブル、PK は独自または親の FK 複合キー |
| `@value_object` | 埋込または分解列 (§7) |
| `@service` | DDL 対象外 (関数 / クラスとして別レイヤで生成) |
| `@interface` | DDL 対象外 (TS interface のみ) |

## 9. 命名変換

- IR の識別子が **snake_case でない** 場合、SQL ターゲットでは `snake_case` に変換する
- `@codegenName("Foo")` がある場合、それを優先する (英名確定のため)
- 日本語識別子は `@codegenName` 必須 (未指定なら error)

## 10. `@@dependencies` (Gantt / WBS メタデータ)

IR `model.dependencies[]` は **Gantt / WBS 描画のためのメタデータ**。DDL には既定で反映しない。必要に応じて消費側が以下に変換する。

### Prisma

通常は **変換しない** (ランタイムに利用しないため)。必要なら join table を手動で用意:

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

同じく join table (`task_dependency`) を手動で作成。

### TypeScript

Gantt ランタイム用に dependency list を型として生成:

```ts
export interface TaskDependency {
  on:   string;  // 先行 model 名
  kind: 'FS' | 'SS' | 'FF' | 'SF';
  lag:  number;
}
export interface TaskWithDependencies<T> extends T {
  dependencies: TaskDependency[];
}
```

## 11. View の扱い

- `er_diagram` / `class_diagram` 等の描画系 view は **DDL 対象外**
- `package_diagram` / `deployment_diagram` はモジュール構造のヒントに使うが、コード生成では無視
- 将来的に `materialized_view` kind が追加された場合に限り、DDL の `CREATE VIEW` を出力する (現行 1.0 では未定義)

## 12. 非対応・エラー条件

以下は codegen 側が **error として reject** する:

| 条件 | 理由 |
| --- | --- |
| `version` !== `"1.0"` | 本 skill は 1.0 のみ対象 |
| ステレオタイプが spec enum 外 | `entity / aggregate_root / value_object / service / interface` 以外 |
| `type` が未定義かつ既知型リストにない | マッピングが決まらない |
| PK が 0 個 (identity なし) | テーブルが作れない |
| 未解決 `@ref` | FK が貼れない |
| 日本語識別子かつ `@codegenName` なし | SQL 列名として不安全 |

## 13. 出力例 (最小)

IR 入力:

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

Prisma 出力:

```prisma
model Order {
  id    String  @id @db.Uuid
  total Decimal
}
```

SQL 出力:

```sql
CREATE TABLE ordering.order (
  id    uuid    PRIMARY KEY NOT NULL,
  total numeric NOT NULL
);
```

TypeScript 出力:

```ts
export interface Order {
  id: string;
  total: Prisma.Decimal;
}
```

## チェックリスト

- [ ] IR `version` と `kind` を検証した
- [ ] すべての `type` が型マッピング表に存在する
- [ ] すべての `@ref` の target が IR 内で解決できる
- [ ] 全 model に `identity` または `pk: true` 属性がある
- [ ] 日本語識別子に `@codegenName` がある
- [ ] `@service` / `@interface` は DDL 生成からスキップされる
- [ ] 出力順序が IR の走査順に一致する (決定論)

## spec 1.3 の追加機能 → target へのマッピング

| IR フィールド | Prisma | SQL DDL | TypeScript | 備考 |
| --- | --- | --- | --- | --- |
| `model.abstract: true` | `@@ignore` モデル扱い or 親 interface のみ生成 | 物理テーブル生成スキップ | `abstract class` | 具体実装は `@@implements` 経由 |
| `attribute.static: true` | 非対応 (レコード列ではない) | 非対応 | `static readonly` プロパティ | クラス定数扱い |
| `attribute.readonly: true` | Prisma 生成型で `readonly` 修飾 | DB 制約としては非対応、app 層で enforce | `readonly` プロパティ | 初期化後書換不可 |
| `attribute.derived: true` | column 生成スキップ | column 生成スキップ | getter 生成 (`get name() { … }`) | 派生値は DB に持たない |
| `model.typeParams` (generic) | 型パラで Prisma 出力不可 — codegen target で skip | 同上 | `class User<T>` / `interface Repository<T>` | |
| `namespace.traits` | trait 展開後の model のみ出力 (trait 自体は出さない) | 同上 | 同上 | parse 時展開なので downstream 透過 |
| `view.composition` | codegen 対象外 (描画専用) | 対象外 | 対象外 | |
| backtick 識別子 (`limit` 等) | `@map("limit")` で quoted column に | `"limit"` (PG) / `` `limit` `` (MySQL) | そのままプロパティ名 | 方言別 quoting が必要 |

## 参照

- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- 文法: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- 関連 skill: [`write-uml`](./write-uml.md), [`evolve-schema`](./evolve-schema.md)
