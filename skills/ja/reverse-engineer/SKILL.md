---
name: reverse-engineer
version: 1.9.0
spec: "@umlay/spec >= 1.9.0 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, developer, architect]
summary: 既存の Prisma schema / SQL DDL / TypeScript 型から spec 準拠の Umlay DSL (.umlay) を起こす
description: 既存コードベース — Prisma `schema.prisma`、PostgreSQL / MySQL DDL、TypeScript の `class` / `interface` / `type` — を Umlay に取り込みたいときに起動する。取り込み後は review-uml / evolve-schema / codegen-mapping にそのまま渡せる形にする。
references:
  grammar: ../../../packages/spec/src/grammar.md
  schema: ../../../packages/spec/src/ir.schema.json
  keywords: ../../../packages/spec/src/index.ts
---

# reverse-engineer

## ゴール

既存の**正本スキーマ** (手書き `.umlay` ではない) を入力とし、次を満たす `.umlay` を生成する:

1. `@umlay/core` でエラーなく parse できる (S レベル違反ゼロ)
2. 入力の **形と整合性** を保つ (model / attribute / PK / FK / unique / enum)
3. **設計判断** (stereotype / bounded context / intent) は推測せず、`TODO` コメントとして残す

`codegen-mapping` が forward、本 skill が inverse。取り込んだ `.umlay` は `review-uml` で品質監査 → `evolve-schema` で以後の変更、という流れに載る。

## 前提

| 項目 | 内容 |
| --- | --- |
| 入力 | Prisma `schema.prisma` / PostgreSQL / MySQL DDL (`CREATE TABLE`) / TypeScript の `class` / `interface` / `type` 宣言 |
| 出力 | `.umlay` テキスト (UTF-8)、DSL 1.0 に準拠 (parser が受理する) |
| 対象外 | メソッド本体 / ミドルウェア / migration / 業務ロジック — あくまで **構造の骨格** |

## 決定論の条件

- 同じ入力 → 同じ出力 (model 順は入力順、attribute は宣言順)
- 入力に**存在しない** attribute / stereotype / 関連を**絶対に作らない**。曖昧な場合は `@@doc` で「曖昧さの内容と採用した安全なデフォルト」を書く
- 構造部分は LLM 不要。LLM は intent / stereotype の補助に使っても良いが、構造は決定論的走査で生成する

## 1. 基本型マッピング (codegen-mapping §1 の逆)

### Prisma から

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
| `Json` | `Json` (予約型、形不明として扱う) |
| enum 参照 `OrderStatus` | `OrderStatus` (+ namespace 内に `enum OrderStatus { ... }` を 1 回生成) |
| composite type (Prisma 6+) | `type X @value_object { ... }` |

### PostgreSQL DDL から

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

### TypeScript から

| TS | Umlay |
| --- | --- |
| `string` | `string` |
| `number` | `int` (情報損失あり — レビュー対象としてフラグ) |
| `bigint` | `bigint` |
| `boolean` | `bool` |
| `Date` | `Timestamp` (`Date` / `Timestamp` の曖昧さを `@@doc` に書く) |
| リテラル union `'A' \| 'B'` | `enum X { A, B }` (名前は attribute 名の PascalCase) |
| `T \| null` | nullable attribute |
| `T \| undefined` / `foo?:` | nullable attribute |
| `unknown` / `any` | `Json` + `@@doc("was any/unknown — revisit")` |

## 2. NULL 取扱

| 入力 | Umlay |
| --- | --- |
| Prisma `String` / SQL `NOT NULL` / TS `foo: T` | `name: Type!` |
| Prisma `String?` / SQL `NOT NULL` なし / TS `foo: T \| null` | `name: Type?` |
| Prisma `String? @default(dbgenerated())` / TS `foo?: T` | `name: Type?` |

Umlay の `!` = 非 null、`?` = nullable。ソースが確実に非 null のときだけ `!` を出す。

## 3. 主キー

