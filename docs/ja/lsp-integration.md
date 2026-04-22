# LSP Integration — Language Server Protocol 連携ガイド

Umlay DSL を扱う Language Server / IDE 拡張を実装する際の手引き。`@umlay/spec` の各成果物をどう LSP 機能にマッピングするかを示す。

## 対象読者

- Umlay DSL 用の VS Code / JetBrains / Neovim 拡張を書きたい開発者
- 独自エディタに Umlay サポートを組み込みたい
- LSP (Language Server Protocol) + DAP (Debug Adapter Protocol) の基礎がある

## 1. LSP 基本コンポーネント

Umlay DSL の LSP 実装は、以下のコンポーネントを組み合わせる:

| コンポーネント | 用途 | 本リポジトリの成果物 |
| --- | --- | --- |
| **Parser** | `.umlay` → AST | `grammar.bnf` に準拠 (別リポジトリ実装) |
| **IR Builder** | AST → 正規IR | `ir.schema.json` 準拠 |
| **Resolver** | 参照解決 (@ref / @@dependencies.on / protocol extends) | `skills/*/write-uml.md` の Step 6 / RFC 0005 / 0030 |
| **Linter** | S / L / R / W / C の各ルール | `skills/*/review-uml.md` + RFC 0029 (lint-rules.md) |
| **Formatter** | DSL の整形 | 未定義 (実装裁量、将来 RFC 候補) |
| **Hover / Completion** | 型情報 / protocol メソッドの補完 | IR + Resolver の結果を表示 |

## 2. LSP メソッドと Umlay の対応

### textDocument/diagnostic

- Parse error / spec 違反 (S 系) を diagnostic で返す
- Lint warning (L / R / W 系) は severity に応じて `Warning` / `Information`
- Deprecated (W001) / Experimental (W002) は `severity: Information` + `tags: [Deprecated]`

```ts
// 例
const diagnostic: Diagnostic = {
  range,
  severity: DiagnosticSeverity.Error,
  code: "S03",
  source: "umlay-lsp",
  message: "Unknown stereotype '@master'. Allowed: entity / aggregate_root / value_object / service / interface",
  tags: rule === "W001" ? [DiagnosticTag.Deprecated] : []
};
```

### textDocument/hover

- attribute / model / protocol にカーソルを置くと `@intent` + 型情報 + 属する namespace を表示
- `@ref(X.y)` の X にホバーすると target model の概要
- `@@sample` 行の field にホバーすると attribute の説明
- `@deprecated` / `@experimental` 要素は上部に警告バナーを表示

### textDocument/completion

補完候補の優先順位:

1. ローカルスコープ (同一 model 内の attribute)
2. 同一 namespace 内の model / type / enum / protocol
3. `import` 済みの他 namespace
4. 予約語 (`model` / `protocol` / `view` / `@@mode` / ...)
5. (将来) blanket impl により利用可能な派生機能

### textDocument/definition

- `@ref(X.y)` → X の宣言位置
- `@@dependencies(on: pm_core.Task)` → pm_core.Task の宣言位置
- `extends A, B` → A / B の宣言位置
- `@@implements(Repository<User>)` → Repository protocol / User model 両方

### textDocument/references

- model / protocol / union の**全参照箇所**をリスト
- rename 予定位置を一括確認するために使う

### textDocument/rename

- identifier (model / attribute / protocol) の rename を全 impl / @ref / include から一括変換
- RFC 0026 の `_id` は**変わらない** (内容ハッシュベース) ので review 注釈は維持される

### textDocument/formatting

実装裁量だが、推奨規則:

- visibility は attribute 先頭に揃える
- annotation は属性の型直後 (`+id UUID! @id`) にまとめる
- 複数 annotation は同行でスペース区切り
- block directive (`@@id`, `@@sample`) は model body の冒頭にまとめる

## 3. 参照解決の実装ガイド (RFC 0005 / 0009 / 0014)

### 解決順序

1. ローカル (同一ファイル内)
2. 同一 namespace の別ファイル (`import` 経由または暗黙スキャン)
3. `import <ns>` で取り込んだ namespace
4. `import "./path" as alias` のエイリアス経由
5. `import "./glob/**/*.umlay"` で展開された全 namespace

glob 展開は**ビルド時に実行**する (realtime で file watch)。

