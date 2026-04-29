---
rfc: 0053
title: Multiple `seq` bodies per sequence_diagram view
author: '@umlay'
status: accepted
created: 2026-04-30
updated: 2026-04-30
spec-version-target: 1.8.0
change-class: A
---

# RFC 0053 — Multiple `seq` bodies per `@sequence_diagram` view

## 要約

`view <id> @sequence_diagram { ... }` 内で **`seq <name>? { ... }` を
複数並べられる** ようにする。同じ participants を共有しつつ、
success / failure / cancel など複数シナリオを 1 枚の "report" view に
集約できる。レンダラは縦に積み、`« seq: <name> »` ヘッダ + 横線で区切る。

## 背景 / モチベーション

業務フローの報告書 / 障害事後分析 / 設計レビュー資料では、**同じ
participants 集合上での複数シナリオ** を 1 枚の図に並べたいことが
多い。spec 1.7 までは 1 view = 1 `seq` 本体しか持てず、シナリオごとに
別 view を作るしかなかった。これは:

- 同じ `participants:` を 3〜5 回コピペ
- レビュアーが「success と failure を見比べたい」とき複数タブを行き来
- 印刷物 / Markdown export で 1 ページに入らない

の 3 つの非効率を生んでいた。

## 提案内容

### 構文の追加

```prisma
view report @sequence_diagram {
  participants: A as a, B as b

  seq success {        // ← 名前付き block
    a ->> b: "ok"
  }

  seq failure {        // ← 別の名前付き block
    a ->> b: "err"
    b -.> a: "DBError"
  }
}
```

文法 (BNF):

```bnf
SequenceView ::= "view" ID "@sequence_diagram" Annotation* "{"
                 (Participants | SeqBlock | ViewProperty | BlockDirective)*
                 "}"
SeqBlock     ::= "seq" Identifier? "{" SeqStatement* "}"
```

`Identifier?` で **`seq { ... }` (匿名) / `seq <name> { ... }` (命名)** の
両方を許容する。

### IR schema への影響

```jsonc
// 既存 SequenceBody に追加
{
  "name": { "type": "string" }   // optional: seq <Identifier>?
}

// View に追加
{
  "sequenceBodies": {
    "type": "array",
    "items": { "$ref": "#/definitions/SequenceBody" }
  }
}
```

**互換性のため、既存の `view.sequenceBody` は `sequenceBodies[0]` の
alias として温存** する。1.7 以前の IR コンシューマー (renderer /
codegen / lint) は変更なしで動く。

### 後方互換性

A (additive)。

- 既存の `view ... { seq { ... } }` (1 個の匿名 seq) は無変更で同じ IR /
  同じ SVG を生成する
- `view.sequenceBody` を読む既存コードは引き続き先頭ブロックを取得できる
- 新規構文 `seq <name>` の name 部分は **既存の Identifier トークンを
  使うだけ** なので新キーワードなし

### Lint との連動

- **L057 — seq-name-unique-and-required-when-multi**: 2+ ブロック時は
  各 `seq` に名前必須 + 名前重複禁止。draft:info / beta:warning /
  strict:error。

### Renderer の挙動

- ブロック数 = 0 (`seq` 無し) → empty SVG
- ブロック数 = 1 (匿名) → 1.7 までと同一の SVG (画素単位で同じ)
- ブロック数 = 1 (命名) → ヘッダ `« seq: <name> »` を上部に追加
- ブロック数 ≥ 2 → 各ブロックを縦に積み、各セクション上端に
  `« seq: <name or #N> »` ヘッダ + 横点線で区切り。**participants と
  lifeline は view 全体で共有**

### Web / VS Code への影響

- `apps/web` / `apps/vscode` の SVG は `@umlay/renderer-er` 経由なので
  自動的に新挙動に追従
- VS Code の `tmLanguage.json` に `seq <Identifier>` の名前部分を
  `entity.name.section.seq.umlay` としてハイライト
- Document mode (DocumentTree) の Views TOC で名前付き seq block を
  サブエントリとして列挙、クリック → 該当宣言にジャンプ

## 代替案

- **Block 名の代わりに `@@label("...")` ディレクティブ** — 却下: 既存
  `@@directive(...)` 系と意味論が混じる。`seq <name>` の方が文法的に
  自然
- **2+ block 時は別 view に分ける運用ルール (構文追加なし)** — 却下:
  コピペ参照が増える / 視覚的対比ができない。RFC 0037 の `@@detail` /
  `level:` も同じ動機 (1 source / multi-projection) で承認されている
- **block 間で participants を別々に宣言可能にする** — 却下: 報告書
  view の主要価値は participants 共有なので、別宣言が必要なら別 view
  を作る方が筋

## サンプル / テスト

- `umlay-oss/packages/examples/samples/multi-seq-report.umlay` — 3
  ブロック (success / failure / cancel) を 1 view に集約
- `packages/core/src/multi-seq.test.ts` — 4 ケース (匿名単独 / 命名
  単独 / 複数命名 / 匿名+命名)
- `packages/lint/src/l057.test.ts` — 4 ケース (1 ブロック OK / 全名前
  あり OK / 無名混入 NG / 名前重複 NG)

## 受諾時にやること

- [x] `packages/core/src/grammar.ts` — `seq Identifier?` 追加
- [x] `packages/core/src/visitor.ts` — `sequenceBlocks[]` 蓄積 + `view.sequenceBodies` 投入 + 旧 `sequenceBody` alias
- [x] `packages/core/src/ir.ts` — `SequenceBodySchema.name` + `ViewSchema.sequenceBodies`
- [x] `packages/renderer-er/src/sequence-renderer.ts` — stacked multi-section レイアウト
- [x] `packages/lint/src/rules/index.ts` — L057
- [x] `apps/vscode/syntaxes/umlay.tmLanguage.json` — `seq <name>` ハイライト
- [x] `packages/webview-ui/src/document-tree-data.ts` — `ViewListEntry.seqBlockNames`
- [x] `packages/webview-ui/src/DocumentTree.tsx` — Views TOC のサブエントリ
- [x] `umlay-oss/packages/examples/samples/multi-seq-report.umlay` 追加 + fixtures regen
- [x] `umlay-oss/packages/spec/src/grammar.{md,en.md,bnf}` 更新
- [x] SPEC_VERSION 1.7.0 → 1.8.0 (`packages/core/src/{index,visitor}.ts` + `packages/spec/src/index.ts` + `umlay-oss/packages/spec/src/index.ts`)