- 単一 PK (`@id` / `PRIMARY KEY`) → 該当 attribute に `@id`
- 複合 PK (`@@id([a, b])` / `PRIMARY KEY (a, b)`) → model に `@@identity(a, b)`
- PK 不検出 → model に **`@@doc("TODO: no PK detected in source")`** を添え、合成**しない**

## 4. 外部参照 (FK)

### Prisma

```prisma
customerId String   @db.Uuid
customer   Customer @relation(fields: [customerId], references: [id], onDelete: Restrict)
```

→

```umlay
customerId UUID! @ref(Customer.id, onDelete: RESTRICT)
```

relation オブジェクトは落として OK — Umlay は scalar attribute に畳む。

### SQL

```sql
customer_id uuid NOT NULL REFERENCES customer(id) ON DELETE RESTRICT
```

→

```umlay
customerId UUID! @ref(Customer.id, onDelete: RESTRICT)
```

`snake_case` → `camelCase` に変換するが、**`@codegenName("customer_id")` を併記**して codegen 逆変換が元どおりになる状態を保つ。

### TypeScript

TS は FK 意図を型で表現しないことが多い。ヒューリスティック: `xxxId: string` の名前で、`Xxx` が別の exported `interface` / `class` として存在すれば `@ref(Xxx.id)` + `@@doc("inferred from name — please confirm")`。

### onDelete / onUpdate 対応

| Prisma | SQL | Umlay |
| --- | --- | --- |
| `Cascade` | `CASCADE` | `CASCADE` |
| `Restrict` | `RESTRICT` | `RESTRICT` |
| `SetNull` | `SET NULL` | `SET_NULL` |
| `NoAction` | `NO ACTION` | `NO_ACTION` |

## 5. Unique / Index

| 入力 | Umlay |
| --- | --- |
| attribute 単独 `@unique` / `UNIQUE` | attribute に `@unique` |
| `@@unique([a, b])` / `UNIQUE (a, b)` | model に `@@unique(a, b)` |
| `@@index([a])` / `CREATE INDEX` | model に `@@index(a)` |

## 6. Enum

参照される enum ごとに **最初に使う namespace** に 1 回だけ出す (namespace がなければ file 先頭):

```umlay
enum OrderStatus {
  DRAFT
  CONFIRMED
  SHIPPED
  CANCELLED
}
```

値の並びは入力順を保つ。

### enum / type に doc を attach (spec 1.4+ / RFC 0035)

ソース側に enum / type のコメントがあるなら、**その宣言の直前**に `@@doc(...)` /
`@@md(...)` を出す。spec 1.4 以降は宣言と宣言の間に挟めるようになり、IR では
`enum.docs[]` / `type.docs[]` に attach される (Model と同じ仕組み)。

```umlay
@@doc("TS source: lowercase of enum value")
enum OrderStatus { DRAFT, CONFIRMED, SHIPPED, CANCELLED }

@@md("""
内部用の決済 enum。
ユーザーには露出しない。
""")
enum SettlementStatus { PENDING, RECONCILED, WRITTEN_OFF }
```

⚠️ spec 1.3 以前の parser に渡す予定があるなら、enum 直前の `@@doc` は
`// コメント` に降格すること (1.3 では `Expecting EOF` で reject される)。

## 7. Stereotype 推定 (ヒューリスティック — 安全側 + フラグ)

**証拠なく `@aggregate_root` を付けない**。reverse-engineer は構造担当、設計意図は `review-uml` と人間の責務。

| 条件 | 推定 stereotype | 信頼度 |
| --- | --- | --- |
| `@id` + 内向き FK を受けている | `@entity` (安全デフォルト) | 中 |
| `@id` あり、2 件以上の model から参照されていて、自分は外向き FK を持たない | `@aggregate_root` 候補 | 低 — `@@doc("candidate @aggregate_root — confirm")` を添える |
| `@id` なし、composite type / JSON 列として埋め込まれている | `@value_object` | 高 |
| 名前が `Service` / `Handler` / `Controller` で終わる (TS 限定) | `@service` | 中 (フラグ) |
| field ゼロの interface、abstract method だけの abstract class | `@interface` | 高 (TS) / 中 (Prisma — 実質未使用) |

