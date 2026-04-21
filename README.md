# Umlay

> **UML, relaid.** — レガシーUMLを現代のNode/クラウド/AI時代に置き直すモデリングツール。

Umlay は、UML / ER をテキスト DSL として記述し、Git/PR でレビュー可能な形で扱うためのモデリング基盤です。このリポジトリでは **DSL 仕様 (spec) / サンプル (examples) / 開発者・AI 向け skill 定義 (skills)** を公開します。実装 (パーサ、Lint、レンダラー、Web エディタ) は別リポジトリで開発中です。

## このリポジトリの構成

```
umlay-oss/
├── packages/
│   ├── spec/       # DSL 文法 + 正規IR の JSON Schema (契約)
│   └── examples/   # サンプル .umlay ファイル
├── skills/         # 開発者 / AI エージェント向けの skill 定義
└── docs/           # 公開向けドキュメント (日本語 / English)
```

| パッケージ | 用途 | ライセンス |
| --- | --- | --- |
| `@umlay/spec` | DSL 文法 & 正規IR JSON Schema | Apache-2.0 |
| `@umlay/examples` | サンプル DSL | MIT |

## 仕様

- [`packages/spec/src/grammar.md`](./packages/spec/src/grammar.md) — BNF 文法と予約語一覧
- [`packages/spec/src/ir.schema.json`](./packages/spec/src/ir.schema.json) — 正規IR の JSON Schema (Draft 2020-12)

## サンプル

[`packages/examples/samples/`](./packages/examples/samples/) に最小例からマルチテナント、Gantt までの `.umlay` ファイルを用意しています。

## Skills (開発者 / AI 向け仕様)

[`skills/`](./skills/) に、Umlay DSL を扱う開発者および AI エージェント向けの skill 定義を配置します。

## ドキュメント

[`docs/`](./docs/) に、日本語・英語それぞれ 7 本の利用者向けドキュメントを用意しています: overview / getting-started / dsl-guide / ir-guide / design-principles / roadmap / faq。

## クイックスタート

```bash
pnpm install
pnpm typecheck
pnpm build
```

Node バージョンは `.node-version` に固定されています (Volta / fnm / nvm 対応)。

## コントリビュート

[`CONTRIBUTING.md`](./CONTRIBUTING.md) を参照してください。DSL / IR 変更は契約変更となるため特に慎重な手順が必要です。脆弱性報告は [`.github/SECURITY.md`](./.github/SECURITY.md) に従ってください。

## ライセンス

`packages/spec` は Apache License 2.0、`packages/examples` は MIT、`skills/` 配下は各ファイルヘッダに従います。詳細は [`LICENSE`](./LICENSE) および [`NOTICE`](./NOTICE) を参照してください。

---

Maintained by [Keydrop](https://www.keydrop.net).
