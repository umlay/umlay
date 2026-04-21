# Conformance Reports

実装 (別リポジトリのパーサ / レンダラー) が `@umlay/spec` のどこまで準拠しているかを**自己申告**する場所。

## フォルダ構成

```
reports/
├── README.md                (本ファイル)
├── TEMPLATE.md              (新規実装が fork するレポートのテンプレート)
├── umlay-parser-ts-0.1.0.md (サンプル雛形レポート、参考)
└── <impl-name>-<version>.md (実装ごとのレポート本体、PR で追加)
```

## レポート命名

- `<impl-name>-<version>.md`
- 例: `umlay-parser-ts-1.2.0.md`, `acme-renderer-0.1.0.md`

## レポートの書き方

1. [`TEMPLATE.md`](./TEMPLATE.md) をコピー
2. Frontmatter (実装名 / バージョン / 対象 spec バージョン / level) を埋める
3. `manifest.yaml` の 17 サンプル × L1/L2/L3 のマトリクスで pass/fail を記録
4. fail の場合は理由を明示 (例: "RFC 0013 await 未対応")
5. サマリスコア (`passed/total`) を計算
6. PR で本リポジトリに提出、maintainer がマージ

## 3 レベル (復習)

| Level | 要件 |
| --- | --- |
| **L1 parse** | `grammar.bnf` 準拠で 17 サンプルが parse error 無しで受理される |
| **L2 IR** | parse 結果が `ir.schema.json` 準拠、`expected-ir/*.ir.json` と構造同一 (`_id` 除く) |
| **L3 render** | 各サンプルの全 view が描画可能 (視覚出力形式は実装自由) |

## 集計ダッシュボード (将来)

本ディレクトリに `index.json` を自動生成し、全実装の score を集計する predictor を整備予定:

```jsonc
{
  "implementations": [
    { "name": "umlay-parser-ts", "version": "1.2.0", "l1": 17, "l2": 10, "l3": 0, "of": 17 },
    { "name": "acme-renderer",   "version": "0.1.0", "l1": 17, "l2": 17, "l3": 12, "of": 17 }
  ]
}
```

## 関連

- [`../manifest.yaml`](../manifest.yaml) — テスト対象マトリクス
- [`../expected-ir/`](../expected-ir/) — L2 検証用の期待 IR
- [`../../grammar.bnf`](../../grammar.bnf) — L1 検証の基準
- [`../../ir.schema.json`](../../ir.schema.json) — IR の正本
