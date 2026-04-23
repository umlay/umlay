# Umlay DSL Grammar

**spec version: 0.8.0** (RFC 0001〜0030 accepted)

本ファイル + [`grammar.bnf`](./grammar.bnf) + [`ir.schema.json`](./ir.schema.json) + [`index.ts`](./index.ts) が spec の正本。English version: [`grammar.en.md`](./grammar.en.md)。

`grammar.bnf` が機械可読な正本、本ファイルは人間向けの散文解説。

## 1. ファイル構造

```
<file>      ::= <file-level-directive>* <namespace-decl> <import-decl>* <top-level>*
<top-level> ::= <type-decl> | <enum-decl> | <model-decl> | <view-decl>
              | <protocol-decl> | <union-decl> | <module-decl>
```

- ファイル冒頭に `namespace <identifier>` を **必ず 1 つ**宣言
- ファイル全体に効く directive (`@@mode` / `@@theme`) は `namespace` の前後どちらでも可
- `import` 宣言 (RFC 0009) は namespace 宣言**直後**に配置

### 1.1 `import` (RFC 0009 + 0014)

```prisma
namespace pm_feature_a

import pm_core                                 // 同一プロジェクトの namespace を取り込み
import "./shared/infra.umlay" as infra          // 相対パス + エイリアス
import "@umlay/examples/samples/..." as ext   // npm パッケージ (将来)

// RFC 0014: glob pattern (as 不可)
import "./tasks/*.umlay"
import "./phases/**/*.umlay"
import "./modules/{core,shared}/*.umlay"
```

- import しないと cross-namespace 参照 (`pm_core.X`) は parse error
- glob `*` / `**` / `?` / `[abc]` / `{a,b}` 対応 (最低 `*` と `?`、他は実装オプション)
- glob は alias (`as`) 不可、マッチ 0 件は warning

## 2. 組み込み型

| 型 | 意味 |
| --- | --- |
| `string` | 文字列 |
| `int` | 32 bit 整数 |
| `bigint` | 64 bit 整数 |
| `decimal` | 任意精度小数 |
| `bool` | 真偽値 |
| `UUID` | 128 bit UUID |
| `Date` | 日付 (年月日) |
| `Timestamp` | 日時 (タイムゾーン付き) |

ユーザー定義型 (`type <Name> @value_object { ... }`) と `enum` も属性の型として使える。

## 3. 可視性と nullability

| 記号 | 意味 |
| --- | --- |
| `+` | public (既定) |
| `-` | private |
| `#` | protected |
| `~` | package (spec 1.3.0) |
| `!` | NOT NULL |
| `?` | NULL 許可 (明示) |
| `??` | NULL 許可 + default NULL |

属性先頭に可視性、型直後に nullability。

## 4. 宣言構文

### 4.1 namespace / type / enum / model / view / trait

- `namespace <identifier>`
- `type <Name> = <TypeRef>` — alias 形 (spec 1.3.0)
- `type <Name> @value_object { <field>* <block>* }` — body 形
- `enum <Name> { V1, V2, ... }`
- `model <Name> <Stereotype> { <field>* <relation>* <fn>* <block>* }`
- `trait <Name> { <field>* <relation>* }` — RFC 0034, spec 1.3.0
- `view <id> <kind> { include: ..., exclude?: ..., layout?: ..., ... }`

stereotype は 5 値: `@entity` / `@aggregate_root` / `@value_object` / `@service` / `@interface`。

view kind は **11 値**: `@er_diagram` / `@class_diagram` / `@sequence_diagram` / `@component_diagram` / `@package_diagram` / `@state_machine` / `@activity_diagram` / `@deployment_diagram` / `@wbs_diagram` / `@gantt_chart` / `@composite` (RFC 0033, spec 1.3.0)。

### 4.x trait (RFC 0034, spec 1.3.0)

属性の mixin。model 内で `@@include(Trait)` すると trait の属性がパース時に展開される。

```prisma
trait Timestamped {
  -createdAt Timestamp!
  -updatedAt Timestamp!
}

trait Audited {
  @@include(Timestamped)     // 他 trait の取り込みも可 (再帰展開)
  -createdBy UUID!
  -updatedBy UUID!
}

model Order @aggregate_root {
  @@include(Audited)          // Timestamped + createdBy + updatedBy が入る
  +id    UUID!    @id
  +total decimal!
}
```

