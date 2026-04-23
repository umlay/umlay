# DSL Guide — 実践ガイド

Umlay DSL (`.umlay`) の書き方を、カテゴリ別に解説します。文法の正本は [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md) です。

## 1. 基本要素

### namespace

論理的なパッケージ区切り。ファイルの先頭で宣言します。

```prisma
namespace ordering
```

### type (値オブジェクト)

複数フィールドから成る値オブジェクト。プリミティブ合成に使います。

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

### model (エンティティ / アグリゲート)

ドメインの中核。ステレオタイプで役割を明示します。

```prisma
model Order @aggregate_root @intent("顧客発注のアグリゲート") {
  id          UUID!      @id
  customerId  UUID!      @ref(Customer.id)
  total       Money!     @inv("total >= 0")
  status      OrderStatus = DRAFT
  #createdAt  Timestamp! @auto

  -> composition 1..* lines: OrderLine
}
```

## 2. nullable 記法

| 記号 | 意味 |
| --- | --- |
| `!` | NOT NULL (必須) |
| `?` | NULL 許可 (明示) |
| `??` | NULL 許可かつ default = NULL |

## 3. 主要アノテーション

| アノテーション | 用途 |
| --- | --- |
| `@id` | 単一主キー |
| `@@id(a, b)` | 複合主キー |
| `@ref(X.y, onDelete?, onUpdate?, inverse?)` | 外部参照 (FK) |
| `@unique` | 一意制約 |
| `@index` | インデックス |
| `@default(value)` | デフォルト値 |
| `@codegenName("Foo")` | コード生成時の英名マッピング |
| `@inv("expr")` | 不変条件 |
| `@pre("...")` / `@post("...")` | 事前 / 事後条件 (メソッド用) |
| `@intent("...")` | 意図。AI 生成・レビュー時のヒント |
| `@aggregate_root` / `@entity` / `@value_object` / `@service` | ステレオタイプ |

## 4. 可視性プレフィックス

フィールド / メソッドの先頭に付けます。省略時は `public`。

| 記号 | 意味 |
| --- | --- |
| `+` | public (既定) |
| `-` | private |
| `#` | protected |

## 5. リレーション

```prisma
model Order {
  -> composition 1..* lines: OrderLine     // 包含 (cascade 可)
  -> aggregation 0..* tags: Tag            // 集約 (ゆるい所有)
  -> association 1    customer: Customer   // 単なる関連
  -> inheritance AuditableEntity           // 継承
}
```

多重度は `1`, `0..1`, `1..*`, `0..*`, `n..m` を使えます。

## 6. ブロックディレクティブ

### `@@doc`

```prisma
@@doc("""
  Order は売上計上の基本単位。
  ...
""")
```

### `@@attachments`

資料画像をモデルに添付します (SVG 本体には埋め込まず、別パネルで表示)。

```prisma
@@attachments("wireframe.png", "board-photo.jpg")
```

### `@@theme`

外部 CSS テーマを指定します。

```prisma
@@theme("themes/dark.css")
```

### `@@mode`

ファイル全体の検証モードを切り替えます。

```prisma
@@mode(strict)   // Strict: 未指定フィールドを error
@@mode(draft)    // Draft (既定): 未指定は既定値で補完
```

### `@@dependencies` (Gantt / WBS 用)

model 単位で複数の先行関係を宣言します。Gantt の矢印 / WBS の順序に反映。

```prisma
// 短縮形 (FS / lag 0)
@@dependencies(BackendDev, FrontendDev)

// 完全形 (kind / lag を明示)
@@dependencies(
  { on: UnitTesting, kind: FS, lag: 0 },
  { on: E2EUAT,      kind: FS, lag: 2 }
)
```

- `kind`: `FS` / `SS` / `FF` / `SF` (PMBOK 準拠、省略時 `FS`)
- `lag`: 整数日、負値でリード (省略時 `0`)

## 7. ビュー (view)

モデルを束ねて「図」として投影します。モデルの重複定義を避けるため、**view はモデルを参照するだけ**で、モデル本体を書くことはできません。

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

