---
name: review-uml
version: 1.7.0
spec: "@umlay/spec >= 1.7.0 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, reviewer]
summary: Umlay DSL / IR を仕様準拠性・設計品質の両面から機械的にレビューする手順
description: 既存の Umlay DSL / IR をレビュー・監査・分析したいときに起動する。**まずパース可能性を確認** (LEX / PARSE / IR エラー) し、次に spec 準拠・lint 違反・設計リスクを検出し、`@review` / `@fix` 形式で返す。
references:
  grammar: ../../../packages/spec/src/grammar.md
  schema: ../../../packages/spec/src/ir.schema.json
  keywords: ../../../packages/spec/src/index.ts
---

# review-uml

## ゴール

`.umlay` ファイル (または IR JSON) を受け取り、以下の **4 レイヤ** で問題を検出する。

0. **パースエラー** — そもそもパースが通らない形 (lexer / grammar / IR build)。**他のレイヤより最優先**
1. **Spec 違反** — パースは通るが S ルール (S11–S17) に該当する形
2. **Lint 違反** — spec は通るが書き忘れや命名の問題 (L001–L056)
3. **設計リスク** — 構造的アンチパターン (R01–R12)

## 入力 / 出力

| 項目 | 内容 |
| --- | --- |
| 入力 | `.umlay` テキスト または IR JSON (version 1.0) |
| 出力 | 指摘リスト (severity / 位置 / ルール ID / 修正候補) |

## ルールカタログ (正本参照)

レビューで使う全ルールは [`packages/spec/src/lint-rules.md`](../../packages/spec/src/lint-rules.md) を**正本**とし、本 skill では再掲しない。以下 5 カテゴリの prefix を理解したうえで、正本カタログのルール ID を参照する:

| Prefix / Code | 用途 | Severity | 範囲 |
| --- | --- | --- | --- |
| **`LEX` / `PARSE` / `IR`** | パーサ自身が出す診断 (Layer 0) | error (blocker) | 単一コード、文字列のまま |
| **S** | Spec violation (文法違反、blocker) | error (blocker) | S01〜S99 |
| **L** | Lint (mode 依存の慣習違反) | mode-dependent | L001〜L199 |
| **R** | Risk (設計アンチパターン、heuristic) | warn / info | R01〜R99 |
| **W** | Warning (deprecated / experimental 使用等) | info | W001〜W099 |
| **C** | Compatibility (spec バージョン差分) | warn | C001〜C099 |

### Layer 0: パースエラー (最優先 blocker)

`@umlay/core` のパーサ自身が **lint より前の段階で** 発する診断。lint
ルールカタログには載らない (lint package を呼ぶ前に発生する)。`code` は
3 種類:

| code | 意味 | 出処 |
| --- | --- | --- |
| `LEX` | トークナイザが文字を読めない | Chevrotain lexer |
| `PARSE` | トークン列が文法に合わない | Chevrotain parser |
| `IR` | パースは通ったが Zod での IR 構築に失敗 | `IRSchema.parse()` |

**1 件でも error が出ればレビューはここで止まる**。Layer 1〜3 のルール
群は IR が完成していること前提なので、IR が未完成な状態で評価しても
偽陽性 / false negative になる。

#### Pitfall hints (パーサが自動付加)

`PARSE` 系エラーには `addPitfallHint` が AI / 初学者が陥りやすい 5
パターンを検出して `\n  Hint: ...` を末尾に付加する。`code: PARSE` を
受け取ったら必ず Hint も読むこと:

| Hint | パターン | 修正 |
| --- | --- | --- |
| **A** | `attr: Type` (Prisma 風コロン) | コロン省略 (`attr Type`)。spec 1.6.3+ は属性宣言中なら受理されるが、enum 本体や view header での誤用は依然 PARSE |
| **B** | `attr = Type` | コロン / 等号は型宣言用。`type X = Y` のみ等号可 |
| **C** | `model Foo:` (Python/YAML 風) | `{ ... }` 必須 |
| **D** | `fn name() => T` / `fn name(): T` | `fn name() -> T` (single arrow) |
| **E** | header 位置に `@@directive(...)` | `@@` は body-only。header は `@annotation` (single-at) |