- 衝突: model の属性と trait の属性が同名 → **L040 error**
- 2 trait が同名属性を提供 → **L041 error**
- `A→B→A` の循環 → **L042 error**
- 未定義 trait の `@@include` → **L045 error**
- 使われない trait → **L043 warning** / 2 属性未満 → **L044 info**

### 4.x @composite view (RFC 0033, spec 1.3.0)

他の view を 1 枚に合成するビュー種別。

```prisma
view overview @composite {
  @@include(auth-er)
  @@include(login-flow)
  @@include(impl-gantt)
  layout: direction(LR), spacing(48)
}
```

- `@@include` は子 view id を直接参照 (ハイフン可、カンマ区切りで複数可)
- 子 view の `include:` / `exclude:` はそのまま効く (合成は pure compose)
- 未解決 id は赤点線のプレースホルダ panel で描画 (lint L038 warning)
- `@composite` 以外で `@@include(viewId)` を使うと無視 (lint L037 info)

### 4.2 protocol / union / module (RFC 0006 + 0010 + 0011 + 0012)

```prisma
// RFC 0006: 基本形
protocol Repository<T> @intent("永続化契約") {
  fn get(id: UUID!)   -> T?
  fn save(entity: T!) -> void
}

// RFC 0010: 多重継承
protocol UserRepository extends Repository<User>, Auditable, Cacheable<User>
  @intent("User 専用 + 監査 + キャッシュ") {
  fn findByEmail(email: string!) -> User?
}

// RFC 0011: diamond 継承の明示解決
protocol Diamond extends Left, Right {
  @@override(from: Right)              // C3 既定 (Left) を上書きして Right を採用
  fn hello() -> void
}

// RFC 0006: 単純 union
union OrderStatus = DraftState | ActiveState | ClosedState

// RFC 0010: inline payload variant
union OrderEvent =
  | Created   { orderId: UUID!, customerId: UUID!, at: Timestamp! }
  | Confirmed { orderId: UUID!, at: Timestamp! }
  | Cancelled { orderId: UUID!, reason: string!, at: Timestamp! }

// RFC 0012: recursive variant (AST / Tree)
union Expr =
  | Num { value: int! }
  | Add { left: Expr!, right: Expr! }     // ← 自身を参照 (終端 variant が 1 つ以上必要)

module catalog @intent("商品カタログ") {
  model Product @aggregate_root { /* ... */ }
}
```

- `protocol` はジェネリクス (`<T>`) + `extends` (多重継承、C3 MRO) 対応
- `union` の variant は model 名 / inline payload / 再帰参照 (親 union 自身) を混在可能
- diamond 継承で method が衝突する場合は `@@override(from: X)` で明示選択
- `module` は namespace 内のサブ名前空間。参照は `<ns>.<module>.<Model>`

## 5. 属性 (field) アノテーション

### 5.1 識別子 / 参照系

| アノテーション | 用途 |
| --- | --- |
| `@id` | 単一主キー |
| `@ref(<Target>.<attr>[, onDelete:, onUpdate:, inverse:])` | 外部参照 |
| `@unique` | 単一一意制約 |
| `@index` | 単一インデックス |
| `@default(<value>)` | デフォルト値 (DB / ランタイム) |
| `@codegenName("<EnglishName>")` | コード生成時の英名 |

`onDelete` / `onUpdate` は 4 値: `CASCADE` / `RESTRICT` / `SET_NULL` / `NO_ACTION`。

### 5.2 制約系

| アノテーション | 用途 |
| --- | --- |
| `@maxLength(<n>)` | 文字列最大長 |
| `@pattern("<regex>")` | 正規表現制約 |
| `@scale(<n>)` | decimal の小数点以下桁数 |

### 5.3 契約系

| アノテーション | 用途 |
| --- | --- |
| `@intent("...")` | AI 生成 / レビュー用の意図 |
| `@inv("<expr>")` | 不変条件 |
| `@auto` | 自動生成値 |
| `@deprecated("<note>")` | 非推奨マーク |

## 6. リレーション (`->`)

```
-> <kind> <multiplicity> <role>: <Target>
```

kind は `composition` / `aggregation` / `association` / `inheritance`。multiplicity は `1` / `0..1` / `1..*` / `0..*` / `n..m`。

## 7. メソッド (`fn`)

```
fn <name>(<arg>: <type>[, ...]) -> <return-type>
  [@pre("<expr>")]
  [@post("<expr>")]
  [@raises(<ExceptionType>)]
  [@intent("...")]
```

