# VS Code 拡張

**Umlay** VS Code 拡張は Umlay の体験をエディタ内で完結させます — Language
Server、ライブ診断、Web エディタと同じビジュアライザ、19 種のスニペット、
コンテキスト認識の補完を含みます。

拡張は参照実装リポジトリから配信され、ビューア側の React コンポーネントは
`@umlay/webview-ui` を通じて Web エディタと**完全共有**。Web と VS Code の
UX がずれません。

## インストール

### Marketplace(公開準備中)

```sh
code --install-extension keydrop.umlay-vscode
```

### ローカル `.vsix`

1. [リリースアセット](https://github.com/e98AZQZxMsYeMNm/uml.keydrop.net/releases)
   から `.vsix` をダウンロード(または下記でビルド)
2. VS Code: **Extensions → `…` メニュー → Install from VSIX…**
3. または CLI: `code --install-extension umlay-vscode-<version>.vsix`

### ローカルビルド

```sh
git clone https://github.com/e98AZQZxMsYeMNm/uml.keydrop.net.git
cd uml.keydrop.net && pnpm install
pnpm -F umlay-vscode package    # → apps/vscode/umlay-vscode-<v>.vsix
```

## 機能一覧

| 機能 | 使い方 |
| --- | --- |
| シンタックスハイライト | `.umlay` + `.umlay.md`(Markdown 注入) |
| 診断(54 ルール) | Problems パネル + 波線 |
| Hover | モデルの intent / `@@doc` / `@@md` / 属性一覧 |
| Go to Definition | F12 で `@ref(X.y)` / dotted 型 / view-id に跳躍 |
| 補完 | `@stereotype` / `@@directive` / view kind / `@ref` / `include:` |
| Document Symbols | Outline パネル + breadcrumbs |
| Rename | F2 でモデル/enum 名を一括変更 |
| Quick Fix | L001 / L002 / L008 の自動修正 |
| Format Document | ⇧⌥F — `irToDsl` で正規化 |
| **プレビュー** | タブ (All / 個別 view / Document) + ズーム/パン/ジャンプ |
| **診断サイドバー** | クリックで該当行へ遷移 |
| **テーマ連動** | ダーク/ライト/高コントラストで配色自動切替 |

## プレビューの操作

- **モデルボックスをクリック** → エディタが該当行へジャンプ
- 右の**診断エントリをクリック** → エラー箇所へ遷移
- `+` / `-` / `0` / `F` キーでズーム操作(in / out / reset / fit)
- スケールは view 単位で永続化(localStorage)
- **`.umlay.md` リテラット形式** — Markdown 内の ` ```umlay ` フェンスを
  すべて結合して 1 IR として描画

## 設定

| 設定キー | デフォルト | 用途 |
| --- | --- | --- |
| `umlay.diagnostics.mode` | `draft` | `strict` にすると多くのルールが error に昇格 |
| `umlay.preview.autoRefresh` | `true` | 保存/編集時に自動再レンダリング |

## アーキテクチャ

```
.umlay ソース
   │
   ├─ @umlay/core (parse → IR)
   │    │
   │    ├─ @umlay/lint           (54 ルール)
   │    ├─ @umlay/renderer-er    (10 view kind → SVG)
   │    └─ @umlay/webview-ui     (React 共通コンポーネント — apps/web と共有)
   │
   └─ @umlay/lsp  (診断 / hover / goto / 補完 / symbols / format / rename / code actions)
        ▲
        │ stdio IPC
        │
   VS Code host ──▶ Webview (React プレビュー)
```

LSP + React プレビューを `dist/` にバンドルし、**ランタイムで workspace
依存なし**で動きます。

## スクリーンショット

<!--
以下を `apps/vscode/icons/screenshots/` に配置するとここから参照されます:
  - preview-dark.png   ダークテーマの split view + 診断
  - preview-light.png  ライトテーマ同等
  - hover.png          モデル hover 時のポップオーバー
  - completion.png     コンテキスト補完
-->

| | |
| --- | --- |
| ![ダークテーマ](https://raw.githubusercontent.com/e98AZQZxMsYeMNm/uml.keydrop.net/main/apps/vscode/icons/screenshots/preview-dark.png) | ![Hover](https://raw.githubusercontent.com/e98AZQZxMsYeMNm/uml.keydrop.net/main/apps/vscode/icons/screenshots/hover.png) |

## リンク

- 参照実装: https://github.com/e98AZQZxMsYeMNm/uml.keydrop.net
- Web エディタ: https://umlay.keydrop.net
- [English version](../en/vscode-extension.md)
