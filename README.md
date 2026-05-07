# Umlay

> **UML, relaid.** — レガシーUMLを現代のNode/クラウド/AI時代に置き直すモデリングツール。

[![spec](https://img.shields.io/badge/spec-1.10.0-3b82f6)](./packages/spec)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-green.svg)](./LICENSE)
[![License: MIT (examples)](https://img.shields.io/badge/examples-MIT-blue.svg)](./packages/examples)
[![GitHub Repo stars](https://img.shields.io/github/stars/umlay/umlay?style=social)](https://github.com/umlay/umlay)
[![Website](https://img.shields.io/badge/web-umlay.keydrop.net-0ea5e9)](https://umlay.keydrop.net)
[![VS Code](https://img.shields.io/visual-studio-marketplace/v/Umlay.umlay?label=VS%20Code&color=007acc)](https://marketplace.visualstudio.com/items?itemName=Umlay.umlay)
[![npm](https://img.shields.io/npm/v/%40umlay%2Fcli?label=%40umlay%2Fcli&color=cb3837)](https://www.npmjs.com/package/@umlay/cli)
[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%98%95%20ofuse.me-ec4899)](https://ofuse.me/umlay)

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

## Umlay を使う

| ツール | リンク | 用途 |
| --- | --- | --- |
| **Web エディタ** | [umlay.keydrop.net](https://umlay.keydrop.net/) | ブラウザだけで動く完全 OSS のオンラインエディタ |
| **VS Code 拡張** | [Marketplace `Umlay.umlay`](https://marketplace.visualstudio.com/items?itemName=Umlay.umlay) | エディタ統合 — シンタックスハイライト / 診断 / プレビュー / F12 / F2 / フォーマット |
| **CLI** | `npm i -g @umlay/cli` | parse / lint / render `.umlay` をコマンドラインで |

## 仕様

- [`packages/spec/src/grammar.md`](./packages/spec/src/grammar.md) — BNF 文法と予約語一覧
- [`packages/spec/src/ir.schema.json`](./packages/spec/src/ir.schema.json) — 正規IR の JSON Schema (Draft 2020-12)

最新は **spec 1.10.0** ([RFC 0055](./packages/spec/src/rfcs/0055-flowchart-diagram.md))
で **`@flowchart_diagram`** 古典フローチャート view kind が加わり、対応 lint
**L059–L064** が追加されました。view kind は計 12 種をサポートします。

## サンプル

[`packages/examples/samples/`](./packages/examples/samples/) に最小例からマルチテナント、Gantt までの `.umlay` ファイルを用意しています。

## Skills (開発者 / AI 向け仕様)

[`skills/`](./skills/) に、Umlay DSL を扱う開発者および AI エージェント向けの skill 定義を配置します。

## ドキュメント

[`docs/`](./docs/) に、日本語・英語それぞれの利用者向けドキュメントを用意しています:
overview / getting-started / dsl-guide / ir-guide / design-principles /
roadmap / faq / lsp-integration / migration-guide-1.0 /
**vscode-extension**。

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

## Sponsor

Umlay の開発を支援いただける場合は [ofuse.me](https://ofuse.me/umlay) からお願いします。いただいたサポートはドキュメント整備 / 新しい view kind の実装 / AI 協働ループの改善に使います。

---

Maintained by [Keydrop](https://www.keydrop.net).
