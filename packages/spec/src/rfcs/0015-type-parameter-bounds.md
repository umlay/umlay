---
rfc: 0015
title: 型パラメータ制約 (`<T: Foo>` / bounded generics)
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.5.0
change-class: A
parent-rfc: 0006
---

# RFC 0015 — 型パラメータ制約 (bounded generics)

## 要約

`protocol<T>` / `union<T>` の型パラメータに**制約 (bound)** を付けられるようにする。`T extends Comparable` のような形で、型 argument の満たすべき契約を宣言する。

## 背景 / モチベーション

RFC 0006 の `protocol Repository<T>` は T に対する制約が無く、どんな型でも入れられる。実用では:

- `Repository<T: Identifiable>` — T は `id` 属性を持つ必要がある
- `SortedList<T: Comparable>` — T は比較可能である必要がある
- `Cache<K: Hashable, V>` — K は hash 可能

のような制約を宣言的に書きたい。TypeScript の `T extends X`、Scala / Rust / Swift の `T: Trait` と同等。

## 提案内容

### 構文 (EBNF 差分)

```ebnf
TypeParams      ::= "<" TypeParam ("," TypeParam)* ">"
TypeParam       ::= Identifier (":" TypeBound)?
TypeBound       ::= QualifiedName ("<" TypeArgs ">")?
                    ("&" QualifiedName ("<" TypeArgs ">")?)*
```

`&` で複数制約を合成 (intersection type)。

### 使用例

```prisma
protocol Identifiable @intent("id を持つ") {
  fn getId() -> UUID!
}

protocol Comparable @intent("大小比較可能") {
  fn compareTo(other: Self!) -> int!
}

protocol Hashable @intent("hash 可能") {
  fn hash() -> bigint!
}

// 単一制約
protocol Repository<T: Identifiable> @intent("Identifiable な型の永続化") {
  fn get(id: UUID!) -> T?
}

// 複数制約 (intersection)
protocol IndexedCache<K: Hashable & Comparable, V> @intent("hash + 順序付きキャッシュ") {
  fn put(k: K!, v: V!) -> void
  fn range(from: K!, to: K!) -> [V]
}

// union にも適用可能 (RFC 0012 の Tree<T> と組み合わせ)
union SortedTree<T: Comparable> =
  | Leaf
  | Node { value: T!, left: SortedTree<T>!, right: SortedTree<T>! }
  @intent("値が T の比較可能な二分探索木")
```

### 制約の検証

- `@@implements(Repository<User>)` 時、`User` が `Identifiable` を実装しているか型チェッカーが検証
- 実装時に制約が満たされない場合は compile error
- 制約は「構造的 (structural)」ではなく「名義的 (nominal)」: `User extends Identifiable` または `@@implements(Identifiable)` が必要

### `Self` 型

Comparable のように「同じ型同士の比較」を表現するため、protocol 内でのみ使える擬似型 `Self` を追加:

```prisma
protocol Comparable {
  fn compareTo(other: Self!) -> int!    // Self = 実装する concrete type
}
```

## IR 影響

```jsonc
"protocol": {
  "properties": {
    "typeParams": {
      "type": "array",
      "items": {
        "oneOf": [
          { "type": "string" },   /* 既存: 制約なし */
          {
            "type": "object",
            "required": ["name"],
            "properties": {
              "name": { "type": "string" },
              "bounds": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "on":       { "type": "string" },
                    "typeArgs": { "type": "array", "items": { "type": "string" } }
                  }
                }
              }
            }
          }
        ]
      }
    }
  }
}
```

同様の構造を `union.typeParams` にも適用。

## 後方互換性

**Class A (additive)**: 既存の制約なしジェネリクスはそのまま動作。

## 代替案

- **案 B: duck typing (structural)** — 却下: 契約が暗黙で読み手負担が大きい
- **案 C: where 句 (`protocol X<T> where T: Foo`)** — 却下: 構文が冗長、Swift 風の `<T: Foo>` の方が主流

## サンプル / テスト

- `modules-ddd.umlay` の `Repository<T>` を `Repository<T: Identifiable>` に書き換え
- 新サンプル `samples/bounded-generics.umlay`: Comparable / Hashable / IndexedCache のデモ
- Conformance: 制約違反 (`@@implements(Repository<Foo>)` で Foo が Identifiable 非準拠) の検出

## 受諾時にやること

- [ ] `grammar.md` / `grammar.en.md` §4.2 に bound 節追加
- [ ] `grammar.bnf` の `TypeParams` を拡張
- [ ] `ir.schema.json` の `typeParams` を object 形対応
- [ ] `skills/{ja,en}/write-uml.md` / `review-uml.md` に bound 例を追加
- [ ] 新サンプル追加
- [ ] `SPEC_VERSION` 0.5.0 bump

## 未解決事項

- F-bounded polymorphism (`<T: Comparable<T>>`) の表現
- 変性 (variance): `<out T>` / `<in T>` の要否 (Kotlin / Scala 風)
- 再帰制約の検出 / 停止保証
