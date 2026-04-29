---
name: write-uml
version: 1.8.0
spec: "@umlay/spec >= 1.8.0 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, developer]
summary: 要件や既存の説明文から Umlay DSL (.umlay) を仕様準拠で書き起こす手順
description: ユーザが新しい Umlay DSL (.umlay) を要件・自然言語説明・既存コード/スキーマから書き起こしたいときに起動する。**要件・基本設計の文書情報は `@@md` / `@@doc` で必ず併記**し、構造図 (ER / class / sequence) と要件ドキュメントを `er.umlay` / `class.umlay` / `requirement.umlay` 等にファイル分割する。生成物は `@umlay/spec` に準拠し、パース → IR v1.0 へ通ること。
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

### Step 0 — 出力ファイルの分割を決める (重要)

`.umlay` を **1 枚に押し込まない**。レビュアーは「ER だけ見たい」「要件
だけ見たい」と粒度ごとに読みたいので、**ファイルを目的別に分割**する。
分割パターン (推奨):

| ファイル名 | 主要内容 | `@@md` の比率 | レビュー対象 |
| --- | --- | --- | --- |
| **`<domain>.requirement.umlay`** | **要件 / 基本設計 / ADR / 制約** を `@@md` 中心で記述 + 主要 model のスケルトン | **高 (本文の半分以上)** | プロダクトオーナー、アーキテクト |
| `<domain>.er.umlay` | model / 属性 / `@ref` / `view @er_diagram` | 低 (model `@intent` のみ) | DB 設計者、バックエンド |
| `<domain>.class.umlay` | `fn` / `@pre` / `@post` / `protocol` / `view @class_diagram` | 中 (契約説明) | ロジック実装者 |
| `<domain>.sequence.umlay` | `view @sequence_diagram` 中心、`@@detail` で骨格/詳細切替 | 中 | API / フロー設計者 |
| `<domain>.umlay` (任意) | 上記を `import` で集約した「全体」ファイル | — | 図全体を 1 枚で見たいとき |

**重要原則:**

1. **要件ファイル (`requirement.umlay`) を最初に書く** — ここで決めた
   intent / 制約が他ファイルの `@intent` / `@inv` に流れる
2. **構造ファイル (`er.umlay` / `class.umlay`) は構造のみ** — ER ファイル
   に長い `@@md` を書かない (ER 図は構造比較に使うので、説明は要件
   ファイル側で参照する)
3. **同じ namespace を共有する場合は `import` で参照**:

```umlay
// requirement.umlay 側で model を定義
namespace shop
@@md("""…要件本文…""")
model Order @aggregate_root { id UUID! @id; total decimal! }

// er.umlay 側
namespace shop-er
import "./requirement.umlay"      // shop の model 群を読み込む
view shop-overview @er_diagram { include: shop.* }
```

`import` ができない / 重複定義になる場合は、**model の正本を 1 つの
ファイルに置き、view/doc 専用ファイルから `import` で参照する** Pattern A
が安全。同じ model を 2 つ以上のファイルで宣言しない。

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
  @intent("顧客発注のアグリゲート")
  @inv("total.amount >= 0")
  @inv("status in ['DRAFT', 'CONFIRMED', 'CANCELLED']") {
  total  Money!
  status OrderStatus!

  fn confirm() -> void
    @pre("status == DRAFT")
    @post("status == CONFIRMED")
    @raises(InvalidStateError)
    @intent("下書きを確定")
}
```

**⚠️ L021 (strict で error) の落とし穴**: `@aggregate_root` には**model ヘッダ位置の `@inv("...")`** が 1 つ以上必須。**attribute レベルの `@inv` では満たされない**。

```prisma
// ❌ NG (L021 エラー) — attribute 側にしか @inv が無い
model Order @aggregate_root @intent("...") {
  total Money! @inv("total >= 0")
}