#### よく踏む追加パターン (spec 1.6.x 以降で吸収済 — Hint なしで通る)

下記は 1.6.2〜1.6.4 で parser tolerance を上げて受理するようになった。
1.5 以前のサンプルを 1.7 で動かす際にチェック:

| 入力 | 1.5 以前の挙動 | 1.6.x 以降 |
| --- | --- | --- |
| `'single-quoted'` 文字列 | `LEX` | 受理 (1.6.0+) |
| `@@min-spec-version("1.7")` のハイフン引数 | `PARSE` | 受理 (1.6.1+) |
| `@maxLength(1024)` を IR に保存 | 黙って drop | `attribute.constraints.maxLength` に保存 (1.6.2+) |
| `@@identity(a, b, \`date\`)` のバックティック識別子 | `PARSE` | 受理 (1.6.4+) |

#### 入手方法

```sh
umlay check schema.umlay --json | jq '.diagnostics[] | select(.code == "LEX" or .code == "PARSE" or .code == "IR")'
```

`code` でフィルタすれば parse 系だけ抜ける。`range` フィールドで行・列が
取れる。

### Layer 1: Spec 違反 (blocker) — 正本: `lint-rules.md` S 節

- パースは通ったが S 系 lint ルール (S11–S17) が拒否するパターン
- 全 mode で **error** (mandatory)
- 1 件でも該当すれば Layer 2/3 に進まず blocker として返す

### Layer 2: Lint 違反 — 正本: `lint-rules.md` L 節

- L001〜L016 (spec 0.8.0 時点)。Draft / Strict の重大度は正本参照
- L034〜L036 — view selector 関連 (RFC 0032, spec 1.2+)
- **L037〜L039** — `@composite` view 関連 (spec 1.3+): 非 composite での `@@include` / 未解決 view id / composite の循環参照
- **L040〜L045** — trait 関連 (spec 1.3+): model/trait 属性衝突 / 2 trait の二重提供 / 循環 include / 未使用 trait / 過抽象 trait / 未定義 trait
- **L046〜L049** — メタデータバンドル整合 (RFC 0049 / spec 1.6.1+):
  - L046: `@@locked` 要素を info で常時可視化 + `@@adrRef` 推奨
  - L047: `@@boundary.exposes` / `hides` の幽霊参照
  - L048: PII / GDPR / PCI-DSS attribute を持つ model に reject `@@example` 不在
  - L049: `@@example` と構造化 `@@inv(field, op, value)` の矛盾 (expect=accept なのに inv 違反 / expect=reject なのに inv 充足)
- **L050〜L056** — ステートマシン × イベント × シーケンスの整合性 (RFC 0050/0051/0052, spec 1.7+):
  - L050: `state_machine` view 上の遷移に対応する `fn @pre/@post` が無い
  - L051: `fn @pre/@post` で参照される状態名が enum に存在しない
  - L052: 到達不能な enum 値 (初期状態でも `@post` 対象でもない)
  - L053: 状態を持つ model 上で、状態遷移にもシーケンスにも現れない孤立した `fn`
  - L054: sequence のメソッド呼び出しが状態を変えない (整合性違反の疑い)
  - L055: `@emits(EventName)` の参照先 `event` が宣言されていない
  - L056: 宣言された `event` がどこからも emit / 参照されていない
- `@@mode(strict)` で全ルール error 化 (Phase 1.0 で固定、migration-guide-1.0.md)

### Layer 3: 設計リスク — 正本: `lint-rules.md` R 節

- R01〜R12 の構造ヒューリスティック
- 修正候補 (split / rename / 境界再設計) を指摘に添える

### Layer 4: Deprecated / Compatibility 通知 — 正本: `lint-rules.md` W / C 節

- W001/W002 (`@deprecated`/`@experimental` 要素の使用)
- C001/C002 (spec バージョン差分、`min-spec-version` 不整合)

