---
rfc: 0011
title: Diamond 継承と method resolution order (MRO)
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.4.0
change-class: A
parent-rfc: 0010
supersedes:
superseded-by:
---

# RFC 0011 — Diamond 継承と method resolution order (MRO)

## 要約

RFC 0010 で導入した `protocol extends A, B, ...` の多重継承において、共通の祖先を持つ diamond 継承構造での method 解決順序を正式化する。

## 背景 / モチベーション

RFC 0010 受諾時点で open question として残された:

```prisma
protocol Base  { fn hello() -> void }
protocol Left  extends Base { fn hello() -> void /* Left 側で override */ }
protocol Right extends Base { fn hello() -> void /* Right 側で override */ }
protocol Diamond extends Left, Right { }    // ← hello() はどちらが選ばれる?
```

現状の RFC 0010 では「同名メソッドは型シグネチャ一致時のみマージ、異なる場合は compile error」としか規定されていない。diamond の場合、シグネチャが一致しても**どの実装**が勝つかが不定。

## 提案内容

### C3 linearization を採用

Python / Dylan で使われる C3 線形化アルゴリズムに従う。理由:

- 単調性 (monotonicity): 親の MRO は子でも保たれる
- 局所優先性 (local precedence): 宣言順で左優先
- ダイヤモンドの祖先が 1 度だけ現れる

### 解決ルール (EBNF 差分なし、semantic のみ)

```prisma
protocol Diamond extends Left, Right { }
// → MRO = [Diamond, Left, Right, Base, Object]   (C3 linearization)
// → hello() の実装は Left が採用される
```

明示的な override が必要な場合は:

```prisma
protocol Diamond extends Left, Right {
  fn hello() -> void @intent("explicit override")   // ← Diamond 自身で再宣言
}
```

### 衝突検出

- MRO が C3 的に構築できない場合 (循環依存、不整合な継承順) は parse error
- 同名・同シグネチャメソッドが複数の祖先に存在する場合、子で明示的な再宣言 or `@@override(from: Left)` 注釈で選択

### `@@override(from: ...)`

```prisma
protocol Diamond extends Left, Right {
  @@override(from: Right)   // Right の hello を採用 (Left が勝つ既定を上書き)
  fn hello() -> void
}
```

## IR 影響

```jsonc
"protocol": {
  "properties": {
    "mro": {
      "type": "array",
      "description": "C3 で線形化された解決順序 (RFC 0011)",
      "items": { "type": "string" }
    },
    "overrides": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "method": { "type": "string" },
          "from":   { "type": "string" }
        }
      }
    }
  }
}
```

## 後方互換性

**Class A (additive)**: 現状 RFC 0010 では diamond を許可しつつ挙動未定義だった。本 RFC で挙動を固定するが、既存サンプル (modules-ddd.umlay) は diamond を含まないため無影響。

## 代替案

- **案 B: Python 3 互換の C3** — 本 RFC の採用案
- **案 C: Scala の trait linearization** — 却下: 「right-most wins」で読み手の直感と異なる
- **案 D: 常に error (明示 override 必須)** — 却下: 単純継承の利便性を失う

## サンプル / テスト

- 新サンプル `samples/diamond-protocol.umlay`: Base / Left / Right / Diamond で C3 の結果を検証
- Conformance: 3 / 4 / 5 階層の MRO 生成、`@@override(from:)` の各ケース

## 受諾時にやること

- [ ] `grammar.md` / `grammar.en.md` §4.2 に MRO 解説追加
- [ ] `grammar.bnf` に `@@override` 構文追加
- [ ] `ir.schema.json` の `protocol` に `mro[]` / `overrides[]` 追加
- [ ] `skills/{ja,en}/write-uml.md` に diamond 回避推奨を追加
- [ ] `SPEC_VERSION` 0.4.0 bump

## 未解決事項

- 祖先間で**異なるシグネチャ**の同名メソッド (名前衝突・型違い) の扱い
- `@@override` が複数の祖先を指定する場合 (`from: [Left, Right]`)
