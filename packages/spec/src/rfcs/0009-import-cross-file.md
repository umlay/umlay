---
rfc: 0009
title: `import` 構文による cross-file 解決
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

# RFC 0009 — `import` 構文による cross-file 解決

## 要約

RFC 0005 で cross-namespace `@@dependencies` を解禁した。実際に複数ファイルをまたいで参照するには、`import` 構文で namespace を明示的に取り込む仕組みが必要。

## 背景 / モチベーション

- 現行: ファイル内に書いた `@@dependencies(pm_core.Task)` の解決は「同一ディレクトリ or 同一プロジェクト内の全 .uml を暗黙スキャン」
- 暗黙スキャンは規模が大きくなると曖昧 / 遅い / 依存関係が不明瞭
- `multi-project-schedule/` サンプルは現状「ディレクトリ内の 3 ファイルが互いに見える」前提。明示 import が望ましい
- Python / TS のパッケージ管理との整合性

## 提案内容

### 構文 (EBNF)

```ebnf
ImportDecl      ::= "import" ImportTarget ("as" Identifier)? (";")?
ImportTarget    ::= String      (* ファイルパス or パッケージ名 *)
                  | Identifier  (* 同一プロジェクトの namespace *)
```

配置: ファイル先頭 `namespace` 宣言の**直後**。

### 使用例

```prisma
namespace pm_feature_a

// 同一プロジェクト内の別 namespace (pm-core.uml の pm_core) を取り込み
import pm_core

// ファイルパス指定 + エイリアス
import "./shared/infra.uml" as infra

// npm パッケージ (将来)
import "@umlay/examples/samples/multi-project-schedule/pm-core.uml" as ext_core

model Task @entity {
  @@dependencies(pm_core.Task)           /* 同一プロジェクト、import 経由 */
  @@dependencies(infra.BaseService)      /* エイリアス経由 */
}
```

### 解決ルール

1. `import <Identifier>` — 同一プロジェクト / ワークスペース内の `namespace <Identifier>` を持つファイルを探索
2. `import "<path>"` — 相対パス (`./`, `../`) は本ファイル起点、絶対パスは project root 起点
3. `import "<pkg/path>" as <alias>` — npm パッケージからの取り込み (alias 必須)

import しないと cross-namespace 参照 (`pm_core.X`) は parse error となる。

### 循環 import の禁止

A → B → C → A のような循環 import を parse 時に検出し error。

## IR 影響

IR には import の解決結果のみ反映 (参照先 namespace が同一 IR tree 内に含まれる)。IR 自体は import 文を保持しない。

## 後方互換性

**Class B (relaxation 要 / potentially breaking)**:
- **既存の暗黙スキャン動作**を残す場合: Class A
- **暗黙スキャンを無効化**して明示 import 必須にする場合: **Class C (breaking)**

本 RFC は **段階移行** を提案:

1. **Phase 1 (0.3.0)**: `import` 構文導入、暗黙スキャンと併用可 (新: 警告なし、旧: warning)
2. **Phase 2 (0.4.0)**: 暗黙スキャンを `@@mode(strict)` 下では error、`draft` では warning
3. **Phase 3 (1.0.0)**: 暗黙スキャン完全廃止

## 代替案

- **案 B: `require "..."` (Ruby 風)** — 却下: 学習コスト増
- **案 C: 暗黙スキャンのまま** — 却下: 曖昧性が残る
- **案 D: `from <ns> import *` (Python 風)** — 却下: model 単位の部分 import は当面非サポート

## サンプル / テスト

- `multi-project-schedule/` を `import` 明示版に書き換え
- 新サンプル `packages/examples/samples/with-imports/` で相対パス / エイリアス / 循環検出の各パターンを示す

## 受諾時にやること

- [ ] `grammar.md` / `grammar.en.md` に §14 として `import` を追加
- [ ] `grammar.bnf` に `ImportDecl` 追加、`File` 定義を変更
- [ ] `ir.schema.json` は変更なし (import は解決結果のみ反映)
- [ ] `docs/{ja,en}/dsl-guide.md` に import セクション追加
- [ ] `multi-project-schedule/` サンプルを書き換え
- [ ] `SPEC_VERSION` 0.3.0 bump

## 未解決事項

- ワークスペース root をどう発見するか (`@umlay.config.json` 等の presence?)
- model / enum 単位の部分 import (`from pm_core import Task`)
- glob import (`import "./tasks/*.uml"`)
