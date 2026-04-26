---
name: write-uml
version: 1.5.0
spec: "@umlay/spec >= 1.5.0 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, developer]
summary: 要件や既存の説明文から Umlay DSL (.umlay) を仕様準拠で書き起こす手順
description: ユーザが新しい Umlay DSL (.umlay) を要件・自然言語説明・既存コード/スキーマから書き起こしたいときに起動する。`@umlay/spec` に準拠し、パース → IR v1.0 へ通る .umlay を生成する。
references:
  grammar: ../../../packages/spec/src/grammar.md
  schema: ../../../packages/spec/src/ir.schema.json
  keywords: ../../../packages/spec/src/index.ts
---

# write-uml

## ゴール

自然言語の要件 / スキーマ / 既存コードから、**`@umlay/spec` 準拠**の `.umlay` ファイルを生成する。生成物がパーサで受理され、IR (version 1.0) に変換可能であることを保証する。

## 前提

- 対象 DSL バージョン: `1.0`
- 対象 IR バージョン: `1.0`
- 本 skill は `packages/spec/src/grammar.md` と `packages/spec/src/ir.schema.json` を唯一の正本とする

## 入力 / 出力

| 項目 | 内容 |
| --- | --- |
| 入力 | 要件文、既存 DB スキーマ、既存型定義、ユースケース記述 |
| 出力 | 1 つ以上の `.umlay` ファイル |

## 手順

### Step 1 — namespace を決める

ファイル先頭に **必ず 1 つの `namespace`** を置く。複数ドメインはファイルを分ける。

```prisma
namespace ordering
```

### Step 2 — 値オブジェクト / 列挙を抽出

ステレオタイプ `@value_object` を持つ `type`、または固定リストの `enum` を先に定義する。

```prisma
type Money @value_object {
  amount   decimal @scale(2)
  currency string  @pattern("^[A-Z]{3}$")
}

enum OrderStatus { DRAFT, CONFIRMED, SHIPPED, CANCELLED }
```

### Step 3 — エンティティを定義

`model` とステレオタイプを選ぶ。**spec で定義されたステレオタイプは 5 種のみ**:

| ステレオタイプ | 用途 |
| --- | --- |
| `@aggregate_root` | 境界の入口となる集約ルート |
| `@entity` | 同一性を持つ個別エンティティ |
| `@value_object` | 等価性で同一判定するもの |
| `@service` | ドメインサービス (状態を持たない操作) |
| `@interface` | 契約定義 |

```prisma
model Order @aggregate_root @intent("顧客発注のアグリゲート") {
  id         UUID!  @id
  customerId UUID!  @ref(Customer.id)
  total      Money! @inv("total >= 0")
  status     OrderStatus = DRAFT
}
```

### Step 4 — 属性の必須装飾を付ける

属性は **IR で `name` と `type` が必須**。加えて以下を原則明示する。

| 装飾 | 意味 | 省略時 (Draft) |
| --- | --- | --- |
| `!` | NOT NULL | 既定で `!` |
| `?` | NULL 許可 | 既定値なし |
| `??` | NULL 許可、default NULL | — |
| `@id` | 単一主キー | — |
| `@@id(a, b)` | 複合主キー | — |
| `@ref(X.y)` | 外部参照 | — |
| `@unique` | 一意制約 | — |
| `@index` | インデックス | — |
| `@default(v)` | デフォルト値 | — |
| `@codegenName("Foo")` | コード生成時の英名 | — |
| 可視性 `+` / `-` / `#` | public / private / protected | `public` |

`visibility` は IR で `public / private / protected / package` のみ受理される。

### Step 5 — リレーションを書く

**リレーションの 4 種**:

```prisma
model Order {
  -> composition 1..* lines: OrderLine     // 所有 (cascade 可)
  -> aggregation 0..* tags: Tag            // 集約 (弱所有)
  -> association 1    customer: Customer   // 単なる関連
  -> inheritance AuditableEntity           // 継承
}
```

多重度は `1`, `0..1`, `1..*`, `0..*`, `n..m` のいずれか。**Strict モードでは必須**。

### Step 6 — 参照オプション

`@ref` は以下のオプションを持つ。IR 側の enum は **CASCADE / RESTRICT / SET_NULL / NO_ACTION の 4 値**:

```prisma
@ref(Customer.id, onDelete: CASCADE, onUpdate: RESTRICT, inverse: "orders")
```

### Step 7 — 意図・契約を載せる

AI 生成・レビューの品質を高めるため、以下を**積極的に**書く。

```prisma
model Order @aggregate_root
  @intent("顧客発注のアグリゲート") {
  total Money! @inv("total >= 0")

  fn confirm() -> void
    @pre("status == DRAFT")
    @post("status == CONFIRMED")
    @raises(InvalidStateError)
    @intent("下書きを確定")
}
```

### Step 8 — ビューを宣言

**view は参照のみ**。モデル本体を view 内に書いてはならない。

```prisma
view order-er @er_diagram {
  include: ordering.*, customer.Customer
}
```

**IR スキーマで許可された view kind は 10 種**: `er_diagram`, `class_diagram`, `sequence_diagram`, `component_diagram`, `package_diagram`, `state_machine`, `activity_diagram`, `deployment_diagram`, `wbs_diagram`, `gantt_chart`。

### Step 9 — Gantt / WBS の先行関係 (`@@dependencies`)

タスク間の複数先行関係を宣言する model 単位のブロック。Gantt の矢印や WBS の順序に反映される。

```prisma
// 短縮形 (FS / lag 0)
model Integration @entity {
  @@dependencies(BackendDev, FrontendDev)
  +id UUID! @id
  // ...
}

// 完全形 (kind / lag を明示)
model Release @entity {
  @@dependencies(
    { on: UnitTesting, kind: FS, lag: 0 },
    { on: E2EUAT,      kind: FS, lag: 2 }
  )
  +id UUID! @id
  // ...
}
```

