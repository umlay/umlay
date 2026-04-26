---
name: change-impact-diff
version: 1.5.0
spec: "@umlay/spec >= 1.5.0 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, reviewer, architect]
summary: baseline + current の Umlay IR ペアから「概念先行」の change-impact レポートを生成 (git 行 diff ではない)
description: 変更の「行」ではなく「意味」を知りたいときに起動する。2 本の `.umlay` / IR スナップショットから Purpose / Touch-points / Do-not-miss + リスク分類 + 影響スキャン + レビュー checklist を生成。Web Diff タブ外 (PR コメント / リリースノート / Slack) でも再利用可能な契約。
references:
  grammar: ../../../packages/spec/src/grammar.md
  schema: ../../../packages/spec/src/ir.schema.json
  keywords: ../../../packages/spec/src/index.ts
---

# change-impact-diff

## ゴール

2 本の IR (baseline → current) を入力に、**change-impact レポート**を作る。答えるべき問いは:

> 「この変更は**何のため**で、**どこに波及**し、素朴な行 diff 読者が**見落とす**のは何か」

「どの行 / 列が動いたか」は `git diff` の仕事。本 skill は Web Diff タブ / VS Code レビューストリップの裏にある再利用可能な契約を切り出し、AI エージェントが PR コメント / リリースノート / Slack 要約など任意の出口で同じ分析を吐けるようにする。

## 前提

| 項目 | 内容 |
| --- | --- |
| 入力 A | `baseline.ir.json` (or IR 1.0 に parse する `.umlay`) |
| 入力 B | `current.ir.json` (or `.umlay`) |
| 任意 | 著者の intent note (1-2 文)。無い場合は rationale.intent から引き、それも無ければ出力に欠落フラグを立てる |
| 出力 | 5 セクション構造化レポート (§8) |

両 IR は `version: "1.0"`, `kind: "UmlModel"` を満たすこと。バージョン跨ぎ diff は対象外。

## この skill が**やらない**こと

- **git 風** 差分 — 行 / 列は VCS の仕事
- 新 IR の**品質レビュー** — それは `review-uml`
- **実装計画** — それは `plan-from-diff` (姉妹 skill)
- **stereotype 推定** — それは `reverse-engineer`

スコープは**影響のみ** = リスク + 波及 + narrative。

## 決定論の条件

- §1-4 (risk / impact / namespace / checklist) は**決定論的** — 同じ IR ペア → 同じ出力。LLM 不使用
- §5 (Purpose / Touch-points / Do-not-miss) は **LLM が必要**で、3 文固定構造。temperature ≤ 0.3 で narrative を安定させる

## 1. リスク分類 (Breaking / Caution / Safe)

model レベル diff を歩き、field-level ルールで 3 バケツに分ける。

### Breaking (🔴) — 既存データ / 呼び出し元が壊れる

| 条件 | 例 |
| --- | --- |
| model 削除 | `model User` が current から消えた |
| attribute 削除 | `User.email` が消えた |
| NULL 許容 → 非 NULL | `name: string?` → `name: string!` |
| PK 変更 (identity / `@id` 移動) | `identity: [id]` → `identity: [tenantId, id]` |
| 必須 attribute 追加 (default 無し) | `currency: string!` を default 無しで追加 |

### Caution (🟡) — migration / ADR が要る

| 条件 | 例 |
| --- | --- |
| stereotype 変更 | `@entity` → `@aggregate_root` (カテゴリ跨ぎ) |
| rename (`_id` 同じ、`name` 違う) | `total` → `grandTotal` |
| 既存 `@ref` に `onDelete: CASCADE` 追加 | `RESTRICT` → `CASCADE` |
| 既存 attribute に `@unique` 追加 | |
| 型変更 | `int` → `bigint`、`string` → `UUID`、`decimal @scale(2)` → `@scale(4)` |

### Safe (🟢) — additive only、後方互換

| 条件 | 例 |
| --- | --- |
| model 追加 | `model InvoiceLine` 新規 |
| nullable attribute 追加 | `memo: string?` |
| 非 NULL + default 付き追加 | `status: OrderStatus! @default(DRAFT)` |
| ドキュメントのみ | `@@md` / `@@doc` テキスト |

**曖昧なら上に倒す** (Caution より Breaking、Safe より Caution)。誤検知はレビュワー 1 分、見逃した Breaking はリリース事故。

正本: reference 実装の `apps/web/lib/ir-diff-risk.ts`。

## 2. 影響スキャン (ref / view / participant)

変更されたモデル集合の各 `_id` について、**current** IR を歩いて以下を収集:

| 種別 | ルール |
| --- | --- |
| `ref` | `ref.target` がこの model を指す attribute (`User.id` / `auth.User.id` — 右から PascalCase を探す) |
| `view` | include パターン (`ns.Model` / `ns.*` / `**`) がこの model を含む view |
| `participant` | sequence 図の participant で、宣言 model がこの model に解決される |

