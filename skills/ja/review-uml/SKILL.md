---
name: review-uml
version: 1.3.0
spec: "@umlay/spec >= 1.3.0 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, reviewer]
summary: Umlay DSL / IR を仕様準拠性・設計品質の両面から機械的にレビューする手順
description: 既存の Umlay DSL / IR をレビュー・監査・分析したいときに起動する。spec 準拠・lint 違反・設計リスクを検出し、`@review` / `@fix` 形式で返す。
references:
  grammar: ../../../packages/spec/src/grammar.md
  schema: ../../../packages/spec/src/ir.schema.json
  keywords: ../../../packages/spec/src/index.ts
---

# review-uml

## ゴール

`.umlay` ファイル (または IR JSON) を受け取り、以下の 3 レイヤで問題を検出する。

1. **Spec 違反** — パーサ / IR スキーマが受理しない形
2. **Lint 違反** — spec は通るが書き忘れや命名の問題
3. **設計リスク** — 構造的アンチパターン

## 入力 / 出力

| 項目 | 内容 |
| --- | --- |
| 入力 | `.umlay` テキスト または IR JSON (version 1.0) |
| 出力 | 指摘リスト (severity / 位置 / ルール ID / 修正候補) |

## ルールカタログ (正本参照)

レビューで使う全ルールは [`packages/spec/src/lint-rules.md`](../../packages/spec/src/lint-rules.md) を**正本**とし、本 skill では再掲しない。以下 5 カテゴリの prefix を理解したうえで、正本カタログのルール ID を参照する:

| Prefix | 用途 | Severity | 範囲 |
| --- | --- | --- | --- |
| **S** | Spec violation (文法違反、blocker) | error (blocker) | S01〜S99 |
| **L** | Lint (mode 依存の慣習違反) | mode-dependent | L001〜L199 |
| **R** | Risk (設計アンチパターン、heuristic) | warn / info | R01〜R99 |
| **W** | Warning (deprecated / experimental 使用等) | info | W001〜W099 |
| **C** | Compatibility (spec バージョン差分) | warn | C001〜C099 |

### Layer 1: Spec 違反 (blocker) — 正本: `lint-rules.md` S 節

- パーサ / IR schema validation が error として reject するパターン (S01〜S17)
- 全 mode で **error** (mandatory)
- 1 件でも該当すれば Layer 2/3 に進まず blocker として返す

### Layer 2: Lint 違反 — 正本: `lint-rules.md` L 節

- L001〜L016 (spec 0.8.0 時点)。Draft / Strict の重大度は正本参照
- `@@mode(strict)` で全ルール error 化する予定 (Phase 1.0 で固定、migration-guide-1.0.md)

### Layer 3: 設計リスク — 正本: `lint-rules.md` R 節

- R01〜R12 の構造ヒューリスティック
- 修正候補 (split / rename / 境界再設計) を指摘に添える

### Layer 4: Deprecated / Compatibility 通知 — 正本: `lint-rules.md` W / C 節

- W001/W002 (`@deprecated`/`@experimental` 要素の使用)
- C001/C002 (spec バージョン差分、`min-spec-version` 不整合)

## レビュー手順

### Step 1 — Spec 準拠性チェック

1. `.umlay` をパーサに通す (または構文を目視)
2. IR JSON を schema validation (Draft 2020-12) に通す
3. `lint-rules.md` S 節 (S01〜S17) を順にチェック
4. **1 件でも違反があれば以降の Layer に進まず、blocker として返す**

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
  - layer: spec
    rule: S03
    severity: error
    location: "ordering.Invoice"
    message: "Unknown stereotype '@master'. Allowed: entity / aggregate_root / value_object / service / interface"
    fix: "Replace '@master' with '@aggregate_root'"
  - layer: lint
    rule: L001
    severity: warn
    location: "ordering.Order.total"
    message: "Attribute lacks explicit visibility"
    fix: "Prefix with '-' (private) or '+' (public)"
  - layer: risk
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

## 参照

- 文法: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- 予約語: [`packages/spec/src/index.ts`](../../packages/spec/src/index.ts)
- **Lint rule 正本**: [`packages/spec/src/lint-rules.md`](../../packages/spec/src/lint-rules.md)
- 型推論規則: [`packages/spec/src/type-inference.md`](../../packages/spec/src/type-inference.md)
- 関連 skill: [`write-uml`](./write-uml.md), [`evolve-schema`](./evolve-schema.md)
