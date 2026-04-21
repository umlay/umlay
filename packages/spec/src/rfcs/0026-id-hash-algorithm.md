---
rfc: 0026
title: IR `_id` ハッシュアルゴリズムの形式仕様
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.7.0
change-class: A
parent-rfc: null
---

# RFC 0026 — IR `_id` ハッシュアルゴリズムの形式仕様

## 要約

`ir.schema.json` の各要素に付与される `_id` (内容ハッシュ) の生成アルゴリズムを**形式化**し、全実装で同一のハッシュが得られるようにする。現状は `"sha1:ordering.Order"` のような表記だが、算法は未規定。

## 背景 / モチベーション

`_id` は:
- diff / review 系ツールが rename を検出する基礎
- cross-repo の IR 比較 / merge の key
- conformance テストで L2 検証時の参照 key

実装間で `_id` がブレると、上記すべての仕組みが壊れる。現状 `sha1:<qualified-name>` という hint のみで、前後空白・大文字小文字・正規化ルールは未規定。

## 提案内容

### アルゴリズム (形式仕様)

```
function computeId(element):
  canonicalPath = canonicalize(element)
  hash = sha1(canonicalPath).hexDigest()[0:16]     // 先頭 16 文字 (80 bit)
  return "sha1:" + hash

function canonicalize(element):
  switch element.kind:
    case "namespace":
      return element.name
    case "model":
      return element.namespacePath + "." + element.name
    case "attribute":
      return element.modelId.replace("sha1:", "") + "#" + element.name
    case "view":
      return "view:" + element.id
    case "protocol":
      return element.namespacePath + "." + element.name + "<" + element.typeParams.join(",") + ">"
    case "union":
      return element.namespacePath + "." + element.name
    case "variant":         // inline payload variant
      return element.unionId.replace("sha1:", "") + "#" + element.name
    ...
```

### 正規化規則

- **identifier**: そのまま使用 (Unicode NFC 正規化済と仮定)
- **namespace 区切り**: `.` (U+002E)
- **attribute / variant 区切り**: `#` (U+0023) 
- **typeParams**: `,` (U+002C) + space 無し
- **空白文字**: canonicalPath には含まれない (parse 時点で除去済み)
- **大文字小文字**: 区別する (case-sensitive)

### ハッシュ関数選択

- **SHA-1 (80 bit 切り詰め)**: 採用案
  - 衝突確率: 大規模 IR (100万要素) で 10^{-12}
  - 高速、全言語で実装済み
- 代替: SHA-256 (256 bit 切り詰め) — より安全だが `_id` が長くなる

本 RFC は SHA-1 (16 hex chars) を標準とし、将来必要なら `_idAlgorithm: "sha256-32"` のような指定を追加する。

### `_id` の安定性保証

以下の変更で **`_id` は変化しない**:
- ファイル内の宣言順序変更
- コメント / 空白の追加・削除
- `@intent` / `@inv` など annotation 本文の変更

以下で **`_id` は変化する**:
- `name` の変更 (rename)
- `namespace` の変更
- attribute の model 間移動
- typeParams の変更

### IR への影響 (正規化サンプル)

```jsonc
"Order": {
  "_id": "sha1:a3f5c1e2b8d94a16",             // 新: 16 hex chars
  "_idSource": "ordering.Order",              // デバッグ用、optional
  ...
}
```

`_idSource` はアルゴリズム検証時のみ出力 (production IR では省略可)。

## 後方互換性

**Class A (additive、ただし算法は変更)**:

- 既存の `_id: "sha1:ordering.Order"` (namespace-qualified name を直接埋め込む形) は、本 RFC で `sha1:<hash>` 形式に**変わる**
- ただし `_id` は「内容ハッシュ」と定義されていたため、値の変化は想定内 (仕様準拠の形に合わせる)
- 下流 consumer が古い `_id` に依存する場合の影響を migration guide で明示

## 代替案

- **案 B: UUID v5 (name-based)** — 却下: SHA-1 より標準化度が低い
- **案 C: xxhash / fnv** — 却下: 速度優位だが暗号学的 collision 耐性が弱い
- **案 D: QualifiedName をそのまま埋め込む (現状)** — 却下: 長くなる / 特殊文字エスケープ / 日本語の場合非 ASCII

## サンプル / テスト

- 新 conformance テスト `conformance/id-hash-vectors.yaml`: 代表的な要素に対する期待 `_id` を列挙
- 実装間の `_id` 一致を binary-exact で検証

## 受諾時にやること

- [ ] `grammar.md` / `grammar.en.md` にアルゴリズム節追加 (または `id-hash.md` として別ドキュメント化)
- [ ] `ir.schema.json` の `_id` 記述を更新 (パターン `^sha1:[0-9a-f]{16}$`)
- [ ] `skills/{ja,en}/review-uml.md` / `evolve-schema.md` の `_id` 言及を更新
- [ ] conformance に id-hash-vectors テスト追加
- [ ] expected-ir の `_id` を新形式に置換 (実装提供時に更新)
- [ ] `SPEC_VERSION` 0.7.0 bump

## 未解決事項

- 衝突発生時の tie-breaker (追加ソルト / 長さ拡張)
- IR 内での `_id` 重複検出 (実装レベル)
- Rename cascade (親の `_id` が変わっても子の `_id` は独立)