## 4. 診断キャッシュ戦略

大規模 Umlay プロジェクトでは:

- **Per-file cache**: 1 ファイルの parse 結果 → AST + file-local IR
- **Workspace cache**: 全ファイル合算 IR (namespace 解決済)
- **Invalidation**: ファイル変更時、依存する namespace のキャッシュを drop

推奨: Tree-sitter / Chevrotain の incremental parsing + LRU cache。

## 5. IR を利用したコードレンズ / inlay hint

- Task model の `@@sample` 行に CPM 計算結果 (RFC 0024 `_cpm.totalFloat`) を inlay hint で表示
- `@@implements(Repository<User>)` の User が Identifiable 未実装なら error lens
- `protocol extends A, B, C` の MRO 結果 (RFC 0011) を inlay

## 6. DAP (Debug Adapter) 連携 (将来)

現状 spec 範囲外だが、将来:

- Sequence diagram の各メッセージにブレークポイントを張れる runtime
- `@pre` / `@post` 違反時の自動トレース
- `critical retry(n)` の各 attempt の実行ログ

## 7. サンプル LSP 実装 (参考)

実装リポジトリ (別途公開予定):

```
umlay-lsp/
├── src/
│   ├── parser.ts          # grammar.bnf → Chevrotain
│   ├── resolver.ts        # @ref / extends / impl 解決
│   ├── linter.ts          # lint-rules.md (RFC 0029) 準拠
│   ├── diagnostic.ts      # LSP diagnostic 変換
│   ├── hover.ts
│   ├── completion.ts
│   └── server.ts          # vscode-languageserver エントリ
└── client/
    └── extension.ts       # VS Code 拡張
```

## 8. Conformance 連携

LSP 実装は `packages/spec/src/conformance/manifest.yaml` の各 sample を開いて:

1. Parse success (L1)
2. IR matches expected (L2)
3. Hover / completion が適切に動作 (L4, 新規)

を全て通すことで「LSP level conformance」を申告できる。`conformance/reports/*-lsp.md` として別立てレポート。

## 9. エディタ別セットアップ

参照実装の `@umlay/lsp` (npm) を使う場合の設定例。

### 9.1 VS Code

公式拡張を Marketplace からインストール (検索: `keydrop.umlay-vscode`)。
LSP server (`@umlay/lsp`) は拡張に同梱されているので別途インストール不要。

### 9.2 Neovim (nvim-lspconfig)

```lua
-- ~/.config/nvim/lua/plugins/umlay.lua
return {
  "neovim/nvim-lspconfig",
  config = function()
    local configs = require("lspconfig.configs")
    if not configs.umlay then
      configs.umlay = {
        default_config = {
          cmd = { "umlay-lsp", "--stdio" },           -- npm i -g @umlay/lsp
          filetypes = { "umlay" },
          root_dir = require("lspconfig.util").root_pattern("package.json", ".git"),
          settings = { umlay = { diagnostics = { mode = "draft" } } },
        },
      }
    end
    require("lspconfig").umlay.setup({})
    vim.filetype.add({
      extension = { umlay = "umlay" },
      pattern   = { ["%.umlay%.md$"] = "markdown" },  -- literate は markdown 扱い
    })
  end,
}
```

### 9.3 Zed

```jsonc
// ~/.config/zed/settings.json
{
  "lsp": {
    "umlay": { "binary": { "path": "umlay-lsp", "arguments": ["--stdio"] } }
  },
  "languages": { "Umlay": { "language_servers": ["umlay"], "format_on_save": "on" } },
  "file_types": { "Umlay": ["umlay"] }
}
```

### 9.4 IntelliJ / WebStorm (LSP4IJ)

JetBrains Marketplace の LSP4IJ プラグイン経由で `umlay-lsp --stdio`
を登録。Server config (JSON):

```json
{ "umlay": { "diagnostics": { "mode": "strict" } } }
```

## 10. 参照

- [Grammar (BNF)](../../packages/spec/src/grammar.bnf)
- [IR Schema](../../packages/spec/src/ir.schema.json)
- [Conformance Manifest](../../packages/spec/src/conformance/manifest.yaml)
- [RFCs](../../packages/spec/src/rfcs/README.md)
- [Extending Guide](./extending.md)
- [English version](../en/lsp-integration.md)