## レビュー手順

### Step 0 — パース可能性チェック (blocker)

1. `umlay check <file> --json` を実行 (もしくは `parse(source)` を直接呼ぶ)
2. `diagnostics[]` から `code in {LEX, PARSE, IR}` のエントリを抜く
3. 1 件でも error 重大度があれば、**ここで止めて以下のフォーマットで返す**:

   ```yaml
   findings:
     - layer: parse
       rule: PARSE
       severity: error
       location: { line: 12, column: 8 }
       message: "Expecting token of type --> Identifier <-- but found --> ':' <--"
       hint: "Hint A — Umlay's canonical attribute form omits the colon (`id UUID! @id` rather than `id: UUID!`)..."
       fix: "Remove the colon: `attr Type` (not `attr: Type`)"
   ```

4. パースが通った時のみ Step 1〜3 へ進む

### Step 1 — Spec 準拠性チェック

1. パース済 IR を schema validation (Draft 2020-12) に通す (Step 0 で済んでいる)
2. `lint-rules.md` S 節 (S11〜S17) を順にチェック (`@umlay/lint` の出力で確認)
3. **1 件でも違反があれば以降の Layer に進まず、blocker として返す**

### Step 2 — Lint 違反検出

1. ファイル先頭の `@@mode` を読む (未指定なら `draft`)
2. `lint-rules.md` L 節 (L001〜L016) を、mode に応じた重大度で評価
3. 属性・リレーション・view・model ごとに違反位置を記録

### Step 3 — 設計リスクのヒューリスティック

1. `lint-rules.md` R 節 (R01〜R12) を計算する (構造統計、アンチパターン照合)
2. 各指摘に**修正候補**を添える (split、rename、境界再設計 など)

### Step 3.5 — Deprecated / Compatibility 通知

1. `lint-rules.md` W 節 (W001/W002) で `@deprecated` / `@experimental` 使用を収集
2. `lint-rules.md` C 節 (C001/C002) で spec バージョン差分を警告

### Step 4 — レポート整形

```yaml
findings:
  - layer: parse                         # Layer 0
    rule: PARSE
    severity: error
    location: { line: 8, column: 12 }
    message: "Expecting token of type --> Identifier <-- but found --> '@@' <--"
    hint: "Hint E — `@@directive(...)` is body-only. Move @@confidence inside `{ ... }`."
    fix: "Move `@@confidence(0.6)` into the model body"
  - layer: spec                          # Layer 1
    rule: S03
    severity: error
    location: "ordering.Invoice"
    message: "Unknown stereotype '@master'. Allowed: entity / aggregate_root / value_object / service / interface"
    fix: "Replace '@master' with '@aggregate_root'"
  - layer: lint                          # Layer 2
    rule: L001
    severity: warn
    location: "ordering.Order.total"
    message: "Attribute lacks explicit visibility"
    fix: "Prefix with '-' (private) or '+' (public)"
  - layer: lint                          # Layer 2 (spec 1.7)
    rule: L055
    severity: warn
    location: "shop.Order.confirm"
    message: "@emits(OrderConfirmed) — そのような event 宣言が見つかりません"
    fix: "Declare `event OrderConfirmed { ... }` or rename @emits target"
  - layer: risk                          # Layer 3
    rule: R04
    severity: info
    location: "ordering.Order"
    message: "aggregate_root without @inv / @pre / @post"
    fix: "Add invariants describing domain rules"
```

## 例: レビュー対象

```prisma
namespace ordering

model Order @master {                        // ← S03: 未定義ステレオタイプ
  id         UUID! @id
  customerId UUID! @ref(Customer.id)         // ← L003: Customer が未定義
  totaL      Money                           // ← L001: visibility 欠落 / nullability 欠落
}

view shop @er_diagram {
  include: ordering.*
  model ExtraFoo { id UUID! }                // ← S02: view 内に model 定義
}
```

指摘:

