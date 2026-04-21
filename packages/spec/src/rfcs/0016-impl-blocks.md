---
rfc: 0016
title: Rust 風 `impl` ブロック (protocol を別ファイルで後から適用)
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.5.0
change-class: A
parent-rfc: 0010
---

# RFC 0016 — `impl` ブロック: protocol を別ファイルで適用

## 要約

現行の `@@implements(Protocol<T>)` は model 宣言時に書く必要がある。RFC 0016 では Rust 風の **`impl` ブロック**で、**別ファイル / 別 module から** protocol の実装を注入できるようにする。

## 背景 / モチベーション

### 現行の制約

```prisma
model User @aggregate_root {
  @@implements(Repository<User>)   // ← User の宣言時に書く必要がある
}
```

この形だと:
- 外部 package の model (`@umlay/shared-models.User`) に protocol を後から適用不可
- 複数の protocol 実装を**機能モジュールごと**に分離して管理できない
- テスト用の mock protocol 実装を別ファイルに置けない

### 解決: `impl` ブロック

```prisma
// shared-models/user.umlay (別ファイル)
model User @aggregate_root { /* ... */ }

// auth-module/user-identity.umlay (別ファイル)
impl Identifiable for User { }

// audit-module/user-auditable.umlay (別ファイル)
impl Auditable for User {
  fn audit(action: string!) -> void { /* ... */ }
}
```

## 提案内容

### 構文 (EBNF)

```ebnf
TopLevel        ::= ... | ImplBlock
ImplBlock       ::= "impl" ProtocolRef "for" QualifiedName
                    ("where" WhereClause)?
                    "{" ImplMember* "}"
ProtocolRef     ::= QualifiedName ("<" TypeArgs ">")?
ImplMember      ::= FnMethodImpl | Field
FnMethodImpl    ::= "fn" Identifier "(" FnParams? ")" "->" ReturnType
                    "{" FnBody? "}"            (* body 内容は spec 範囲外、実装固有 *)
WhereClause     ::= "(" BoundCondition ("," BoundCondition)* ")"
BoundCondition  ::= Identifier ":" TypeBound
```

### 使用例

```prisma
namespace shop

import "./shared-models.umlay"

// 別ファイルから User に Identifiable を適用
impl Identifiable for shared_models.User {
  fn getId() -> UUID! {
    /* implementation body */
  }
}

// 型パラメータ制約付き (RFC 0015 との組み合わせ)
impl Cacheable<T> for shared_models.User where (T: Hashable) {
  fn cacheKey(entity: User!) -> string! {
    /* ... */
  }
}

// Orphan rule: impl を書けるのは
//   - Protocol を定義した namespace
//   - Target model を定義した namespace
// のいずれかのみ (Rust の orphan rule と同等、衝突防止)
```

### Orphan rule

「自分が所有しない protocol を、自分が所有しない model に適用する」ことを禁止。これにより同じ `(Protocol, Model)` ペアが複数箇所で実装される衝突を防ぐ。

**許可:**
- namespace `foo` が `foo.MyProtocol for bar.SomeModel` — OK (protocol は自分の)
- namespace `foo` が `bar.SomeProtocol for foo.MyModel` — OK (model は自分の)

**禁止:**
- namespace `foo` が `bar.SomeProtocol for baz.SomeModel` — NG (どちらも外部)

Orphan rule 違反は parse error。

### 既存の `@@implements` との関係

- `@@implements(P<T>)` は「model 宣言内での直接実装」
- `impl P<T> for M { }` は「別ファイル / 別 namespace での後付け実装」
- 両方同時使用は警告 (重複宣言扱い、IR では単一エントリに正規化)

## IR 影響

`impl` 宣言は IR 上では **target model の `implements[]` に追加**される (`@@implements` と同じ場所)。ただしソース情報として `implSource` 追加:

```jsonc
"implements": {
  "items": {
    "properties": {
      "protocol": { "type": "string" },
      "typeArgs": { "type": "array" },
      "implSource": {
        "type": "object",
        "description": "impl ブロック由来の場合のソース情報",
        "properties": {
          "file":    { "type": "string" },
          "where":   { "type": "object" }
        }
      }
    }
  }
}
```

## 後方互換性

**Class A (additive)**: 既存の `@@implements` 形は無影響。

## 代替案

- **案 B: `extend M` 構文 (Ruby / Swift extension 風)** — 却下: protocol 特化の明示性を失う
- **案 C: `implement M { P1, P2, ... }` (model 単位のまとめ)** — 却下: protocol 単位で分離したいユースケースが多い
- **案 D: orphan rule を緩和 / 廃止** — 却下: 複数リポジトリでの衝突リスクが高い

## サンプル / テスト

- 新サンプル `samples/with-impl-blocks/` ディレクトリ:
  - `core.umlay` で model + protocol を宣言
  - `feature-a.umlay` で impl ブロックを後付け適用
  - `feature-b.umlay` で別の impl を適用
- Conformance: orphan rule 違反の error、where 句での bound 解決

## 受諾時にやること

- [ ] `grammar.md` / `grammar.en.md` に §4.3 として impl 節追加
- [ ] `grammar.bnf` に `ImplBlock` 追加
- [ ] `ir.schema.json` の `implements[].implSource` 追加
- [ ] `skills/{ja,en}/write-uml.md` に使用例追加
- [ ] 新サンプル追加
- [ ] `SPEC_VERSION` 0.5.0 bump

## 未解決事項

- Method body の内部構文 (spec の範囲外だが、どこまで自由形式を許すか)
- blanket impl (`impl<T> Debug for T where T: Display`) の検討
- Default method の override 規則
