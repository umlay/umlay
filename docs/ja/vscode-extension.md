# VS Code 拡張

**Umlay** VS Code 拡張は Umlay の体験をエディタ内で完結させます — Language
Server、ライブ診断、Web エディタと同じビジュアライザ、19 種のスニペット、
コンテキスト認識の補完、ワークスペース横断ナビゲーション、オプトイン
レビューアシスタントを含みます。

ビューア側の React コンポーネントは `@umlay/webview-ui` を通じて Web
エディタと**完全共有**しているため、Web と VS Code の UX は常に揃います。

## インストール

### Marketplace

```sh
code --install-extension Umlay.umlay
```

[Marketplace ページ](https://marketplace.visualstudio.com/items?itemName=Umlay.umlay)
もしくは VS Code の Extensions サイドバーから「Umlay」を検索してください。

### ローカル `.vsix`

1. [リリースアセット](https://github.com/e98AZQZxMsYeMNm/uml.keydrop.net/releases) から `.vsix` をダウンロード
2. **Extensions → `…` → Install from VSIX…**
   または `code --install-extension umlay-<version>.vsix`

### ローカルビルド

```sh
git clone https://github.com/e98AZQZxMsYeMNm/uml.keydrop.net.git
cd uml.keydrop.net && pnpm install
pnpm -F umlay package    # → apps/vscode/umlay-<version>.vsix
```

## 機能一覧

| 領域 | 機能 |
| --- | --- |
| **言語サポート** | シンタックスハイライト (`.umlay` + `.umlay.md` Markdown 注入) / Hover (intent + `@@doc` + `@@md` + 属性一覧) / F12 Go to Definition / F2 Rename / `⌘.` Quick Fix / `⇧⌥F` フォーマット (canonical → `irToDsl`) / 19 種のスニペット |
| **診断** | L001–L058 + S/W/C/R 系の lint ルール、`umlay.diagnostics.mode` で `draft`/`beta`/`strict` 切替、`disabledRules` / `severityOverrides` で個別調整 |
| **プレビュー** | タブ (All / Document / 個別 view) + per-view ズーム/パン + Document タブの IR-driven インライン図 (lazy mount) + Reference Docs 風レイアウト + 8 テーマプリセット (高コントラスト含む) |
| **ワークスペースツリー** | Activity Bar に "Umlay" エントリ — 全 `.umlay` ファイル横断のファイル → namespace → model/enum 3 階層、ステレオタイプ別アイコン、各ファイルに lint バッジ (`2⚠ 5ℹ`) |
| **ナビゲーション** | クイックスイッチャー (`Ctrl/Cmd+Alt+U`) で view + model fuzzy 検索 / `Alt+1〜9` で n 番目 view / `Alt+0` All / `Alt+D` Document / `F8` 次の診断 / `Show in Umlay` (TS/Prisma/SQL の model 名から `.umlay` 宣言にジャンプ) |
| **ステータスバー** | mode (クリックで設定 UI) / lint count (✗⚠ℹ — クリックで次の診断) / 現在のテーマ (クリックで切替メニュー) |
| **エクスポート** | 1 view または All views を SVG / PNG (`umlay.export.defaultDpi` で解像度) として出力 |
| **差分レビュー** | baseline IR を `workspaceState` に保存し、追加/変更/削除を hotspot オーバーレイ + Document タブの差分サマリで表示 |
| **レビューアシスタント (オプトイン)** | `umlay.ai.enabled = true` で有効化。Anthropic / OpenAI どちらかの API キーを `vscode.SecretStorage` に保管 (settings.json には出さない)、`Umlay: Run Review Assistant` でアクティブな `.umlay` を SSE ストリームでレビュー (Output Channel に逐次出力) |

## キーボードショートカット

| 操作 | キー (mac/Win) |
| --- | --- |
| n 番目 view を開く | `Alt+1` 〜 `Alt+9` |
| All タブ / Document タブ | `Alt+0` / `Alt+D` |
| 次/前の診断 (プレビュー内) | `F8` / `Shift+F8` |
| 次/前の診断 (エディタから) | `Cmd/Ctrl+F8` / `Cmd/Ctrl+Shift+F8` |
| クイックスイッチャー | `Cmd/Ctrl+Alt+U` |
| プレビュー内の find widget | `Cmd/Ctrl+F` (VS Code 標準) |

## 設定 (`umlay.*`)

Settings UI で `umlay.` を検索してください。主要なものを抜粋:

| カテゴリ | 設定 (例) | 役割 |
| --- | --- | --- |
| **diagnostics** | `mode` / `disabledRules` / `severityOverrides` / `autoFixOnSave` | lint mode / ルール抑制 / 重要度上書き / 保存時自動修正 |
| **preview** | `theme` / `defaultTab` / `tabIcons` / `refreshDebounceMs` / `showDiagnosticsSidebar` / `diagnosticsSidebarWidth` | テーマ自動/手動 / 初期タブ / kind アイコン / 編集→再描画遅延 / サイドバー表示 + 幅 |
| **document** | `showInlineDiagrams` / `maxInlineDiagramSize` / `density` / `showStereotypeBadges` | Document タブのインライン SVG / 1 図上限 byte / 余白密度 / chip 表示 |
| **render** | `showReviews` / `allViewsLayout` / `zoomBehavior` | `@review`/`@fix` 注釈 / All Views の grid/column/row / per-view 初期ズーム |
| **format** | `attributeAlignment` | `none` / `column` (列揃え) |
| **parse** | `specVersion` | `auto` / `1.8` / `1.9` (上限を pin) |
| **export** | `defaultFormat` / `defaultDpi` | svg/png / 72-600 dpi |
| **workspace** | `fileGlob` | Activity Bar ツリーの探索 glob |
| **ai (オプトイン)** | `enabled` / `provider` / `model` | レビューアシスタント有効化 / `anthropic`/`openai` / モデル ID |

**重要:** `umlay.ai.apiKey` のような設定は **存在しません**。API キーは
`vscode.SecretStorage` (OS keychain) のみで管理し、settings.json から
リークしないようにしています。

## レビューアシスタント (オプトイン)

`umlay.ai.enabled = false` (既定) なので、フレッシュインストールでは
ネットワーク通信は発生しません。利用には以下の手順が必要です:

1. Settings で `umlay.ai.enabled = true`
2. コマンドパレット → `Umlay: Configure Review Assistant…`
   → API キーを貼付 (password 入力欄、SecretStorage に保管)
3. `.umlay` を開いた状態で `Umlay: Run Review Assistant`
4. 出力は **Umlay AI** Output Channel に SSE ストリームで逐次出力
   (最初の bullet が ~1 秒で表示)

キー削除は `Umlay: Remove Stored Review Assistant Credentials` でいつ
でも実行可能。**設定値が空欄になることはなく、SecretStorage 経由のみで
削除されます。**

## コマンド (`Umlay:`)

| コマンド | 用途 |
| --- | --- |
| `Open Preview` / `Open Preview to the Side` | プレビューを開く |
| `Export Diagram as Image…` | SVG / PNG エクスポート |
| `Reset Diff Baseline` | レビュー基準をリセット |
| `Refresh Preview` | 全プレビュー強制再描画 |
| `Go to Next/Previous Diagnostic` | エディタ上で前後の診断にジャンプ |
| `Pick Preview Theme…` | テーマ切替 (status bar からも可) |
| `Quick Switch` | view + model fuzzy 検索 (`Cmd/Ctrl+Alt+U`) |
| `Refresh Workspace` | Activity Bar ツリー再走査 |
| `Configure Review Assistant…` / `Run Review Assistant` / `Remove Stored Review Assistant Credentials` | AI レビュー関連 (オプトイン) |
| `Show in Umlay` | TS/Prisma/SQL の model 名から `.umlay` 宣言にジャンプ (右クリックメニュー) |

## バージョンと互換性

- **VS Code**: `^1.118.0` (engines)
- **Spec**: 1.9.0 (RFC 0001–0054)
- **Marketplace 識別子**: `Umlay.umlay`

## 関連

- VS Code 拡張のソースはリファレンス実装リポジトリ
  [e98AZQZxMsYeMNm/uml.keydrop.net](https://github.com/e98AZQZxMsYeMNm/uml.keydrop.net)
  の `apps/vscode/` に配置
- 仕様 (`@umlay/spec`) と公開 RFC は本リポジトリ
  [umlay/umlay](https://github.com/umlay/umlay) の
  `packages/spec/` に
- 公式サイト: <https://umlay.keydrop.net>