**件数ではなく名前を全列挙**する。レビュワーは名前を見てフォロー PR を開くため。

正本: `apps/web/lib/impact-report.ts`。

## 3. Namespace グルーピング

詳細より先に namespace で纏める。feature 単位の俯瞰を先に渡すのが目的:

```
auth       (3 changes) — User, Session, PasswordReset
billing    (1 change)  — Invoice
```

namespace を跨ぐ変更 (例: `billing.Invoice` から `auth.User` への新規 FK) は**両方の namespace**に載せる:

```
auth    — User       (+ referenced by billing.Invoice.userId)
billing — Invoice    (+ new @ref → auth.User.id)
```

## 4. レビュー checklist (ルールベース、AI 不使用)

Risk × Impact をクロスして actionable TODO を出す:

| 条件 | checklist 項目 |
| --- | --- |
| attribute 削除 + 参照元 ≥ 1 | `DB column-drop migration を計画` + `N 箇所の参照元を修正: [Order.customerId, Report.customerId]` |
| `onDelete: CASCADE` 追加 | `cascade 削除が意図どおりか検証` |
| stereotype 変更 | `ADR で semantic シフトを記録` |
| view に変更 model が含まれる | `N 件の view を再レビュー: [auth-overview, senior-review]` |
| sequence participant が変更 model に解決 | `sequence フローを再検証: [checkout-happy-path]` |
| nullable → 非 NULL (default 無し) | `バックフィル migration を計画 / default 追加 or 2-phase デプロイ` |
| 新規 `@aggregate_root` model | `リポジトリ境界を確認 + @@inv を追加` |

**(target, action) で重複排除**。40 項目 checklist より 12 項目の方が効く。積極的にマージする。

正本: `apps/web/lib/review-checklist.ts`。

## 5. Purpose / Touch-points / Do-not-miss (LLM narrative)

**唯一** LLM で生成する部分。3 文構造固定、変更禁止。

### Prompt テンプレート

```
You are reviewing a change to a DSL model. Emit exactly three sentences
in this order and nothing else. No preamble, no bullets.

1. PURPOSE — What business / product outcome does this change enable?
   Lead with the noun, not "The change ...".
2. TOUCH POINTS — Which downstream components must pick this up? Cite
   specific model / view names from the impact list below.
3. DO-NOT-MISS — What is the one thing a naive diff read would miss
   (migration, cascade, semantic shift, ordering)?

---
AUTHOR INTENT (if provided): {{authorIntent or "none"}}
RATIONALE.INTENT OF CHANGED MODELS (if any):
{{modelIntents}}

RISK SUMMARY:
  breaking: {{breakingCount}} ({{breakingNames}})
  caution:  {{cautionCount}}  ({{cautionNames}})
  safe:     {{safeCount}}

IMPACT MAP (current IR):
{{impactYaml}}

STRUCTURAL DIFF:
{{modelDiffList}}
```

### 形が固定な理由

- **Intent + Impact を注入** → LLM は diff を paraphrase できない。変更の**目的**と**着地点**を書くしかない
- **文数固定** → 出力がキャッシュ可能・テスト可能・プロバイダ (Anthropic / OpenAI / WebGPU) 横断で安定
- **箇条書き・前置き無し** → PR コメント / Slack / リリースノートに再整形無しで貼れる

### 棄却すべき失敗

LLM が以下を返したら 1 回再生成し、ダメなら決定論セクションのみで narrative はフラグ付きで欠落として出す:

- 4 文以上 (「Also, ...」「Additionally, ...」)
- 「This PR ...」「The change ...」で始まる受動的な文
- 構造 diff の単なる言い換え

## 6. モデル intent の先行表示

各変更 model について、`rationale.intent` を model 名直下に**斜体で表示**。attribute diff より前に目的を置くのが狙い。

`rationale.intent` が無い場合は⚠️ フラグ — 著者がこの model の「なぜ」を失っている状態。

## 7. Before / After 視覚的 sanity check

可能なら baseline IR と current IR を ER (もしくは class) 図で並置描画。`@umlay/renderer-er` の `renderER` に `diffOverlay: { added, modified }` を渡す。追加 model は緑ハロー、変更 model は橙枠。内容ではなく視覚的 sanity check。

Slack 等の純テキスト出口で SVG 描画できない場合はスキップ。narrative + checklist で十分。

## 8. 出力形式