1. `S03` Order の `@master` は未定義ステレオタイプ — `@aggregate_root` 等に置換
2. `S02` view 内のモデル本体は禁止 — 別ファイルに分離
3. `L003` `Customer.id` は未解決参照 — `model Customer` を追加
4. `L001` `totaL` に visibility なし — `-totaL` 等に
5. nullability なし — Strict では error、Draft では既定 `!`
6. `Money` が未定義 — `type Money @value_object { ... }` を先に宣言

## レビューの粒度を揃える — View Selectors (RFC 0032, spec 1.2+)

1 つの `.umlay` を複数のレビュワーに渡すときは、**view selector で粒度を
明示的に切り分ける**。口頭で「ここは見なくていい」と伝えるよりも、view
の名前と `exclude:` の内容が契約になる。

```umlay
view exec @sequence_diagram {
  // PM/経営向け: critical / catch / opt を隠したハッピーパス
  include: auth.Browser, auth.App, auth.Google, auth.AppCallback
  exclude: seq:critical, seq:opt, seq:alt
}

view senior-review @sequence_diagram {
  include: auth.*
  exclude: seq:catch, seq:finally        // リトライ境界はレビュー対象、後始末は省略
}

view er-overview @er_diagram {
  include: auth.*
  exclude: visibility:private, **.createdAt, **.updatedAt, stereotype:service
}
```

レビュー時のチェック観点:

- 指定された view の名前 (exec / senior-review / sre / …) と「**誰向けか**」
  が対応しているか
- `exclude` が過剰(重要な critical / catch を隠していないか)または
  過少(見せても意味のない監査カラムを残していないか)
- L034 (未知 selector 混入)、L035 (マッチ 0 件) が出ていないか

詳細は RFC 0032 と [dsl-guide §10.6](../../docs/ja/dsl-guide.md)。

## Web エディタの Diff タブを使う (推奨ワークフロー)

Umlay の Diff タブは **git-style な行差分ではなく、change-impact 分析**に振り切った設計。単なる「何が変わったか」ではなく「**何を目的とした変更か / どこに波及するか / 何を絶対に見逃してはいけないか**」を出す:

### 読み順 (上から順に)

1. **Risk ヘッダ** (🔴 Breaking / 🟡 Caution / 🟢 Safe): 1+ Breaking があれば最優先で検証
2. **🤖 AI change-impact 要約**ボタン → 3 文を生成 (固定構造):
   - ① **Purpose**: この変更が実現しようとしているビジネス / プロダクト成果
   - ② **Touch points**: 変更を拾うべき下流コンポーネント (具体的な model / view 名)
   - ③ **Do-not-miss**: 素朴な diff 読みでは見落とす 1 点 (migration / CASCADE / stereotype 変化 等)
3. **🔀 Before/After 比較**ボタン → 前 IR と現 IR の ER 図を並置、視覚的 sanity check
4. **Reviewer checklist** (☑ rule-based、AI 不要): Risk × Impact から自動生成された actionable TODO:
   - 属性削除 → 「column-drop migration を計画」「N 箇所の referrer 修正」
   - CASCADE 追加 → 「削除の連鎖が意図通りか検証」
   - stereotype 変更 → 「ADR 記載を推奨」
   - view include 一致 → 「N 件の view を再確認」
   - sequence participant 一致 → 「sequence 図のフロー再検証」
5. **namespace 単位のグルーピング**: `auth (3 changes) / billing (1 change)` で機能単位に俯瞰
6. 各モデル行には **intent (「User は認証主体…」)** が斜体で出る — *何のための model か* を見失わない
7. **影響範囲 `<details>`**: `ref` / `view` / `participant` 別に列挙 → どこに波及するか明示
8. ER / Class 図上の **hotspot overlay** (緑=追加 / 橙=変更) で分布を視覚化

### レビュアーの判断基準

