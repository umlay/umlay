---
rfc: 0020
title: Blanket `impl` (型パラメータ全体への一括実装)
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.6.0
change-class: A
parent-rfc: 0016
---

# RFC 0020 — Blanket `impl`

## 要約

RFC 0016 の `impl P for M` を拡張し、**特定型 M の代わりに「制約を満たす全型 T」** に実装を適用する blanket impl を導入する。

## 背景 / モチベーション

Rust の `impl<T: Display> ToString for T` のように、「ある条件を満たす全型に自動で適用される実装」が欲しいケース:

- `Debug` を実装する型すべてに対し、`toDebugString()` を提供
- `Hashable` を実装する全型に `asCacheKey()` を提供
- `Identifiable + Comparable` を満たす型に `SortedRepository` を自動合成

現状の `impl P for M` は特定 M 限定で、汎用適用できない。

## 提案内容

### 構文 (EBNF 差分)

```ebnf
ImplBlock       ::= "impl" TypeParams? ProtocolRef "for" ImplTarget
                    WhereClause?
                    "{" ImplMember* "}"
ImplTarget      ::= QualifiedName                (* 具体型 (既存) *)
                  | Identifier                   (* 型変数 (blanket) *)
```

### 使用例

```prisma
namespace common

protocol Display {
  fn format() -> string!
}

protocol ToString {
  fn toString() -> string!
}

// Blanket impl: Display を実装する全型に ToString を自動供給
impl<T> ToString for T where (T: Display) {
  fn toString() -> string! { /* return self.format() */ }
}

// より具体的な例: Identifiable + Comparable → SortKey
protocol Identifiable { fn getId() -> UUID! }
protocol Comparable   { fn compareTo(other: Self!) -> int! }
protocol SortKey      { fn sortKey() -> string! }

impl<T> SortKey for T where (T: Identifiable & Comparable) {
  fn sortKey() -> string! { /* e.g. padded compareTo + id */ }
}
```

### 衝突規則

複数の blanket impl が同じ型で適用可能な場合:

1. 制約が**より厳密** (bound が多い) な impl が優先
2. 同じ厳密性なら parse error (曖昧)
3. ユーザ明示の `impl ToString for SpecificType` は blanket impl を上書き

### Orphan rule の緩和

Blanket impl は「型パラメータ T」を target にするため、通常の orphan rule (P か M を所有する必要) を適用不可。代わりに:

- **Blanket impl を書けるのは、P を所有する namespace のみ** (外部 P を外部型に適用することを禁止)

## IR 影響

```jsonc
"implSource": {
  "properties": {
    "blanket": {
      "type": "boolean",
      "description": "blanket impl 由来か (true なら M は型変数、where 条件で適用範囲が決まる)"
    },
    "targetTypeParam": { "type": "string", "description": "blanket 対象の型変数名" }
  }
}
```

Blanket impl は IR 上では **該当する全 concrete model の `implements[]`** に実体化される (実装側が展開)。

## 後方互換性

**Class A (additive)**: 既存の通常 impl / @@implements は無影響。

## 代替案

- **案 B: derive マクロ (Rust-like `#[derive(ToString)]`)** — 却下: protocol と macro の二重構造になり複雑
- **案 C: default method (interface default method)** — 却下: interface 単位での default と blanket の適用範囲が異なる

## サンプル / テスト

- 新サンプル `samples/blanket-impl.umlay`: Display + ToString の blanket impl で複数型に自動適用
- Conformance: 衝突検出、orphan rule 緩和版の境界ケース

## 受諾時にやること

- [ ] `grammar.md` / `grammar.en.md` §4.3 に blanket 節追加
- [ ] `grammar.bnf` の `ImplBlock` / `ImplTarget` を拡張
- [ ] `ir.schema.json` の implSource に `blanket` / `targetTypeParam` 追加
- [ ] `skills/{ja,en}/write-uml.md` に blanket 例と衝突規則を追加
- [ ] `SPEC_VERSION` 0.6.0 bump

## 未解決事項

- Negative trait bound (`where T: !Foo`) の採否
- Blanket impl と variance (RFC 0019) との組み合わせ
- 循環 blanket (T が自己参照する条件) の停止保証