対応ビュー種別 (IR schema 準拠): `@er_diagram` / `@class_diagram` / `@sequence_diagram` / `@component_diagram` / `@package_diagram` / `@state_machine` / `@activity_diagram` / `@deployment_diagram` / `@wbs_diagram` / `@gantt_chart`

## 8. 日本語識別子

DSL は日本語の識別子を許容します。コード生成時は `@codegenName` で英名を指定してください。

```prisma
model 注文 @aggregate_root @codegenName("Order") {
  id UUID! @id
}
```

## 9. Draft / Strict モード

| モード | 未指定フィールド | 用途 |
| --- | --- | --- |
| **Draft** (既定) | 既定値で補完、`@intent` 省略 OK | 初稿・スケッチ |
| **Strict** | 多重度・可視性・`@intent` 未指定は error | PR 提出前・本番昇格 |

## 10. 高度な機能 (spec 0.3.0〜0.8.0)

ここまでが Phase 1 コアの DSL。以下は accepted RFC で段階的に追加された高度な機能の要点。各機能の詳細 BNF は [`grammar.md`](../../packages/spec/src/grammar.md)、IR 形を [`ir.schema.json`](../../packages/spec/src/ir.schema.json)、受諾 RFC は [`packages/spec/src/rfcs/`](../../packages/spec/src/rfcs/) 参照。

### 10.1 protocol / union / module (RFC 0006、spec 0.3.0)

```
protocol Printable  @intent("印字可能") {
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
protocol Repository<T: Entity>  @intent("T の CRUD") {
  fn save(entity: T!) -> T!
  fn findById(id: UUID!) -> T?
}

protocol Supplier<out T>  @intent("共変: T の読み取り側")  { fn get() -> T! }
protocol Consumer<in  T>  @intent("反変: T の書き込み側") { fn put(x: T!) -> void }
```

- `T: Entity` で bound 制約 (bound は stereotype / protocol / union / model のいずれか)
- `<out T>` = covariance、`<in T>` = contravariance (使用位置チェックは type-inference.md 参照)

### 10.3 impl / blanket impl / @@override (RFC 0011 / 0016 / 0020)

```
impl<T> Repository<T> for SqlRepo<T> where (T: AggregateRoot) {
  fn save(entity: T!) -> T! { /* codegen target */ }
  fn findById(id: UUID!) -> T?  { /* codegen target */ }
}

// blanket: 全 T で Q を実装している型は P も自動実装
impl<T> Printable for T where (T: Debug) {
  fn print() -> string { "<debug>" }
}

// diamond MRO 曖昧性は C3 で解けないので明示 override
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

- `timeout(N)`: 全体制限 (ms/s/m/h)
- `retry(N)` または `retry({ attempts, backoff: exponential|linear|constant, initial, max, jitter })`
- `catch` / `finally` で失敗/完了通知

### 10.5 CPM (Critical Path Method) on Gantt (RFC 0024)

```
view schedule @gantt_chart {
  include: pm.Task, pm.TaskDependency
  // renderer が CPM (Forward/Backward pass) を自動計算し、
  // slack=0 のタスクをクリティカルパスとして赤で強調表示する
}
```

- 現在は FS (Finish-to-Start) + lag=0 固定。PMBOK の他依存種 (SS/FF/SF) + lag サポートは将来拡張 (RFC 0024 の「follow-up」)
- CPM 計算は `@umlay/renderer-er` の `computeCpm` として公開 (テスト付き)

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

各 target は外部 codegen プラグインが IR を読んで出力する。公式 target 例は [`skills/ja/codegen-mapping.md`](../skills/ja/codegen-mapping.md)。

### 10.7 @deprecated / @experimental (RFC 0023 / 0027)

```
model LegacyUser @entity
  @deprecated({ since: "0.6.0", removeIn: "1.0.0", replaceWith: User,
                message: "use User with new auth flow" }) { ... }

model StreamProcessor @aggregate_root
  @experimental({ since: "0.8.0", stabilizeIn: "1.0.0",
                  trackingIssue: "umlay/umlay#456" }) { ... }