**どれにも該当しないとき**: `@entity`。判断は末尾の `@@doc` コメントで review-uml が拾える形にする。

## 8. Namespace 推定

| 入力 | 戦略 |
| --- | --- |
| Prisma `schemas = ["auth", "billing"]` + `@@schema("auth")` | スキーマごとに `namespace auth { ... }` |
| SQL DDL の `CREATE SCHEMA` + schema 修飾されたテーブル | 同上 |
| 単一 schema の Prisma / SQL | DB / サービス名を小文字化した単一 namespace |
| TS のファイルが `src/features/auth/...` 配下 | namespace = フォルダ名 (`auth`) |

何も手掛かりがなければ `namespace default { ... }` 1 本にして、ファイル先頭の `@@doc` にその判断を記録。

## 9. 命名変換

- ソース名が Umlay 側の変換後と異なる場合は **`@codegenName("...")` を併記**
- `snake_case` (SQL) → `camelCase` (attribute 名) / `PascalCase` (model 名)
- CJK / 非 Latin 識別子は **Umlay 側で保持** (Umlay は Unicode を許容) + `@codegenName("english_fallback")` で codegen-mapping が安全に走るようにする
- 予約語列 (`limit` / `from` / `type` 等) はバッククォート escape: `` `limit`: int! ``

## 10. コメント / ドキュメント引き継ぎ

| ソース | Umlay 側 |
| --- | --- |
| Prisma `/// triple-slash` (model) | 直前の `@@md ("""...""")` |
| Prisma `/// triple-slash` (attribute) | inline `@@doc("...")` |
| SQL `COMMENT ON TABLE / COLUMN` | `@@md` / `@@doc` |
| TS JSDoc `@param` / 先頭ブロックコメント | model に `@@md` / attribute に `@@doc` |

## 11. **出さない**もの

入力に存在しない以下は絶対に生成しない:

- `@@inv` / `@@pre` / `@@post` (invariant — 設計判断)
- `@@sample(from: ...)` (添付 — テストデータ)
- `view ... @er_diagram { include: ... }` — view 作成は人間 or `write-uml` の仕事
- `rationale.intent` — 形からは推定できない明示的な設計意図
- `@abstract` — TS 側が `abstract` / Prisma 側が `@@ignore` でない限り不可

代わりに **ファイル先頭 TODO ブロック**でレビュワーに渡す:

```umlay
// --- imported by reverse-engineer (from schema.prisma @ 2026-04-24) ---
// TODO(review-uml): `confirm` 付き @@doc の stereotype を確認
// TODO(write-uml):  audience ごとに view (@er_diagram / @class_diagram) を追加
// TODO(architect):  業務ルールがある model に @@inv / @@pre / @@post
// TODO(architect):  aggregate_root 候補に rationale.intent を追記
```

## 12. 手順

### Step 1 — 入力種別の判定
Prisma (`datasource db` ブロックまたは `model X { ... }` 形式) / SQL (`CREATE TABLE`) / TypeScript (AST で `class` / `interface` / `type` 判定)。

### Step 2 — 構造のみパース
決定論的 parser を使う (`@prisma/internals` / `pgsql-parser` / `ts-morph` または TypeScript compiler API)。式評価・migration 実行は**しない**。

### Step 3 — IR 骨格の構築
namespace → model → attribute → relation。Umlay で正規化される名前は `@codegenName` を添える。

### Step 4 — §7 でヒューリスティック stereotype を適用 + 不確実性を書き残す
低信頼の stereotype は必ず `@@doc("candidate @X — confirm")`。`@entity` → `@aggregate_root` への暗黙昇格は禁止。

### Step 5 — §11 の TODO ヘッダ付きで DSL 出力
human reviewer が model より先に仮定を読めるよう、ヘッダを**最上部**に置く。

### Step 6 — 引き渡し
出力に対して `review-uml` を (自分または user に) 走らせる。一次指摘として頻発するのは L-rule (文書不足)、R04 (aggregate_root 候補の `@@inv` 欠如)、命名系の W-rule。

## チェックリスト