`model` / `type` / `protocol` の body 内で宣言。

## 8. ブロックディレクティブ

| Block | レベル | 用途 |
| --- | --- | --- |
| `@@mode(draft\|strict)` | ファイル | 検証モード |
| `@@theme("<path>")` | ファイル / view | 外部 CSS テーマ |
| `@@doc("""...""")` | model / view / type | ドキュメント (Markdown 可、RFC 0031) |
| `@@md("""...""")` | model | 任意 Markdown ブロック (table / code fence / 多段落、RFC 0031) |
| `@@attachments(<item>, ...)` | model / view | 資料添付 |
| `@@id(<attr>, ...)` | model | 複合主キー |
| `@@unique(<attr>, ...)` | model | 複合一意制約 |
| `@@index(<attr>, ...)` | model | 複合インデックス |
| `@@dependencies(<dep>, ...)` | model | Gantt / WBS 先行関係 |
| `@@sample(<row>, ...)` | model | インスタンスデータ (RFC 0004) |
| `@@implements(<Protocol>[<T>])` | model | protocol 準拠宣言 (RFC 0006) |
| `@@override(from: <Protocol>)` | protocol member | diamond method 解決の明示 (RFC 0011) |

### `@@dependencies` (RFC 0005 で cross-namespace 対応)

```prisma
@@dependencies(TaskA, pm_core.InfraReady)         /* 短縮形、cross-ns 可 */
@@dependencies(
  { on: TaskA,             kind: FS, lag: 0 },
  { on: pm_core.Infra,     kind: SS, lag: 2 }     /* 完全形、cross-ns 可 */
)
```

### `@@sample` (RFC 0004 + 0008)

```prisma
model Task @entity {
  +id UUID! @id
  +name string!
  +plannedStart Date!

  // inline 形式 (RFC 0004)
  @@sample(
    { id: "t001", name: "Kickoff",   plannedStart: "2026-04-20" },
    { id: "t002", name: "Discovery", plannedStart: "2026-04-21" }
  )

  // 外部ファイル参照 (RFC 0008)
  @@sample(from: "./fixtures/tasks.jsonl")
  @@sample(from: "./legacy.csv", format: csv, encoding: "utf-8", limit: 1000)
}
```

外部ファイル対応形式: `json` / `jsonl` / `yaml` / `csv`。inline と外部は同一 model 内で併用可能。

### `@@md` — Markdown ブロック (RFC 0031)

任意の CommonMark + GFM 本文を model に添付する。`@@doc` と異なり、複数回
書ける / 表 / コードフェンス / 多段落を保持する。

```prisma
model Order @aggregate_root {
  +id     UUID! @id
  +status OrderStatus!

  @@md("""
  ## 状態遷移

  | from | to |
  | --- | --- |
  | DRAFT | SUBMITTED |
  | SUBMITTED | PAID / CANCELLED |
  """)
}
```

IR 内で `model.docs[]` に append される (`@@doc` の最初の 1 つは
`model.doc` (string) と `model.docs[0]` の両方に入る、後方互換のため)。

## 9. Sequence diagram 本体

