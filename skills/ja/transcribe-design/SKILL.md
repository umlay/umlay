---
name: transcribe-design
version: 1.6.4
spec: "@umlay/spec >= 1.6.4 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, developer, architect]
summary: 既存の設計書 (自然言語) を `.umlay` の構造骨格に転記する。reverse-engineer の自然言語版
description: 既存の Markdown / Word / PDF / Confluence ページなどに書かれた設計仕様を、Umlay DSL (`.umlay`) の構造骨格 (model / attribute / 関係 / view ヒント) に転記したいときに起動する。`reverse-engineer` skill が「コード → .umlay」なのに対し、本 skill は「**自然言語ドキュメント → .umlay**」を担当する。
references:
  grammar: ../../../packages/spec/src/grammar.md
  schema: ../../../packages/spec/src/ir.schema.json
  keywords: ../../../packages/spec/src/index.ts
---

# transcribe-design

## ゴール

ドキュメント (自然言語仕様書 / 既存の設計書 / 議事録 / Wiki ページ等) を**入力**として、Umlay DSL の**構造骨格**を生成する。設計判断 (intent / invariant / stereotype 確定) は推測せず、**TODO ヘッダ + `@@confidence` で不確実性を明示**する。

`reverse-engineer` (コード→ `.umlay`) との関係:

| 観点 | `reverse-engineer` | **`transcribe-design`** |
| --- | --- | --- |
| 入力 | Prisma / SQL / TS (機械可読構造) | Markdown / 自然言語 (人間可読構造) |
| 決定論性 | 完全決定論 | LLM 必須 (NLU が要る) |
| 信頼度 | 高 (型情報そのまま) | 中〜低 (NL から推定) |
| stereotype | 推測しない (TODO に飛ばす) | 推測する (証拠とともに `@@confidence` で示す) |
| ペア用途 | 既存システムを Umlay 化 | 既存ドキュメントを Umlay 化 |

## 前提

| 項目 | 内容 |
| --- | --- |
| 入力 | 自然言語ドキュメント (Markdown / プレーンテキスト / PDF text 抽出) |
| 出力 | `.umlay` テキスト (UTF-8) + ファイル先頭 TODO ヘッダ |
| 対象外 | 図 (画像) のみのドキュメント — 別途 OCR / 人間記述が必要 |

## 抽出対象 (順序)

1. **namespace 候補** — ドキュメントのコンテキスト (機能名 / モジュール名 / 章タイトル)
2. **エンティティ / model** — 「〜情報」「〜マスタ」「〜テーブル」「〜オブジェクト」と書かれているもの
3. **attribute** — 各 model の項目一覧、データ型、必須/任意、長さ制約
4. **関係 (`@ref` / relation)** — 「〜に紐づく」「〜を参照」「〜を持つ」「〜の親 / 子」
5. **enum** — 「〜区分」「〜ステータス」「〜種別」+ 列挙値
6. **状態遷移** — 「draft → confirmed」のような遷移表 → state_machine view の候補
7. **業務ルール / 不変条件** — 「〜でなければならない」「〜以上」「〜の場合のみ」 → `@inv` / `@@inv` 候補 (model 級は header に置く)
8. **画面 / API のフロー** — シーケンス図 view の候補
9. **コンプライアンス / 個人情報** — 「個人情報」「PCI」「GDPR」 → `@@compliance(tags: [...])`
10. **owner / 担当チーム** — 「〜チームが管理」「〜担当」 → `@@owner(team: ..., reviewer: ...)`

## 決定論の境界 (LLM の自由度)

| やってよい | やってはいけない |
| --- | --- |
| 自然言語からの **stereotype 推定** (証拠 + `@@confidence` 同時記載) | **架空の attribute** を追加 |
| データ型の**推定** (「金額」→ `decimal`、「日付」→ `Timestamp`) | 元ドキュメントに無い**業務ルール**を invariant 化 |
| 名前の**英訳 / 正規化** (`@codegenName` で原典を保持) | **数値 / 列挙値**の捏造 |
| 関係の**多重度推定** (「複数の」→ `0..*`、「1 つの」→ `1..1`) | ステートメントを省略・要約 |

不確実な箇所はすべて **`@@confidence(0..1)`** + **`@@status("in-review")`** + **`@@doc("source: <ドキュメント引用>")`** で human reviewer に渡す。

## 出力テンプレート

