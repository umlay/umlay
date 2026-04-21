---
rfc: 0014
title: Wildcard / glob import
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.4.0
change-class: A
parent-rfc: 0009
---

# RFC 0014 — Wildcard / glob import

## 要約

RFC 0009 の `import` を拡張し、ワイルドカード (`*`) や glob pattern で複数ファイルを一度に取り込めるようにする。

## 背景 / モチベーション

大規模プロジェクトでは複数の `.umlay` ファイルを 1 ディレクトリにまとめることが多い (例: `tasks/*.umlay`)。現状は 1 ファイルずつ `import "./tasks/sprint-1.umlay"` と書く必要があり、ファイル追加ごとに import リストの更新が必要。

glob import があれば:

```prisma
import "./tasks/*.umlay"
```

で tasks ディレクトリ内の全 `.umlay` を一括取り込み。

## 提案内容

### 構文 (EBNF 差分)

```ebnf
ImportTarget ::= String            (* パス: glob 対応 *)
               | Identifier        (* namespace *)

(* glob 記法: POSIX 互換 *)
/* - `*`  任意の 1 セグメント (0 以上の非区切り文字) */
/* - `**` 複数階層を跨ぐ (ディレクトリ再帰) */
/* - `?`  任意の 1 文字 */
/* - `[abc]` 文字クラス */
```

### 使用例

```prisma
namespace planning

// 同一ディレクトリ内の全 .umlay を再帰 import
import "./tasks/**/*.umlay"

// 特定パターン
import "./phases/{design,build,test}/*.umlay"

// alias なし (glob ではファイル数が可変のため alias 非対応)
import "./deps/*.umlay"
```

### 制約

- glob pattern には **alias 不可** (`as` 使用不可、展開後のファイル数が可変のため)
- 展開結果の各 namespace が重複している場合は parse error
- glob マッチ 0 件 (該当ファイル無し) は warning (error にはしない、build order での柔軟性を優先)
- `{a,b}` / `**` の対応は実装オプション (minimum は `*` と `?`)

### 展開と依存解決

1. glob を同期解決 (ビルド時に ls する)
2. 各マッチファイルを順次 import
3. 暗黙 namespace 解決は行わず、各ファイルの宣言のみに従う

### セキュリティ考慮

- glob が外部ディレクトリを指す場合 (`**` の使い過ぎ) は sandbox 警告
- npm package スコープでの glob (`@umlay/shared/**/*.umlay`) は将来検討

## IR 影響

展開結果のみ IR に反映 (glob 情報自体は IR に残さない)。

オプションで meta 情報を保持:

```jsonc
"meta": {
  "imports": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "spec":     { "type": "string" },    /* 元の glob */
        "expanded": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

## 後方互換性

**Class A (additive)**: 既存の単一ファイル import / namespace import は無影響。

## 代替案

- **案 B: 明示リスト (配列構文)** — 却下: ファイル追加のたびに更新必要
- **案 C: auto-import / 暗黙スキャン** — 却下: RFC 0009 で却下済み (曖昧性)
- **案 D: マニフェストファイル (`@umlay.config.json`)** — 却下: 別機構の導入コストが高い

## サンプル / テスト

- 新サンプル `samples/with-glob-imports/` ディレクトリ:
  - 親: `planning.umlay` が `import "./tasks/*.umlay"`
  - 子: `tasks/sprint-1.umlay` / `tasks/sprint-2.umlay` / `tasks/sprint-3.umlay`
- Conformance: glob 展開、重複 namespace 検出、0 マッチ warning

## 受諾時にやること

- [ ] `grammar.md` / `grammar.en.md` §1.1 に glob 節追加
- [ ] `grammar.bnf` の `ImportTarget` コメントに glob 仕様追加
- [ ] `skills/ja/write-uml.md` / `en/write-uml.md` に使用例追加
- [ ] 新サンプル追加
- [ ] `SPEC_VERSION` 0.4.0 bump

## 未解決事項

- `{a,b}` / `**` のサポート必須レベル (minimum spec か optional か)
- npm package 内の glob (`@scope/pkg/**/*.umlay`) の resolve 順序
- Symlink 展開ポリシー