```
participants: <Model> as <alias>, ...

seq {
  <alias1> ->> <alias2> : "<label>"    /* 同期 */
  <alias2> -.> <alias1> : "<label>"    /* 応答 (reply) */
  <alias1>  -> <alias3> : "<label>"    /* 非同期 (async) */

  alt "<cond-A>" {                     /* RFC 0003 */
    <alias1> ->> <alias2> : "..."
  } else "<cond-B>" {
    <alias1> ->> <alias2> : "..."
  } else {                             /* default 分岐 (condition 無し) */
    <alias1> ->> <alias2> : "..."
  }

  opt "<condition>" {                  /* RFC 0007: 単一オプショナル */
    <alias1> ->> <alias2> : "..."
  }

  par {                                /* RFC 0007: 並行 (2 ブランチ以上) */
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

矢印:
- `->>` = 同期呼び出し (sync)
- `-.>` = 応答 (reply、破線で戻り値を返す)
- `->`  = 非同期 (async、fire-and-forget)

メッセージ label は **文字列リテラル** ("…") で囲む必要がある (空白 / 記号 / スラッシュを含められるため)。

### 9.1 critical + timeout + retry + catch + finally (RFC 0017 / 0021 / 0028)

外部 API 呼び出しやトランザクションなど、失敗ハンドリングが必要な区間を `critical` で囲む。

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

- `timeout(<duration>)`: `3s` / `500ms` / `1m` / `1h` (省略可)
- `retry(<N>)`: 短縮形、`retry(3)` で attempts=3 + 既定 backoff
- `retry({ attempts: N, backoff: exponential|linear|constant, initial: <dur>, max: <dur>, jitter: true|false })`: 完全形
- `on (<aliases>)`: 対象 participant を明示 (cross-participant の場合の制約ヒント)
- `catch "<label>" { ... }`: 全 attempt 失敗時の処理 (省略可)
- `finally { ... }`: 成功/失敗問わず最後に実行 (省略可)
- ネスト可 — `critical` の body に `critical` を入れて階層化した timeout / retry を表現できる

### 9.2 アノテーションの object literal 引数 (RFC 0023 / 0027)

`@deprecated` / `@experimental` などは object literal を引数に取れる。

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

配列リテラル `[ ... ]` も受理される。object のキーは `fieldNameToken` と同じ規則で予約語を許容 (`type`, `on`, etc.)。

## 10. View の `layout:` (RFC 0002)

```prisma
view order-er @er_diagram {
  include: ordering.*
  layout: direction(LR), engine(elk), spacing(40), align(center)
}
```

| Option | 値 |
| --- | --- |
| `direction` | `TB` / `BT` / `LR` / `RL` (既定 `TB`) |
| `engine` | `elk` / `dagre` / `grid` / `manual` (既定 `elk`) |
| `hint` | 任意文字列 (実装依存の配置ヒント) |
| `spacing` | 整数 (px、既定 40) |
| `align` | `start` / `center` / `end` (既定 `start`) |

## 11. 参照解決

- 属性の型 (`Foo`) は: 同一 namespace → 他 namespace (`<namespace>.<Name>`) の順で解決
- `@ref(X.y)` の `X` は model 名、`y` は属性名
- view の `include: <namespace>.*` は namespace 内の全 model / type / enum
- `@@dependencies` の `on` は同一 namespace または `<namespace>.<Model>` 形式の cross-namespace

## 12. 予約語 (spec 0.8.0)

[`index.ts`](./index.ts) の `RESERVED_KEYWORDS` を正本とする。識別子 (model 名 / 属性名 / enum 名) として使うと原則 parse error だが、`fieldNameToken` / `directiveArgToken` / `participantIdent` / `annotationName` など**文脈に応じて soft identifier として許容**される箇所もある (同名フィールドが DSL を書く上で常識的に必要な範囲)。

| カテゴリ | キーワード |
| --- | --- |
| 宣言 (core, spec 1.0 で固定) | `namespace` / `type` / `enum` / `model` / `view` |
| 宣言 (RFC 0006, 0.3.0〜) | `protocol` / `union` / `module` |
| 宣言 (RFC 0016, 0.5.0〜) | `impl` / `for` / `where` |
| メソッド (RFC 0001〜) | `fn` |
| import (RFC 0009, 0.3.0〜) | `import` / `as` |
| Variance (RFC 0019, 0.6.0〜) | `out` / `in` |
| Sequence body (RFC 0003/0007/0013/0017/0021/0028, 0.2.0〜0.8.0) | `participants` / `seq` / `alt` / `else` / `opt` / `par` / `branch` / `await` / `loop` / `critical` / `catch` / `finally` / `timeout` / `retry` / `on` |
| React / Next (0.1〜、受理のみ、実装は将来フェーズ) | `component` / `page` / `layout` / `action` / `route` / `context` / `hook` |
| Cloud-native (0.1〜、同上) | `function` / `worker` / `queue` / `topic` / `stream` / `cache` / `store` / `scheduler` / `webhook` / `integration` / `gateway` / `cdn` |

### 12.1 Soft identifier の許容箇所

以下のコンテキストでは、上記キーワード群を識別子として受理する (ambiguity のない範囲で):

- **フィールド名** (`fieldNameToken`): `type`, `queue`, `cache` 等をフィールド名に使える
- **Directive 引数** (`@@index(userId, type)` 等): keyword が引数値として現れてもよい
- **Participant alias / message 参加者** (`participantIdent`): cloud/infra keyword のみ (`cache` / `queue` など) を許容、seq-body keyword (`critical` / `opt` など) は ambiguity を避けて除外
- **Annotation 名** (`@timeout(30s)`, `@retry` など): seq-body keyword + `as` / `on` / `participants` を許容
- **View ID** (`view seq`, `view critical-flow` など): 同上

## 12.5 Markdown 統合 (RFC 0031, spec 1.1.0)

Umlay は Markdown を 4 レイヤーで統合する。**全て additive** — 既存
`.umlay` ファイルは無変更で動く。

### Layer A — 文字列内 Markdown

`@intent("...")` / `@@doc("""...""")` / `@review("...")` / `@fix("...")`
の文字列は実装側で **CommonMark + GFM** として表示される。grammar / IR
に変更なし。

### Layer B — `@@md` ディレクティブ

§8 を参照。`model.docs[]` (`string[]`) に append される。

### Layer D — Markdown trailer (`---` 以降)

ファイル末尾に **`---` 単独行** が現れた場合、それ以降は IR には入らず
`IR.docTrailer?: string` に格納される。triple-quoted 文字列の中の `---`
は対象外 (parser は `"""` の開閉を数えて判定)。

```
namespace shop
model Order @entity { id UUID! @id }

---

# 設計メモ

- 注文は不可逆
```

### Layer C — 文芸的 (literate) `.umlay.md`

拡張子 `.umlay.md` は Markdown 文書として扱われる。中の ` ```umlay `
フェンスを順番に連結して `parse()` に渡す。エラー位置は元 Markdown の
行番号にリマップされる。

```markdown
# Auth domain

\`\`\`umlay
namespace auth
model User @entity { id UUID! @id }
\`\`\`

## ビュー

\`\`\`umlay
view er @er_diagram { include: auth.* }
\`\`\`
```

参照実装: `@umlay/core` の `parseLiterate(source)` API。

## 12.6 View Selectors (RFC 0032, spec 1.2.0)

`view` の `include:` / `exclude:` はモデル名パターンだけでなく **selector**
を受け付ける。文法は [`grammar.bnf`](./grammar.bnf) の `SelectorList` を
正本とし、Phase 1 + Phase 2 の kind は以下:

| Selector | 意味 | 例 |
| --- | --- | --- |
| `ns.Model` / `ns.*` / `**` | モデル名パターン(従来) | `auth.*` |
| `**.attr` | 属性名マッチ(全モデル) | `**.passwordHash` |
| `visibility:X` | 属性の可視性 (`public` / `private` / `protected` / `package`) | `visibility:private` |
| `seq:X` | sequence body 種別 (`critical` / `opt` / `alt` / `par` / `loop` / `catch` / `finally` / `retry` / `timeout` / `message` / `await`) | `seq:critical` |
| `stereotype:X` | モデル stereotype (`entity` / `aggregate_root` / `value_object` / `service` / `interface`) | `stereotype:value_object` |
| `kind:X` | relation kind (`composition` / `aggregation` / `association` / `dependency` / `inheritance` / `realization`) | `kind:dependency` |

意味論は RFC 0032 §Semantics を参照。未知の kind (`foo:bar`) は L034 で
warning、マッチ 0 件は L035 info、冗長な visibility exclude は L036 info。

## 13. 残置課題 (RFC 追跡)

spec 0.8.0 時点で accepted RFC (0001-0030) は実装反映済み。以下は spec 1.0 RC に向けた未決事項:

| 項目 | RFC / Issue |
| --- | --- |
| PMBOK の `@@dependencies` 依存種 SS/FF/SF + lag の完全実装 | 0024 follow-up |
| `@@sample` 外部ファイルの glob / 機密検出 | 0008 follow-up |
| L014 / L015 (`@default` 型整合、CASCADE 循環) の strict mode error 化 | 0029 follow-up |
| IR `_id` hash アルゴリズム freeze + migration tooling | 0026 / migration-guide-1.0.md |
| 実装側の soft-identifier 規則をどこまで許容するか (spec との整合) | 未起票 |

## 参照

- [形式文法 (W3C EBNF)](./grammar.bnf) — 機械可読な正本
- [正規IR の JSON Schema](./ir.schema.json)
- [バージョン定数 / 予約語リスト](./index.ts)
- [RFC](./rfcs/README.md) — 受諾済み 30 件 (0001-0030) + 1.0 RC follow-up
- [サンプル DSL](../../examples/samples/)
- [Skills](../../../skills/)