```umlay
// --- transcribed-by transcribe-design (from <doc-name> @ <ISO date>) ---
// TODO(review-uml): @@confidence < 0.7 の model / attribute を確認
// TODO(architect):  @@inv / @@pre / @@post の業務ルール抽出を補完
// TODO(write-uml):  audience 別 view (@er_diagram / @sequence_diagram) を追加
// TODO(architect):  @@status を "active" に昇格 (in-review のまま残さない)

namespace <ns>

@@boundary(exposes: [...], hides: [...])      // ドキュメントから読み取れた範囲

enum <Status> {
  ...
}

model <Entity> @<stereotype>
  @intent("<原典からの引用 or AI 要約>")
  @inv("<業務ルール>")                         // 抽出した不変条件 (model レベル)
{
  @@confidence(0.6)                            // NL からの推定なので低め
  @@status("in-review", since: "<ISO date>")
  @@provenance(agent: "claude-opus-4-7", from: "<doc-name>", at: "<ISO date>")
  @@compliance(tags: ["PII"])                  // 該当する場合のみ

  +id          UUID! @id
  +<attr>      <type>! @maxLength(<n>)         // 制約も拾う
  +<attr2>     <type>? @@doc("source: '<原文>'")
}

view <ns>-er @er_diagram { include: <ns>.* }
```

**ポイント**:
- `@@confidence(0.6)` を model body に置く (header 不可、§位置ルール)
- 各属性 (特に推定型) には `@@doc("source: ...")` で原典引用を残す
- 拾った業務ルールは **model header の `@inv("...")`** に書く (L021 を満たすため)

## 手順

### Step 1 — 文書を section / 段落に分解
- 章・節 → namespace 候補
- 箇条書き → attribute 候補
- 表 → enum / state_machine 候補
- 「〜は〜を持つ」フレーズ → relation 候補

### Step 2 — エンティティ抽出
ドキュメント中の名詞を列挙、設計上の登場人物を抽出。重複・同義語を統合。

### Step 3 — model header の起こし
各エンティティについて:
- stereotype を**証拠に基づき**推定 (集約境界 / 値オブジェクト / サービス):
  - 「〜マスタ」「〜情報」 + ID + 子要素を持つ → `@aggregate_root` (`@@confidence(0.7)`)
  - 「〜の値」「〜区分」 + ID なし or 単純属性のみ → `@value_object` (`@@confidence(0.8)`)
  - 「〜サービス」「〜管理」 → `@service` (`@@confidence(0.6)`)
  - 不明 → `@entity` (`@@confidence(0.5)`)
- `@intent` に**原典の 1〜3 文を引用**

### Step 4 — attribute の起こし
データ型を**ドキュメントから判定**:

| ドキュメントの記述 | Umlay 型 |
| --- | --- |
| 「金額」「合計」「単価」 | `decimal!` (+ `@scale(2)`) |
| 「ID」「識別子」 | `UUID!` |
| 「日付」「日」 | `Date!` |
| 「日時」「タイムスタンプ」 | `Timestamp!` |
| 「フラグ」「有効/無効」 | `bool!` |
| 「件数」「個数」 | `int!` |
| 「名前」「タイトル」「説明」 | `string!` (長さ制約付きが望ましい) |
| 「メールアドレス」 | `string! @pattern("^[^@]+@[^@]+$")` |

長さ制約 (「最大 1024 文字」) は `@maxLength(1024)` に。

### Step 5 — 関係の起こし
- 「1 つの A は複数の B を持つ」 → `A` model に composition / `0..*` relation
- 「B は A を参照する」 → `B.aId UUID! @ref(A.id)` 属性
- カスケード削除の指示があれば `onDelete: CASCADE`

### Step 6 — enum の起こし
箇条書きの「〜区分: A / B / C」「ステータス: 下書き / 確定 / 出荷済」を `enum` に。
**前置き `@@doc(...)`** で 1 文要約 (1.4+ で OK):

```umlay
@@doc("注文ライフサイクル — draft → confirmed → shipped の片道遷移")
enum OrderStatus { DRAFT, CONFIRMED, SHIPPED, CANCELLED }
```

### Step 7 — 業務ルール / invariant の起こし
- 「金額は 0 以上」 → `@inv("total >= 0")`
- 「1 顧客につき 1 件」 → `@inv("customer.id is unique")`
- 「メアドは @ を含む」 → `@inv("contains(email, '@')")`
- model header に置く (L021 を満たすため)

### Step 8 — view 候補の宣言
- 全体俯瞰: `view all-er @er_diagram { include: <ns>.* }`
- audience 別: 章タイトルから抽出 (例: 「営業向け」「管理者向け」)
- 状態遷移が見つかれば: `view <X>-states @state_machine { include: <ns>.<X> }`

### Step 9 — TODO ヘッダで人間に渡す
ファイル先頭に何を確認すべきかを箇条書き:

