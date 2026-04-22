---
rfc: 0031
title: Markdown integration (4 layers)
author: "@kigi"
status: accepted
created: 2026-04-22
updated: 2026-04-22
accepted: 2026-04-22
spec-version-target: 1.1.0
change-class: A
supersedes:
superseded-by:
---

# RFC 0031 — Markdown integration

## 要約

Umlay DSL に Markdown を 4 レイヤーで統合する。**全て additive (Class A)**、
既存 `.umlay` ファイルは無変更で動く。

| Layer | 機能 | 影響 |
| --- | --- | --- |
| **A** | 既存 `@intent` / `@@doc` / `@review` / `@fix` の文字列を Markdown として表示 | 表示側のみ、grammar 不変 |
| **B** | `@@md(""" ... """)` ディレクティブ — model に任意の Markdown ブロックを添付 | grammar 1 行追加、IR `Model.docs[]` |
| **D** | ファイル末尾の `---` で区切った Markdown trailer | parser pre-処理 1 関数、IR `docTrailer?` |
| **C** | `.umlay.md` literate 形式 — Markdown 中の ` ```umlay ` フェンスを抽出 | 新 API `parseLiterate()`、grammar 不変 |

## 背景 / モチベーション

- ADR / 設計仕様書を「実行可能な DSL」と同じファイルに置きたいという要望
- `@intent` / `@@doc` の文字列にすでに改行付きで書いている人が多く、表示が
  味気ない (リスト / コード / 表が反映されない)
- 現状 `.uml` / `.umlay` ファイルは GitHub 上で何もハイライトされない
  (Markdown 中ならブラウザでそのまま読める)
- spec 1.0 freeze 後、純粋 additive な改善として 1.1 で導入するのが安全

## 提案内容

### Layer A — 表示側のみの Markdown 解釈

既存の `@intent("...")` / `@@doc("""..."""))` / `@review("...")` /
`@fix("...")` の文字列を、表示時に CommonMark + GFM として解釈する。

**grammar 変更**: なし。
**IR 変更**: なし。

実装側 (renderer / LSP hover / VS Code preview / web editor) で
`marked` 等を通して HTML 化する。

### Layer B — `@@md(""" ... """)`

```prisma
model Order @aggregate_root {
  id     UUID! @id
  status OrderStatus!

  @@md("""
  ## 状態遷移

  | from | to |
  | --- | --- |
  | DRAFT | SUBMITTED |
  | SUBMITTED | PAID / CANCELLED |
  """)
}
```

**grammar 変更** (差分):

```ebnf
ModelDirective ::= ... | "@@md" "(" StringLiteral ")"
```

**IR 影響**:

```jsonc
"docs": {
  "type": "array",
  "items": { "type": "string" },
  "default": []
}
```

`@@doc` (single) と併存。`@@doc` の最初の 1 つは `model.doc` (string) に
入り、すべての `@@doc` / `@@md` は `model.docs[]` に append される。
`view.docs` も同形 (現状 view body の grammar 拡張は将来検討、IR は
`[]` で固定)。

### Layer D — Markdown trailer (`---` 以降)

```
namespace shop
model Order @entity { id UUID! @id }

---

# 設計メモ

- 注文は不可逆
- キャンセルは soft delete
```

**grammar 変更** (規約のみ、文法本体は不変):
- ファイル末尾に **`---` 単独行** が現れた場合、それ以降は IR には入らず
  `IR.docTrailer?: string` に格納される
- triple-quoted string の中の `---` は対象外 (parser が `"""` の開閉を
  数えて判定)

**IR 影響**:

```jsonc
"docTrailer": { "type": "string" }
```

### Layer C — 文芸的 (literate) `.umlay.md`

拡張子 `.umlay.md` の Markdown ファイルを公式サポート。中の
` ```umlay ` フェンスを順番に連結して `parse()` に渡す。

```markdown
# Auth domain

## エンティティ

\`\`\`umlay
namespace auth
model User @entity { id UUID! @id }
\`\`\`

## ビュー

\`\`\`umlay
view er @er_diagram { include: auth.* }
\`\`\`
```

**新 API** (`@umlay/core`):

```ts
function parseLiterate(source: string): {
  ir: IR;
  diagnostics: Diagnostic[];   // line 番号は元 Markdown に remap 済
  blocks: LiterateBlock[];     // markdown / umlay 順序を保持
  hasUmlay: boolean;
};

function isLiteratePath(path: string): boolean;  // *.umlay.md
```

**grammar 変更**: なし (Markdown 自体は仕様外、フェンス抽出のみ)。

## 後方互換性

**Class A (additive)** で全レイヤー後方互換:
- 既存 `.umlay` パーサ出力は不変 (新 IR フィールドは default `[]` /
  optional)
- `IR_SCHEMA_VERSION` は `1.0` 据え置き (フィールド追加のみ)
- `SPEC_VERSION` を **1.1.0** に bump
- 既存ツールは新フィールドを単に無視できる

## 代替案

- **案 X**: HTML を直接埋め込める `@@html(""" ... """)`。**却下** — XSS 表面、
  設計 doc が HTML だらけになる
- **案 Y**: `@@doc` を deprecate して `@@md` のみに統一。**却下** — 既存
  ファイルへの影響が大きすぎる
- **案 Z**: literate を `.lit.umlay` 拡張子で。**却下** — `.umlay.md` の
  方が GitHub / Discord / Slack で自動 Markdown 表示される

## サンプル / テスト

- `packages/examples/samples/literate-auth.umlay.md` — Layer C の代表例
- 参照実装テスト: `packages/core/src/{docs,doc-trailer,parse-literate}.test.ts`
  で 21 ケース (Layer B/C/D)

## 受諾時にやること

- [x] 参照実装に組み込み済 (`@umlay/core` 1.0.x)
- [x] LSP / VS Code 拡張に統合済
- [x] `ir.schema.json` 自動再生成済
- [ ] `packages/spec/src/grammar.md` 更新 (本 RFC commit と同梱)
- [ ] `packages/spec/src/grammar.bnf` 更新 (本 RFC commit と同梱)
- [ ] `docs/{ja,en}/dsl-guide.md` に "Markdown 統合" セクション追加
- [ ] `migration-guide-1.0.md` に 1.1 follow-up 節追記
- [ ] `SPEC_VERSION` を 1.1.0 に bump

## 未解決事項

- View 内 `@@md` ブロックの grammar 拡張 (1.2 候補、現状 IR は `[]` で確保のみ)
- literate format 内のエラー位置を Markdown LSP のレンジに乗せる方法
  (現状は line のみ remap、column は DSL 局所のまま)
- `.umlay.md` を GitHub Linguist に登録するか (別 PR)