- [ ] 入力種別を判定済み (Prisma / SQL / TypeScript)
- [ ] §8 に基づき namespace を判定し、記録した
- [ ] 入力の全 attribute が Umlay 側にも存在する (ドロップなし)
- [ ] PK / 複合 PK が `@id` / `@@identity` に正しく載っている
- [ ] 全 FK が `@ref(...)` + `onDelete` / `onUpdate` つきで載っている
- [ ] unique / index が保持されている
- [ ] enum は 1 回だけ宣言、値は入力順
- [ ] §7 に沿った stereotype (低信頼には `@@doc`)
- [ ] Umlay 側の名前がソースと異なるときは `@codegenName` 併記
- [ ] 予約語列はバッククォート escape
- [ ] §11 の TODO ヘッダがファイル先頭に存在
- [ ] `@umlay/core` で parse 可能 (自分で確認 or user に確認を依頼)

## 例 — Prisma → Umlay

入力 `schema.prisma`:

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

出力 `.umlay` (一次取り込み):

```umlay
// --- imported by reverse-engineer (from schema.prisma @ 2026-04-24) ---
// TODO(review-uml): `confirm` 付き stereotype を確認
// TODO(write-uml):  audience ごとに @er_diagram view を追加
// TODO(architect):  業務ルールのある model に @@inv を追加
// TODO(architect):  aggregate_root 候補に rationale.intent

namespace ordering

enum OrderStatus {
  DRAFT
  CONFIRMED
  SHIPPED
  CANCELLED
}

model Customer @aggregate_root {
  // @@doc("candidate @aggregate_root — Order から参照され、外向き FK なし。confirm.")
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

## 例 — SQL → Umlay (抜粋)

入力:

```sql
CREATE TABLE public.user (
  id          uuid          PRIMARY KEY,
  email       varchar(255)  NOT NULL UNIQUE,
  "limit"     integer       NOT NULL DEFAULT 0,
  created_at  timestamptz   NOT NULL DEFAULT now()
);
```

出力:

```umlay
namespace public

model User @entity {
  id        UUID!             @id
  email     string! @maxLength(255) @unique
  `limit`   int!              @default(0)
  createdAt Timestamp!        @codegenName("created_at")
}
```

予約語列をバッククォートで escape し、`@codegenName` で snake_case 列名を保持していることに注意。

## spec 1.6 — provenance / confidence の必須化

reverse-engineer の出力は `@@provenance` と `@@confidence` を**必ず**付ける:

```umlay
model Order @aggregate_root {
  @@provenance(agent: "claude-opus-4-7", from: "schema.prisma", at: "2026-04-26")
  @@confidence(0.6)                           // 推定 stereotype の信頼度
  @@status("in-review", since: "2026-04-26")  // 人間レビュー前
  id ...
}
```

- `confidence` は **stereotype 推定の確信度**: §7 表の「高/中/低」 → 0.9 / 0.6 / 0.3 を目安
- `@@status` は**人間レビューが終わるまで `"in-review"`**。`review-uml` 完了後にユーザが `"active"` へ変更
- PII / コンプライアンス情報は `@@compliance(tags: [...])` に正規化 (`@@doc` の中に文字列で書かない)

## spec 1.3 ノート

- Prisma 5+ の composite type → namespace 内に `type X @value_object { ... }`
- Prisma で `@@ignore` された model → Umlay 側は `@abstract`
- TS の `class Repository<T> { ... }` のような generics → `Repository<T>` として保持 (spec 1.3 文法で generic 型パラメータを受理)
- trait (`trait X { ... }`) は一次取り込みでは出さない。取り込み後の**リファクタ対象**として `evolve-schema` が後で重複 attribute を畳む形で使う — TODO ヘッダで言及しておく

## 参照

- 文法: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- 予約語: [`packages/spec/src/index.ts`](../../packages/spec/src/index.ts)
- 逆方向 skill: [`codegen-mapping`](./codegen-mapping.md) (forward)
- 次工程 skill: [`review-uml`](./review-uml.md) / [`write-uml`](./write-uml.md) / [`evolve-schema`](./evolve-schema.md)