```

- `@deprecated` は lint W001 で使用箇所を通知
- `@experimental` は lint W002 + migration-guide-1.0.md の移行表に自動掲載候補

## 10.5 Markdown 統合 (RFC 0031, spec 1.1.0〜)

`.umlay` ファイルに Markdown を組み込む 4 通りの方法。**全て additive**
で既存ファイルに影響なし。

### A. doc 文字列内 Markdown (実装側で自動レンダリング)

```prisma
model User @aggregate_root @intent("""
## 役割

- 認証主体
- **email** は unique
""") {
  id UUID! @id
}
```

`@intent` / `@@doc` / `@review` / `@fix` の中身は CommonMark + GFM として
表示される (LSP hover / VS Code preview / web editor)。

### B. `@@md` ディレクティブ — 任意 Markdown ブロック

```prisma
model Order @aggregate_root {
  id UUID! @id

  @@md("""
  ## 状態遷移

  | from | to |
  | --- | --- |
  | DRAFT | SUBMITTED |
  """)
}
```

`@@doc` と異なり**複数回**書ける。table / code fence / 多段落を保持。

### D. ファイル末尾の Markdown trailer

```
namespace shop
model Order @entity { id UUID! @id }

---

# 設計メモ

ADR / 実装上の判断をここに自由に書ける。
```

`---` 単独行以降は IR には入らず `IR.docTrailer` に格納される。
triple-quoted 文字列の中の `---` は対象外。

### C. 文芸的 (literate) `.umlay.md`

ファイル拡張子を `.umlay.md` にすれば、Markdown 文書として書きながら
` ```umlay ` フェンスに DSL を埋め込める。GitHub 上ではそのまま設計文書
として読める。

````markdown
# Auth domain

## エンティティ

```umlay
namespace auth
model User @entity { id UUID! @id }
```

## ビュー

```umlay
view er @er_diagram { include: auth.* }
```
````

参照実装: `parseLiterate(source)` API (`@umlay/core`)。

## 10.6. View Selector (RFC 0032 / spec 1.2+)

`include:` と `exclude:` にはモデル名だけでなく **selector** を書ける。
同じ IR から「誰向けか」の粒度を view 単位で切り分けたい時に使う。

### Phase 1 で使える selector

| Selector | 意味 | 例 |
| --- | --- | --- |
| `ns.Model` / `ns.*` / `**` | モデル名パターン(従来) | `auth.*` |
| `**.attr` | 属性名マッチ(全モデル) | `**.passwordHash` |
| `visibility:X` | 属性の可視性 (`public` / `private` / `protected` / `package`) | `visibility:private` |
| `seq:X` | sequence body の種別 (`critical` / `opt` / `alt` / `par` / `loop` / `catch` / `finally` / `retry` / `timeout` / `message` / `await`) | `seq:critical` |

### 使用例

```umlay
view exec @sequence_diagram {
  include: auth.Browser, auth.App, auth.Google, auth.AppCallback
  exclude: seq:critical, seq:opt, seq:alt   // ハッピーパスだけ
}

view senior-review @sequence_diagram {
  include: auth.*
  exclude: seq:catch, seq:finally            // 設計レビュー用
}

view er-overview @er_diagram {
  include: auth.*
  exclude: visibility:private, **.createdAt, **.updatedAt
}
```

### セマンティクス

- 空の `include` は「全モデル」(従来通り)
- `exclude` は `include` の subset に対して適用される
- `seq:critical` を exclude すると `critical` ブロック全体が消える
- `seq:catch` / `seq:finally` / `seq:retry` / `seq:timeout` は残っている
  `critical` ブロックの対応する**サブプロパティ**だけを落とす
- 未知の selector kind (`foo:bar`) は warning (L034) を出すが parse は通る

実例: `packages/examples/samples/google-oauth-login.umlay` に 4 view の
ショーケース。

## 11. 参考

- [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md) — 文法の正本
- [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json) — 正規IR の JSON Schema
- [`packages/spec/src/lint-rules.md`](../../packages/spec/src/lint-rules.md) — Lint rule catalog
- [`packages/spec/src/type-inference.md`](../../packages/spec/src/type-inference.md) — variance / bound / diamond MRO の判定規則
- [`packages/spec/src/rfcs/`](../../packages/spec/src/rfcs/) — accepted RFC (0001〜0031)
- [`packages/examples/samples/`](../../packages/examples/samples/) — 実例