// ✅ OK — model ヘッダに @inv を 1 つ以上
model Order @aggregate_root
  @intent("...")
  @inv("total.amount >= 0") {
  total Money!
}
```

**model レベル**は不変条件 (cross-attribute 制約 / 業務ルール)、**attribute レベル**は単一フィールドの値域とみなす。両方書いて構わない。

### Step 7.5 — ドキュメント層を厚くする (`@@md` / `@@doc` / Markdown trailer) **必須**

要件ファイル (`requirement.umlay`) では構造定義よりも **ドキュメント層**
を厚くする。レビュー時に `.umlay` だけで「何を作ろうとしているか」「なぜ
この境界か」「どう使われるか」を説明できる状態を目指す。

#### 4 つの記述レイヤを使い分ける (RFC 0031 / 0035, spec 1.1+)

| レイヤ | 構文 | 用途 |
| --- | --- | --- |
| **A. 文字列内 Markdown** | `@intent("...")` / `@inv("...")` | 1〜2 行で「何のため / 何を守るか」 |
| **B. `@@md(""" ... """)`** | model / 宣言前にも置ける (RFC 0035) | 多段落・表・コードフェンス・図表説明。**要件本文の主役** |
| **C. `@@doc("""...""")`** | 同上 | 公開 API ドキュメント風の単段落説明 |
| **D. Markdown trailer (`---` 以降)** | ファイル末尾 | クロスカット (制約 / 用語集 / 開放課題 / 参考リンク) |

#### 原則

1. **要件ファイルは Markdown 比率 ≥ 50%** を目標にする。`@@md` ブロック
   なしの `requirement.umlay` は「ただの ER 図ファイル」に退化している
2. **宣言前 `@@md` / `@@doc` (RFC 0035)** で **「この model の存在理由 /
   ビジネス的位置付け / レビュアーが知るべき制約」** を 1 段落 + 表で書く
3. **宣言ヘッダ `@intent("...")`** は Markdown ブロックの **1 行サマリ**
   とする。両者を組み合わせると「目次的な intent」+「本文 `@@md`」になる
4. **末尾 trailer (`---`)** は ADR / 用語集 / Open Questions の置き場。
   IR には `IR.docTrailer` として保存され、Document mode で表示される

#### 例: requirement.umlay の冒頭

```umlay
namespace shop

@@md("""
# 注文ドメイン — 基本設計

## 背景
2026-Q2 リニューアルで、レガシー基幹の Order テーブル相当を
新しい集約境界で再設計する。下記 ADR-021 (集約境界の決定)、
ADR-024 (在庫モデルの分離) に依拠する。

## 業務ルール (要約)
- 注文は **DRAFT → CONFIRMED → SHIPPED** の片道遷移 (CANCELLED は任意状態から)
- 確定後の合計金額は不変。差額発生時は別注文 (返金 / 追加) を作る
- 1 注文あたりの明細は 1〜200 行

## スコープ外
- 在庫引当は別 namespace `inventory` で管理 (本ファイルでは `@ref` のみ)
- 配送状況は `shipping` ドメインの責務

## 関連 view
- `shop.requirement` (本ファイル末尾): 用語集 / Open Questions
- `shop.er` (`er.umlay`): スキーマ俯瞰
- `shop.class` (`class.umlay`): メソッド契約
""")

@@md("""
## 集約: Order

注文確定の唯一の入口。**OrderLine とは composition** (Order 削除時に
連鎖削除)。`status` の遷移ルールは `confirm()` / `ship()` / `cancel()` の
`@pre` / `@post` を真とする。
""")
model Order @aggregate_root
  @intent("顧客発注のアグリゲート — 確定後は不変")
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

# 用語集

| 語 | 定義 |
| --- | --- |
| 注文 | Order 集約の代表名。レガシー Order テーブルとは別物 |
| 確定 | `confirm()` 呼び出し以降の状態 |