| 色 | 基準 | 例 |
| --- | --- | --- |
| 🔴 Breaking | 既存データ / 既存 caller が壊れる | model 削除 / attribute 削除 / nullable→not-null 昇格 / PK 変更 |
| 🟡 Caution | migration 手順 or ADR が必要 | stereotype 変更 / rename / CASCADE 追加 / UNIQUE 追加 / 型変更 / 非 null 追加 (default なし) |
| 🟢 Safe | 追加のみ、後方互換 | model 追加 / nullable 追加 / default 付き追加 / doc のみ変更 |

### 構造 diff が使えない場合

初回レビュー / snapshot 未保存のときは従来通り Layer 1〜4 の手順で。

Risk 分類の正本: `@umlay/core` の `buildIrDiffSummary` + `apps/web/lib/ir-diff-risk.ts`。
Checklist 生成ルール: `apps/web/lib/review-checklist.ts`。

## spec 1.3 のレビュー観点

- **trait (RFC 0034)**: 2 属性未満の trait は過抽象の可能性 (L044 info)。使われていない trait は L043 warn として出る。循環 include は L042 error
- **@composite (RFC 0033)**: 子 view id の typo が L038 warning で出るか確認。循環 (composite A → B → A) は L039 error
- **@abstract**: 実装されない抽象モデル (protocol 未経由で孤立) は設計意図を確認
- **@static / @readonly / @derived**: UML 修飾子が使われている場合、codegen target (Prisma / SQL / TS) への期待挙動をレビュアーが明示する
- **backtick ident**: `` `limit` `` 等が使われた場合、codegen 側 (Prisma / SQL) で quoted identifier として出すか否か、DBMS 方言に依存するので明示
- **ER 図のレイアウト**: テーブル数 ≥ 8 で direction 未指定は自動 DOWN — 必要なら `layout: direction(LR)` で上書き

## spec 1.6 のレビュー観点 (RFC 0038–0044 + RFC 0049)

メタデータバンドル機能を使った review チェックリスト:

| 観点 | 着目する directive / lint | 何を見る |
| --- | --- | --- |
| **所有者明示** | `@@owner(team:..., reviewer:...)` | aggregate_root / public-API model に owner が無いとフォロー不能。strict なら error 候補 |
| **ライフサイクル状態** | `@@status("in-review", blockedBy:...)` | merge 直前に `state == "in-review"` のまま残っていないか確認 |
| **ADR 紐付け** | `@@adrRef("ADR-xxx")` (L046 が `@@locked` 時に推奨) | 設計上重要な model に ADR 記録があるか |
| **自動取込の信頼度** | `@@provenance / @@confidence` | reverse-engineer 由来 (`confidence < 0.7`) を 1 つずつ昇格させる |
| **コンプライアンス** | `@@compliance(tags:["PII", "GDPR"])` | namespace / model / attribute 単位でタグが付いているか。L048 が PII 列に reject example 不在を warn |
| **ロックされた要素** | `@@locked(reason:...)` | L046 が常時 info で出す。CI で grep して PR 差分とクロスチェック可能 |
| **境界契約** | namespace `@@boundary(exposes:[...], hides:[...])` | L047 で幽霊参照 (rename / 削除取り残し) を検知 |
| **テスト可能な不変条件** | `@@inv(field:..., op:..., value:...)` + `@@example` | L049 で `@@example` と `@@inv` の矛盾を検知 — invariant が "string で書いてあるだけ" になっていないか |

### 推奨レビュー出力フォーマット

`umlay check --stats --json` で集計したものをまず確認 → 多発するルールから順に対処。

```sh
umlay check schema.umlay --stats --json | jq '.byRule[] | select(.severity != "info")'
```

→ 構造化されているので `change-impact-diff` / `plan-from-diff` の input にも流せる。

## 参照

- 文法: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- 予約語: [`packages/spec/src/index.ts`](../../packages/spec/src/index.ts)
- **Lint rule 正本**: [`packages/spec/src/lint-rules.md`](../../packages/spec/src/lint-rules.md)
- 型推論規則: [`packages/spec/src/type-inference.md`](../../packages/spec/src/type-inference.md)
- 関連 skill: [`write-uml`](./write-uml.md), [`evolve-schema`](./evolve-schema.md)