- `on` は同一 namespace 内の model 名
- `kind`: `FS` / `SS` / `FF` / `SF` (省略時 `FS`)
- `lag`: 整数日、負値でリード (省略時 `0`)
- IR では常に object 形 (`{ on, kind, lag }`) に正規化される

### Step 10 — モード選択

```prisma
@@mode(strict)   // 本番 / PR 提出前
@@mode(draft)    // 初稿 (既定)
```

Strict モードでは、未指定の `visibility` / `multiplicity` / `intent` などが error になる。

## 制約 (spec による禁止事項)

| # | 禁止 | 理由 |
| --- | --- | --- |
| 1 | view 内にモデル本体を書く | view は参照のみ (重複定義禁止) |
| 2 | namespace を省略する | IR の `namespaces` キーが必須 |
| 3 | v1 実装キーワード以外を識別子として使う | `RESERVED_KEYWORDS` と衝突する |
| 4 | 未定義のステレオタイプを使う | `entity / aggregate_root / value_object / service / interface` のみ |
| 5 | `?` と `!` を同じ属性に両立 | nullability は排他 |
| 6 | `@@id` と `@id` の併用 | 主キー定義は一方のみ |
| 7 | view の kind に未定義値を指定 | IR スキーマ enum 外は rejected |

## 予約語リスト

以下は **パーサに受理されるが、本スキーマでは識別子として使えない**。将来実装用に予約されている。

| カテゴリ | キーワード |
| --- | --- |
| v1 実装 | `namespace` / `type` / `enum` / `model` / `view` |
| 将来 UML | `protocol` / `union` / `fn` / `module` |
| React / Next.js | `component` / `page` / `layout` / `action` / `route` / `context` / `hook` |
| Cloud-native | `function` / `worker` / `queue` / `topic` / `stream` / `cache` / `store` / `scheduler` / `webhook` / `integration` / `gateway` / `cdn` |

正本: [`packages/spec/src/index.ts`](../../packages/spec/src/index.ts) の `RESERVED_KEYWORDS`。

**予約語の回避 (spec 1.3+)**: `` +`limit` int! `` のように **backtick で囲む**と予約語や SQL 予約名 (limit / from / order / type / …) を属性名として使える。IR 上は backtick を剥がした通常名で格納される。

## spec 1.3 の追加機能

DSL を書き起こす際に考慮に入れられる新機能:

### RFC 0033 — `@composite` view
複数の view を 1 枚に合成:
```umlay
view overview @composite @intent("Architect 向け 1 枚俯瞰") {
  @@include(auth-er)
  @@include(login-flow)
  layout: direction(LR)
}
```

### RFC 0034 — `trait` (属性 mixin)
`createdAt / updatedAt / deletedAt / tenantId` 等の反復属性を切り出し、parse 時に model に展開。
```umlay
trait Timestamped { -createdAt Timestamp!  -updatedAt Timestamp! }
trait Audited { @@include(Timestamped)  -createdBy UUID! }

model Order @aggregate_root {
  @@include(Audited)      // createdAt / updatedAt / createdBy が展開される
  +id UUID! @id
}
```

### UML 修飾子 (クラス図描画向け)
| アノテーション | 効果 |
| --- | --- |
| `@abstract` (model) | 名前斜体 + 破線枠 |
| `@static` (attribute) | 属性行に下線 |
| `@readonly` (attribute) | `{readonly}` チップ |
| `@derived` (attribute) | `/name` プレフィックス |

### `type X = Y` alias 形
```umlay
type ISBN = string
type UserId = UUID
```

### `~` package 可視性
`+ / - / #` に加えて `~name` で package 可視性。

### ER 図の layout 自動最適化
テーブル数 ≥ 8 で direction 未指定時、自動的に `DOWN` + aspectRatio 1.6 に切替。明示 `layout: direction(LR)` で上書き可。

## チェックリスト (完成前に確認)

- [ ] `namespace` がファイル先頭に 1 つある
- [ ] すべての `model` に `@id` または `@@id(...)` がある
- [ ] すべての `@ref(X.y)` の `X.y` が他の model に実在する
- [ ] 属性に `visibility` / nullability が明示されている (Strict 時)
- [ ] リレーションに multiplicity がある (Strict 時)
- [ ] ステレオタイプは spec の 5 種のいずれか
- [ ] view の kind は IR スキーマ enum の 10 種のいずれか
- [ ] view 内にモデル本体を書いていない
- [ ] 識別子が `RESERVED_KEYWORDS` に含まれていない
- [ ] 複数のレビュワー向けに粒度違いの view を書くなら **RFC 0032 selector**
      (`exclude: seq:critical` / `stereotype:service` / `visibility:private` 等)
      で切り分ける。読者ごとに `.umlay` を複製しない

## 完全なサンプル

```prisma
@@mode(strict)

namespace ordering

type Money @value_object {
  amount   decimal @scale(2)
  currency string  @pattern("^[A-Z]{3}$")
}

enum OrderStatus { DRAFT, CONFIRMED, SHIPPED, CANCELLED }

model Customer @aggregate_root @intent("購入者") {
  id    UUID!   @id
  email string! @unique
}

model Order @aggregate_root @intent("顧客発注") {
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

## 参照

- 文法: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- 予約語: [`packages/spec/src/index.ts`](../../packages/spec/src/index.ts)
- サンプル: [`packages/examples/samples/`](../../packages/examples/samples/)
- 関連 skill: [`review-uml`](./review-uml.md), [`evolve-schema`](./evolve-schema.md)