# Open Questions
- [ ] 部分キャンセルは 1.0 ではスコープ外 (一括キャンセルのみ)。次期で?
- [ ] 在庫引当との同期点は `confirm()` 以前 / 以後どちらか — ADR-025 待ち
```

#### アンチパターン

| ❌ NG | ✅ OK |
| --- | --- |
| `requirement.umlay` に `@intent("注文")` だけで `@@md` なし | 宣言前 `@@md` で 1 段落 + 業務ルール表 |
| 全文書を 1 つの巨大 `@@md` に押し込む (model ヘッダの `@intent` を抜く) | 宣言前 `@@md` (本文) + ヘッダ `@intent` (1 行サマリ) を併記 |
| `er.umlay` に長文 `@@md` (構造ファイルが要件を抱え込む) | 構造ファイルは `@intent` のみ。要件は `requirement.umlay` 側 |
| 用語集を `@@md` 各所に散らばせる | 末尾の `---` trailer に集約 |

### Step 7.7 — シーケンス図: 1 view に複数 `seq` を入れる選択肢 (RFC 0053, spec 1.8+)

複数のシナリオ (success / failure / cancel など) を **1 つの報告書 view** に
まとめたいときは、`view ... @sequence_diagram { seq <name> { ... } seq <name> { ... } }`
で **複数 `seq` ブロックを 1 view に持たせられる**。各ブロックは縦に積まれ、
`« seq: <name> »` ヘッダ + 横線で区切られる。

```umlay
view report @sequence_diagram
  @intent("注文確定の主要パス・失敗パス・キャンセルを 1 枚に集約") {
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

**いつ複数 `seq` vs 別 view にすべきか:**

| 観点 | 複数 `seq` を 1 view | 別 view に分ける |
| --- | --- | --- |
| 同じ participants が登場 | ✅ ライフライン共有でレポートに最適 | — |
| 別の participants 集合 | — | ✅ |
| 「対比して読ませたい」 | ✅ (success vs failure を 1 枚で) | — |
| 個別に View Selector でフィルタしたい | — | ✅ |
| Markdown export / 印刷で 1 ページに収めたい | ✅ | — |

**ルール:**
- 2 つ以上の `seq` を入れる場合、**各ブロックに名前必須** (lint L057)
- 名前は同 view 内で一意
- 1 つだけの場合は無名 (`seq { ... }`) でも命名 (`seq main { ... }`) でも OK
- `participants:` は view レベルで宣言 (各 seq では再宣言不要、共有される)

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

## **AI が頻発する文法ミス (必読)**

Umlay は **Prisma / TypeScript / GraphQL とは違う**ので、それらに引きずられたミスが多発する。以下は parser エラーになる典型例:

| 形 | 状態 | エラー文 (古い場合) |
| --- | --- | --- |
| `id UUID! @id` | ✅ canonical (no colon) | — |
| `id: UUID! @id` | ✅ **1.6.3+ 受理** (Prisma / TS 風) | (1.6.2 まで `Expecting Identifier, found ':'`) |
| `email: string?` | ✅ 受理 (1.6.3+) | 同上 |
| `model User:` | ❌ model body は `{}`、`:` 不可 | `Expecting LCurly, found ':'` |
| `fn pay(): Receipt` | `fn pay() -> Receipt` | `Expecting Identifier, found ':'` (戻り型直前) |
| `fn pay() => Receipt` | `fn pay() -> Receipt` | parser reject |
| `name = string` | `name string` | `=` は `type X = Y` (alias) 専用 |
| `field UUID @id?` | `field UUID? @id` | 注釈は型 + nullability の**後** |
| `attribute "comment"` | `attribute @@doc("comment")` | bare 文字列は不可 |
| `foreignKey(User.id)` | `@ref(User.id)` | 関数呼び出し風は不可 |
| `model X @aggregate_root @@confidence(0.3) {` | body 内に置く: `model X @aggregate_root { @@confidence(0.3) ... }` | `@` (header) と `@@` (body) は位置別物 |
| header に `@@inv(...)` / `@@owner(...)` / `@@status(...)` | header は single-at: `@inv("...")` `@intent("...")`、`@@` 系は body 内 | 同上 |

特に **「属性名と型の間に `:` を入れない」** が最大の落とし穴。Prisma / TS スキーマからの取り込みは `reverse-engineer` skill が変換するので、AI が手書きする場合は `name Type` 形式を厳守する。

parser は v1.6.1+ から **これらのパターンに「Hint:」を付加**してエラー出力するので、エラー文末尾の Hint を読めば修正方針がわかる。

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

### 構造 (全ファイル共通)

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

### ファイル分割 (Step 0 準拠)

- [ ] 要件 / 基本設計のドキュメントは `requirement.umlay` (または同等) に
      集約され、ER / class ファイルが要件本文を抱え込んでいない
- [ ] 同じ model が 2 つ以上のファイルで宣言されていない (`import` で参照)
- [ ] レビュー対象の audience ごとにファイルが分かれている

### ドキュメント層 (`requirement.umlay` 必須、他ファイルは推奨)

- [ ] **要件ファイルは Markdown 比率 ≥ 50%**
- [ ] 各 model に **宣言前 `@@md` または `@@doc`** で本文がある
      (1 行 `@intent` だけで終わっていない)
- [ ] ファイル末尾に `---` trailer で **用語集 / Open Questions / ADR 参照**
      がある
- [ ] `@intent("...")` (1 行) と `@@md(""" ... """)` (本文) の役割が
      混同されていない

## 完全なサンプル — 3 ファイル構成

### `ordering.requirement.umlay` (要件・基本設計、`@@md` 主体)

```umlay
@@mode(strict)

namespace ordering

@@md("""
# 注文ドメイン — 基本設計 (v1)

## 背景
2026-Q2 リニューアルで、レガシー Order テーブルを集約境界で再設計。
ADR-021 (集約境界決定) / ADR-024 (在庫モデル分離) に依拠。

## 業務ルール
- 注文は **DRAFT → CONFIRMED → SHIPPED** の片道遷移
- CANCELLED はいつでも遷移可能
- 確定後の `total` は不変

## スコープ外
- 在庫引当 (`inventory` namespace の責務)
- 配送状況 (`shipping` namespace の責務)
""")

type Money @value_object {
  amount   decimal @scale(2)
  currency string  @pattern("^[A-Z]{3}$")
}

enum OrderStatus { DRAFT, CONFIRMED, SHIPPED, CANCELLED }

@@md("""
## 集約: Order
注文確定の唯一の入口。OrderLine とは composition (Order 削除時に連鎖)。
""")
model Order @aggregate_root
  @intent("顧客発注のアグリゲート — 確定後は不変")
  @inv("total.amount >= 0")
{
  id          UUID!         @id
  customerId  UUID!         @ref(Customer.id, onDelete: RESTRICT, inverse: "orders")
  total       Money!
  status      OrderStatus!  @states(initial: DRAFT, final: [SHIPPED, CANCELLED])

  -> composition 1..* lines: OrderLine
}

model Customer @aggregate_root
  @intent("購入者")
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

# 用語集

| 語 | 定義 |
| --- | --- |
| 注文 | Order 集約の代表名 |
| 確定 | `confirm()` 呼び出し以降の状態 |

# Open Questions
- [ ] 部分キャンセルは v2 でスコープ
- [ ] 在庫引当の同期点は ADR-025 待ち
```

### `ordering.er.umlay` (ER 図専用、構造のみ)

```umlay
namespace ordering-er
import "./ordering.requirement.umlay"

view ordering-er @er_diagram
  @intent("注文ドメインのスキーマ俯瞰")
{
  include: ordering.*
}
```

### `ordering.class.umlay` (メソッド契約、クラス図用)

```umlay
namespace ordering-class
import "./ordering.requirement.umlay"

view ordering-class @class_diagram { include: ordering.* }
view ordering-life @state_machine { include: ordering.Order, ordering.OrderStatus }
```

`ordering.requirement.umlay` だけでも独立して読めるが、ER 図 / state
machine の SVG が必要なときは `ordering.er.umlay` / `ordering.class.umlay`
を CLI に渡す。レビュアーは目的別にどれか 1 つだけ読めばよい。

## 参照

- 文法: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- 予約語: [`packages/spec/src/index.ts`](../../packages/spec/src/index.ts)
- サンプル: [`packages/examples/samples/`](../../packages/examples/samples/)
- 関連 skill: [`review-uml`](./review-uml.md), [`evolve-schema`](./evolve-schema.md)
