---
rfc: 0010
title: `protocol` 多重継承 / `union` の payload variant
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

# RFC 0010 — `protocol` 多重継承 / `union` の payload variant

## 要約

RFC 0006 で追加した `protocol<T>` と `union` の実用性を高める 2 拡張:

1. `protocol` の多重継承 (`protocol Foo extends Bar, Baz`)
2. `union` variant に payload を持たせる inline 定義 (`Created { orderId: UUID }`)

## 背景 / モチベーション

### protocol 多重継承

- 複数の契約を合成したい: `protocol UserRepo extends Repository<User>, Auditable, Cacheable`
- RFC 0006 は単一継承のみ。TypeScript / Scala / Go interface と比べても制約が強すぎる
- DDD における「Repository + Specification + Cacheable」のような合成パターンで頻出

### union payload variant

- 現行: `union OrderEvent = OrderCreated | OrderConfirmed | ...` で variant は既存 model 名のみ
- 小さな variant のために model を切り出すのはオーバーヘッド
- Rust / Swift の enum variant のように inline でペイロードを書けると記述量が激減

## 提案内容

### 1. Protocol 多重継承

```ebnf
ProtocolDecl    ::= "protocol" Identifier TypeParams?
                    ("extends" QualifiedNameList)?
                    IntentAnnotation?
                    "{" ProtocolMember* "}"
QualifiedNameList ::= QualifiedName ("<" TypeArgs ">")? ("," QualifiedName ("<" TypeArgs ">")?)*
TypeArgs        ::= QualifiedName ("," QualifiedName)*
```

```prisma
protocol Auditable @intent("操作ログ記録") {
  fn audit(action: string!) -> void
}

protocol Cacheable<T> @intent("キャッシュ可能") {
  fn cacheKey(entity: T!) -> string!
}

protocol UserRepository extends Repository<User>, Auditable, Cacheable<User>
  @intent("User 専用で監査 + キャッシュ対応") {
  fn findByEmail(email: string!) -> User?
}
```

#### 継承規則

- 継承元の `fn` メソッドは暗黙でマージ
- 同名メソッドは **型シグネチャ一致時のみ** マージ、異なる場合は compile error
- 継承チェーンは非循環必須 (`A extends B extends A` は error)

### 2. Union payload variant

```ebnf
UnionDecl       ::= "union" Identifier "=" UnionVariant ("|" UnionVariant)+
                    IntentAnnotation?
UnionVariant    ::= Identifier                                 (* 既存: model 名 *)
                  | Identifier "{" Field ("," Field)* "}"      (* 追加: inline payload *)
```

```prisma
union OrderEvent =
  | Created   { orderId: UUID!, customerId: UUID!, at: Timestamp! }
  | Confirmed { orderId: UUID!, at: Timestamp! }
  | Shipped   { orderId: UUID!, trackingNumber: string!, at: Timestamp! }
  | Cancelled { orderId: UUID!, reason: string!, at: Timestamp! }
  @intent("Order ドメインイベント (inline variant)")
```

inline variant は型チェッカー内部で合成 model として展開される (名前は `<UnionName>_<VariantName>`)。

#### 制約

- inline variant と 既存 model 名 variant は **同一 union 内で混在可能**
- inline variant の field は属性標準の annotation をすべて使用可能 (`@id`, `@ref`, etc.)

## IR 影響

### 多重継承

```jsonc
"protocol": {
  "properties": {
    "extends": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["on"],
        "properties": {
          "on":       { "type": "string" },
          "typeArgs": { "type": "array", "items": { "type": "string" } }
        }
      }
    }
  }
}
```

### Union payload

```jsonc
"union": {
  "properties": {
    "variants": {
      "type": "array",
      "items": {
        "oneOf": [
          { "type": "string" },   /* 既存: model 名 */
          {
            "type": "object",
            "required": ["name", "fields"],
            "properties": {
              "name":   { "type": "string" },
              "fields": { "type": "array", "items": { "$ref": "#/$defs/attribute" } }
            }
          }
        ]
      }
    }
  }
}
```

## 後方互換性

**Class A (additive)**: 既存の protocol 単一継承 / union 単純 variant は無影響。

## 代替案

### 多重継承

- **案 B: mixin 構文 (`protocol X includes Y`)** — 却下: `extends` は TS / Scala で一般的で学習コストが低い
- **案 C: 合成限定 (継承なし)** — 却下: DDD ユースケースを満たせない

### Union payload

- **案 B: `sealed class` 相当の別構文導入** — 却下: `union` を再利用する方が一貫性あり
- **案 C: variant ごとの model 宣言必須 (現状維持)** — 却下: 記述量が膨らむ

## サンプル / テスト

- `modules-ddd.umlay` に `UserRepository extends Repository<User>, Auditable` を追加
- `event-sourcing.umlay` を inline variant 版で再記述 (4 model が 1 union で済む)
- Conformance:
  - 多重継承: 2 / 3 / 5 の合成、同名メソッド衝突検出
  - Payload: mixed-variant、payload 内参照、循環禁止

## 受諾時にやること

- [ ] `grammar.md` / `grammar.en.md` §4.2 を拡張
- [ ] `grammar.bnf` の `ProtocolDecl` / `UnionDecl` / `UnionVariant` を拡張
- [ ] `ir.schema.json` の `protocol.extends[]` / `union.variants[]` を拡張
- [ ] `docs/{ja,en}/dsl-guide.md` に例を追加
- [ ] `event-sourcing.umlay` / `modules-ddd.umlay` を新構文で書き換え
- [ ] `SPEC_VERSION` 0.3.0 bump

## 未解決事項

- **Diamond 継承** (`A extends B, C; B extends D; C extends D`) の method 解決
- inline variant の **recursive reference** (`union Tree = Leaf | Node { left: Tree, right: Tree }`)
- 型パラメータ制約 (`<T: Comparable>`)
- Rust 風の **impl ブロック** 導入の検討 (protocol を別ファイルで後から適用)