```umlay
// TODO(review-uml): @@confidence < 0.7 の以下を確認
//   - shop.Order   (stereotype 推定: @aggregate_root, 0.6)
//   - shop.Address (stereotype 推定: @value_object, 0.5)
// TODO(architect):  以下の業務ルールが invariant として正しいか
//   - "送料は購入額に応じて変動" (動的ルール、固定 invariant に落とせない可能性)
// TODO(write-uml):  以下の view を追加検討
//   - 状態遷移図 (Order.status)
//   - sequence: 注文確定フロー
```

### Step 10 — 引き渡し
出力した `.umlay` を:
1. `umlay check <file>` で parse + lint pass を確認
2. `review-uml` skill で品質監査
3. 不確実な箇所を人間が確認 → `@@status("active")` に昇格、`@@confidence` を 0.9+ に

## チェックリスト

- [ ] 入力ドキュメント名と取り込み日時を TODO ヘッダに記録
- [ ] 各 model に `@@provenance` + `@@confidence` + `@@status("in-review")` を付けた
- [ ] 推定 stereotype の根拠を `@intent` または `@@doc("source: ...")` で記録
- [ ] 業務ルールは **model header の `@inv("...")`** に書いた (L021 を満たす)
- [ ] enum の値順は原典の表記順を保持
- [ ] 不確実な型 (例: 数値 → int / decimal / bigint いずれか) は最も狭い safe な選択 (`int`) + `@@doc` でフラグ
- [ ] PII / 機密情報の手がかりがあれば `@@compliance(tags: [...])` を付けた
- [ ] `umlay check` で parse error ゼロ
- [ ] `review-uml` で監査依頼を出した

## 例 — Markdown 設計書 → `.umlay`

入力 (Markdown 抜粋):

```markdown
## 注文管理

### 注文 (Order)

注文は顧客が商品を購入する単位です。各注文は 1 人の顧客に紐づき、複数の注文明細を持ちます。

| 項目 | 型 | 必須 | 説明 |
|------|------|------|------|
| 注文ID | UUID | ○ | 主キー |
| 顧客ID | UUID | ○ | 顧客への参照 |
| 合計金額 | 数値 (小数点以下 2 桁) | ○ | 0 以上 |
| ステータス | 下書き / 確定 / 出荷済 / キャンセル | ○ | 初期値: 下書き |
| 作成日時 | タイムスタンプ | ○ | |

業務ルール:
- 合計金額は 0 以上
- ステータスの遷移は 下書き → 確定 → 出荷済 の単方向のみ
- キャンセルはどの状態からでも可能

担当: 注文チーム (@order-team)
```

出力 `.umlay`:

```umlay
// --- transcribed-by transcribe-design (from order-spec.md @ 2026-04-27) ---
// TODO(review-uml): @@confidence < 0.7 を確認
//   - shop.Order (stereotype @aggregate_root, 0.7)
// TODO(architect):  ステータス遷移 (DRAFT→CONFIRMED→SHIPPED + CANCELLED) を
//                   state_machine view として追加検討
// TODO(architect):  状態遷移の制約は @inv だけでなく fn confirm() の @pre/@post で
//                   表現すべきか検討

namespace shop

@@doc("注文ライフサイクル — DRAFT → CONFIRMED → SHIPPED の片道、+ CANCELLED")
enum OrderStatus { DRAFT, CONFIRMED, SHIPPED, CANCELLED }

model Order @aggregate_root
  @intent("注文は顧客が商品を購入する単位")
  @inv("totalAmount >= 0")
{
  @@confidence(0.7)
  @@status("in-review", since: "2026-04-27")
  @@provenance(agent: "claude-opus-4-7", from: "order-spec.md", at: "2026-04-27")
  @@owner(team: "order-team")

  +id          UUID!         @id
  +customerId  UUID!         @ref(Customer.id, onDelete: RESTRICT)
                             @@doc("source: '顧客への参照'")
  +totalAmount decimal!      @scale(2)
                             @@doc("source: '合計金額。0 以上'")
  +status      OrderStatus!  @default(DRAFT)
  +createdAt   Timestamp!
}

// model Customer は本ドキュメント外 — write-uml で別途定義してください
// TODO(write-uml): Customer model を別ファイルで作成し import する

view orders-er @er_diagram { include: shop.* }
```

## 参照

- 文法: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- 姉妹 skill: [`reverse-engineer`](../reverse-engineer/SKILL.md) (コード→ `.umlay`)
- 次工程 skill: [`review-uml`](../review-uml/SKILL.md) — 出力を必ずレビューに通す
- 補完 skill: [`write-uml`](../write-uml/SKILL.md) — 不足している view / @@inv を追加