```yaml
meta:
  generated_at: 2026-04-24T06:00:00Z
  baseline_hash: <sha1 of baseline IR>
  current_hash:  <sha1 of current IR>

narrative:                                # §5
  purpose:        "..."
  touch_points:   "..."
  do_not_miss:    "..."

risk:                                     # §1
  breaking:  [User.email removed, Order.total → decimal @scale(4)]
  caution:   [User renamed email → contactEmail]
  safe:      [model InvoiceLine added]

groups:                                   # §3
  - namespace: auth
    changes:
      - model:   User
        intent: "認証エンドユーザ — セッションを持つが、データは持たない"
        delta:  { added: 0, removed: 1, modified: 1, renamed: 1 }
        impact:
          ref:         [Session.userId, Order.customerId]
          view:        [auth-overview, senior-review]
          participant: [checkout-happy-path]
  - namespace: billing
    changes: [...]

checklist:                                # §4
  - "User.email の DB column-drop migration を計画"
  - "2 箇所の参照元を修正: Session.userId, Order.customerId"
  - "auth-overview, senior-review を再レビュー"
```

renderer はこの YAML を Markdown / Slack ブロック / Web Diff タブのコンポーネント木に projection できる。

## 9. 手順

### Step 1 — load + 正規化
両入力を IR 1.0 に parse。`.umlay` なら `@umlay/core` を通す。version 不一致は reject。

### Step 2 — 構造 diff
`buildIrDiffSummary(baseline, current)` を呼ぶ (または model × attribute × relation × view × sequence を歩く)。added / removed / modified / renamed 集合を作る。

### Step 3 — リスク分類 (§1)
要素レベルの変更ごとに分類。結果を `_id` でキャッシュ。

### Step 4 — 影響スキャン (§2)
変更 model の `_id` について、current IR の refs / views / participants を走査。影響 map を構築。

### Step 5 — namespace グルーピング (§3) + intent 参照 (§6)
namespace ごとに纏める。`rationale.intent` を各変更 model で引く。欠落はフラグ。

### Step 6 — checklist 生成 (§4)
Risk × Impact クロス → ルール適用 → 重複排除。

### Step 7 — LLM narrative (§5)
`authorIntent` / 影響 map / 構造 diff を prompt に差し込む。temperature ≤ 0.3。形が崩れたら 1 回再生成、それでも駄目なら決定論セクションのみで narrative 欠落フラグ。

### Step 8 — 出力組立 (§8)
YAML を出す (または特定チャネル向けに Markdown / Slack に projection)。

## チェックリスト

- [ ] 両 IR が schema 1.0 で validation 済み
- [ ] 構造 diff (added / removed / modified / renamed) を生成済み
- [ ] 要素レベル変更が全て Breaking / Caution / Safe に分類済み
- [ ] 曖昧なケースは**上に倒して**いる (保守側)
- [ ] 影響スキャンは件数ではなく名前を全列挙
- [ ] namespace でクラスタ化、跨ぎ変更は両方に載せる
- [ ] 各変更 model に `rationale.intent` を表示 (欠落はフラグ)
- [ ] checklist は (target, action) で重複排除済み
- [ ] LLM narrative はちょうど 3 文、前置き無し
- [ ] narrative は**具体的な** model / view 名を引用している (一般論無し)
- [ ] 出力に baseline / current IR の hash を含む (再現性確保)

## 例 (抜粋)

入力 delta:

```diff
-  email     string! @unique
+  contactEmail string! @unique
+  phone     string?
```

出力 narrative:

> **Purpose**: 顧客接触経路を明示フィールドに集約し、CRM チームがリーチ可能列を推測せずアウトバウンド施策を打てる状態にする。
>
> **Touch points**: `auth.Session` と `billing.Order.customerId` は `User.id` を指すため FK 側は壊れないが、ER view 2 本 (`auth-overview` / `senior-review`) は再描画が要り、sequence `checkout-happy-path` が `User.email` を直接参照している (DSL 42 行目) ため書き換えが要る。
>
> **Do-not-miss**: これは純粋な追加ではなく **rename + 追加の複合**。migration で `email` → `contactEmail` をバックフィルしてから旧列を drop しないと、オープン中のセッションが次回 read で落ちる。

出力 checklist:

- DB カラム rename `email` → `contactEmail` + バックフィル migration を計画
- sequence `checkout-happy-path` 42 行目 (`.email` 参照) を更新
- view `auth-overview` / `senior-review` を再描画
- `phone` が意図どおりか確認 (新規 attribute、Caution)

## skill の拡張ポイント

- 違う**audience** (exec / architect / SRE) → LLM prompt の焦点だけ変え、構造セクションは触らない。3 文形は不変
- 違う**出口** (PR コメント / Slack / リリースノート) → §8 YAML の projection を変える。YAML 自体が契約
- 違う**リスクポリシー** (例: PostgreSQL 専用チームは `varchar` サイズ縮小を Breaking 扱いしたい) → §1 ルールを拡張、形は変えない

## 参照

- 文法: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- リスク分類の正本: `apps/web/lib/ir-diff-risk.ts` (reference 実装)
- 影響マップの正本: `apps/web/lib/impact-report.ts`
- checklist ルールの正本: `apps/web/lib/review-checklist.ts`
- 姉妹 skill: [`plan-from-diff`](./plan-from-diff.md) — impact の次に来る
- 上流: [`review-uml`](./review-uml.md) — 品質レビュー (impact ではない)
