---
rfc: 0008
title: `@@sample` の外部ファイル参照
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.3.0
change-class: A
supersedes:
superseded-by:
---

# RFC 0008 — `@@sample` の外部ファイル参照

## 要約

RFC 0004 の `@@sample(...)` を拡張し、**外部ファイル** (JSON / JSONL / YAML / CSV) から instance data を取り込めるようにする。

## 背景 / モチベーション

- 現行 `@@sample(...)` は DSL 内に直書き。行数 N が多い (50+) と可読性が落ち、DSL が肥大化
- 実プロジェクトのシードデータは JSON / CSV で持つことが多い
- テストフィクスチャ、Storybook モック、Playground 初期値など用途が多様化
- `project-schedule.umlay` の 13 タスクですら `@@sample` が 60+ 行。100 タスク規模なら外部化必須

## 提案内容

### 構文 (EBNF)

```ebnf
SampleBlock ::= "@@sample" "(" SampleRow ("," SampleRow)* ")"
              | "@@sample" "(" "from" ":" String ("," SampleOption ("," SampleOption)*)? ")"

SampleOption ::= "format" ":" SampleFormat
               | "encoding" ":" String
               | "limit" ":" Integer

SampleFormat ::= "json" | "jsonl" | "yaml" | "csv"
```

### 使用例

```prisma
model Task @aggregate_root {
  /* ... 属性定義 ... */

  // 相対パス (本ファイルからの相対)、形式は拡張子から自動推論
  @@sample(from: "./fixtures/tasks.jsonl")

  // 明示的に format / encoding を指定
  @@sample(
    from: "./fixtures/legacy-tasks.csv",
    format: csv,
    encoding: "utf-8",
    limit: 1000
  )
}
```

### ファイル形式別のセマンティクス

| format | 内容 |
| --- | --- |
| `json` | 配列ルート (`[{...}, {...}, ...]`) |
| `jsonl` | 各行が 1 JSON オブジェクト |
| `yaml` | リストルート (`- {}\n- {}`) |
| `csv` | 1 行目をヘッダ列、以降をデータ行として解釈 |

### 複数 `@@sample` の合流

既存の inline `@@sample(...)` と `@@sample(from: ...)` を同一 model 内で併用可能。IR では単一 `samples[]` にマージ (inline 先、外部後)。

## IR 影響

IR 内では常に展開済みのデータ配列として保持 (外部ファイル参照は IR に残さない、parse 時に展開)。

```jsonc
"samples": {
  "type": "array",
  "description": "Instance data. External file references are expanded at parse time.",
  "items": { "type": "object", "additionalProperties": true }
}
```

代替案として、IR にソース情報を残す:

```jsonc
"_sampleSources": {
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "from": { "type": "string" },
      "format": { "enum": ["json", "jsonl", "yaml", "csv"] },
      "rowCount": { "type": "integer" }
    }
  }
}
```

## 後方互換性

**Class A (additive)**: inline `@@sample(...)` は無影響。

## 代替案

- **案 B: 完全に外部ファイルに追い出す (`*.sample.json`)** — 却下: small sample の inline の利便性が失われる
- **案 C: `@@seed(from: ...)` と新ブロック** — 却下: 2 ブロックに分かれると管理が煩雑

## サンプル / テスト

- `packages/examples/samples/project-schedule.umlay` の 13 タスクを外部 JSONL に分離し、対比サンプルとして提示
- 新サンプル `packages/examples/samples/with-fixtures/` ディレクトリで JSON + JSONL + CSV の全対応を示す

## 受諾時にやること

- [ ] `grammar.md` §8 / `grammar.en.md` §8 更新
- [ ] `grammar.bnf` の `SampleBlock` を拡張
- [ ] `ir.schema.json` に `_sampleSources` 追加 (任意)
- [ ] `docs/{ja,en}/dsl-guide.md` に外部ファイル例を追加
- [ ] `skills/ja/write-uml.md` / `en/write-uml.md` に外部参照パターン追加
- [ ] `SPEC_VERSION` 0.3.0 に bump

## 未解決事項

- 参照 (`{ parentId: "..." }`) が外部ファイル間で成立する場合の解決順序
- ワイルドカード参照 (`from: "./fixtures/*.jsonl"`)
- 機密データ (API キー等) の検出 / 警告機構
