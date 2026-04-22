# Umlay DSL RFCs

DSL / IR の仕様変更を追跡する場所。[CONTRIBUTING.md](../../../../CONTRIBUTING.md) の RFC 手順に従って提案を起票する。

## ディレクトリ構成

```
rfcs/
├── README.md              (本ファイル、RFC の手順とインデックス)
├── _template.md           (新規 RFC のテンプレート)
└── NNNN-<slug>.md         (承認された / 検討中の RFC 本体)
```

## RFC インデックス

| # | slug | title | status | target | class |
| --- | --- | --- | --- | --- | --- |
| [0001](./0001-bnf-formalization.md) | bnf-formalization | DSL 文法の BNF 正式化 | **accepted** | 0.2.0 | A |
| [0002](./0002-view-layout-syntax.md) | view-layout-syntax | view `layout:` の具体構文 | **accepted** | 0.2.0 | A |
| [0003](./0003-sequence-alt-else.md) | sequence-alt-else | Sequence `alt` の `else` 分岐 | **accepted** | 0.2.0 | A |
| [0004](./0004-sample-data.md) | sample-data | `@@sample(...)` インスタンスデータ構文 | **accepted** | 0.2.0 | A |
| [0005](./0005-cross-namespace-dependencies.md) | cross-namespace-dependencies | Cross-namespace `@@dependencies` | **accepted** | 0.2.0 | A |
| [0006](./0006-protocol-union-module.md) | protocol-union-module | `protocol<T>` / `union` / `module` 宣言構文 | **accepted** | 0.2.0 | A |
| [0007](./0007-opt-par-sequence.md) | opt-par-sequence | Sequence の `opt` / `par` ブロック | **accepted** | 0.3.0 | A |
| [0008](./0008-sample-external-file.md) | sample-external-file | `@@sample(from: "...")` 外部ファイル参照 | **accepted** | 0.3.0 | A |
| [0009](./0009-import-cross-file.md) | import-cross-file | `import` 構文による cross-file 解決 | **accepted** | 0.3.0 | A/B |
| [0010](./0010-protocol-union-enhancements.md) | protocol-union-enhancements | `protocol` 多重継承 + `union` payload variant | **accepted** | 0.3.0 | A |
| [0011](./0011-diamond-inheritance-mro.md) | diamond-inheritance-mro | Diamond 継承の C3 linearization / `@@override` | **accepted** | 0.4.0 | A |
| [0012](./0012-recursive-union-variants.md) | recursive-union-variants | `union` の再帰 variant (AST / Tree) | **accepted** | 0.4.0 | A |
| [0013](./0013-par-branch-sync.md) | par-branch-sync | `par` ブランチ同期 `await all/any/partial/timeout` | **accepted** | 0.4.0 | A |
| [0014](./0014-wildcard-import.md) | wildcard-import | Glob import (`import "./tasks/*.umlay"`) | **accepted** | 0.4.0 | A |
| [0015](./0015-type-parameter-bounds.md) | type-parameter-bounds | 型パラメータ制約 `<T: Foo & Bar>` | **accepted** | 0.5.0 | A |
| [0016](./0016-impl-blocks.md) | impl-blocks | Rust 風 `impl` ブロック | **accepted** | 0.5.0 | A |
| [0017](./0017-critical-sequence-region.md) | critical-sequence-region | Sequence の `critical` リージョン | **accepted** | 0.5.0 | A |
| [0018](./0018-recursive-variant-terminating-check.md) | recursive-variant-terminating-check | Recursive union の well-foundedness 検査 | **accepted** | 0.5.0 | A |
| [0019](./0019-type-parameter-variance.md) | type-parameter-variance | 型パラメータ variance `<out T>` / `<in T>` | **accepted** | 0.6.0 | A |
| [0020](./0020-blanket-impl.md) | blanket-impl | Blanket `impl<T> P for T where (T: Q)` | **accepted** | 0.6.0 | A |
| [0021](./0021-critical-timeout.md) | critical-timeout | `critical` に timeout / catch / finally | **accepted** | 0.6.0 | A |
| [0022](./0022-wellfoundedness-formal-algorithm.md) | wellfoundedness-formal-algorithm | Well-foundedness 検査アルゴリズムの形式仕様 | **accepted** | 0.6.0 | A |
| [0023](./0023-deprecated-syntax.md) | deprecated-syntax | `@deprecated` の正式仕様化 | **accepted** | 0.7.0 | A |
| [0024](./0024-gantt-critical-path.md) | gantt-critical-path | Gantt の Critical Path Method (CPM) 計算 | **accepted** | 0.7.0 | A |
| [0025](./0025-codegen-hooks.md) | codegen-hooks | `@@codegen` 拡張フック | **accepted** | 0.7.0 | A |
| [0026](./0026-id-hash-algorithm.md) | id-hash-algorithm | IR `_id` ハッシュアルゴリズム形式仕様 | **accepted** | 0.7.0 | A |
| [0027](./0027-experimental-annotation.md) | experimental-annotation | `@experimental` 新機能マーカー | **accepted** | 0.8.0 | A |
| [0028](./0028-critical-retry.md) | critical-retry | `critical ... retry({attempts, backoff, jitter})` 自動再試行 | **accepted** | 0.8.0 | A |
| [0029](./0029-lint-rule-catalog.md) | lint-rule-catalog | Lint ルールカタログの標準化 (S/L/R/W/C 番号体系) | **accepted** | 0.8.0 | A |
| [0030](./0030-type-inference-rules.md) | type-inference-rules | 型推論規則の形式化 | **accepted** | 0.8.0 | A |
| [0031](./0031-markdown-integration.md) | markdown-integration | Markdown 統合 4 レイヤー (`@@md` / trailer / `.umlay.md` literate) | **accepted** | 1.1.0 | A |

status: draft → open → accepted / rejected / superseded

## RFC 番号割当

- 0001〜0099: DSL 文法 / 構文
- 0100〜0199: IR スキーマ
- 0200〜0299: 予約語の正規化
- 0300〜0399: View / 描画の仕様
- 0400〜0499: ツール連携 (skill / codegen)

`NNNN` は未使用の最小 4 桁 0 埋め番号。

## RFC のライフサイクル

1. **Draft** — `_template.md` を元に `NNNN-<slug>.md` を作成、PR 提出
2. **Open for comments** — コメント期間 (最低 7 日)
3. **Accepted** — spec 本体 (`grammar.md` / `grammar.bnf` / `ir.schema.json` / `index.ts`) を更新
4. **Rejected** — 理由を明記してクローズ (参考として残置)
5. **Superseded** — 後続 RFC が取って代わった場合、ヘッダに記載

## 関連

- [CONTRIBUTING.md](../../../../CONTRIBUTING.md) — RFC 起票手順
- [grammar.md](../grammar.md) — 現行文法 (散文)
- [grammar.bnf](../grammar.bnf) — 現行文法 (形式、W3C EBNF)
- [ir.schema.json](../ir.schema.json) — 正規IR schema
- [skills/ja/evolve-schema.md](../../../../skills/ja/evolve-schema.md) — 変更分類 (A / B / C)
