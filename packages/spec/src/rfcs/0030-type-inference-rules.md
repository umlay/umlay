---
rfc: 0030
title: 型推論ルールの形式化
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.8.0
change-class: A
parent-rfc: 0015
---

# RFC 0030 — 型推論ルールの形式化

## 要約

`protocol<T>` / `union<T>` / `impl<T>` / `@@sample` 行で現れる**型変数の解決**と**型引数の推論**について、形式的な規則を spec として明文化する。

## 背景 / モチベーション

現行 spec (RFC 0015 / 0019 / 0020) で型変数 `T` を使った宣言は導入したが、**具体型を渡す側** (`@@implements(Repository<User>)` や `impl<T> Foo for T` 等) での推論ルールは散文記述のみ。

実装間でのズレを防ぐため、Hindley-Milner の単純化版 + 境界条件を形式化する。

## 提案内容

### 1. 型引数の明示指定と省略

```prisma
// ✅ 明示指定
model UserRepository @service {
  @@implements(Repository<User>)
}

// ✅ 暗黙 (将来拡張、現状は明示必須)
// model UserRepository @service {
//   @@implements(Repository)     // T は attribute 型から推論?
// }
```

**現状 (RFC 0030 proposal)**: 型引数は**必須**。推論は将来 RFC。

### 2. 変性 (variance) のチェック

RFC 0019 の `<out T>` / `<in T>` に対し、型引数位置での使用を静的検証:

```
// 共変の subtyping:
Dog <: Animal      ⟹      Producer<Dog> <: Producer<Animal>    ✅

// 反変の subtyping:
Dog <: Animal      ⟹      Consumer<Animal> <: Consumer<Dog>    ✅

// 不変 (Repository<T> が invariant):
Dog <: Animal      ⟹      Repository<Dog> ∼ Repository<Animal>  ❌ (互換なし)
```

### 3. Bound 検証 (RFC 0015)

```
protocol Repository<T: Identifiable> { ... }

// ✅ OK: User が Identifiable を実装
model User @aggregate_root {
  @@implements(Identifiable)
}
model UserRepo @service {
  @@implements(Repository<User>)      // User <: Identifiable なので受理
}

// ❌ NG: Config は Identifiable を実装していない
model Config @entity { +key string! @id }
model ConfigRepo @service {
  @@implements(Repository<Config>)    // Config </: Identifiable で error
}
```

### 4. 型等価性

```
// 構造的同一性ではなく名義的等価性を採用
protocol A { fn foo() -> int! }
protocol B { fn foo() -> int! }

A ∼ B ⟺ false          // 構造は同じでも別型扱い
```

### 5. Blanket impl (RFC 0020) の選択順位

複数の blanket impl が同じ型で適用可能な場合の**優先順位アルゴリズム**:

```
function pickBestImpl(T, candidates):
  sorted = candidates.sort(by: (i1, i2) => {
    // より厳密な bound を持つ impl が優先
    if (bound_count(i1) > bound_count(i2)) return -1
    if (bound_count(i1) < bound_count(i2)) return +1
    return 0   // 同じ厳密性
  })

  if (sorted.length > 1 && equally_strict(sorted[0], sorted[1])):
    throw AmbiguousImplError(candidates)

  return sorted[0]
```

**ユーザ明示の `impl P for SpecificType` は blanket impl より常に優先。**

### 6. `Self` 型 (RFC 0015)

```
protocol Comparable {
  fn compareTo(other: Self!) -> int!    // Self = 実装する concrete type
}

model User {
  @@implements(Comparable)
  fn compareTo(other: User!) -> int!    // Self が User に解決される
}
```

### 7. 推論失敗時の error メッセージ仕様

```
Error: Cannot apply Repository<Config> to ConfigRepo
  Reason: type argument Config does not satisfy bound Identifiable
  Hint: add `@@implements(Identifiable)` to Config or use a different type
  Location: packages/examples/.../Config.uml:42
```

## IR 影響

IR には推論**結果**のみ反映 (過程は含めない):

```jsonc
"implements": [
  {
    "protocol": "demo.Repository",
    "typeArgs": ["demo.User"],
    "resolved": {
      "bounds": [{ "satisfied": true, "by": "demo.User implements Identifiable" }]
    }
  }
]
```

optional フィールド `resolved` に bound 解決ステータスを記録可能 (デバッグ用)。

## 後方互換性

**Class A**: 既存の明示指定は無影響。推論エラー化は spec 準拠実装で「現在黙って受理している不正」を error 化する可能性あり (migration guide で告知)。

## サンプル / テスト

- `bounded-generics.uml` に bound 違反ケースを追加
- 新 conformance テスト `type-inference-vectors.yaml`: 各ルールの正例・反例
- diamond MRO (RFC 0011) との相互作用テスト

## 受諾時にやること

- [ ] `packages/spec/src/type-inference.md` を新設 (アルゴリズム詳述)
- [ ] `grammar.md` / `grammar.en.md` §4.2 に「型推論規則はここ参照」を追加
- [ ] `ir.schema.json` の implements に `resolved` 追加
- [ ] `skills/{ja,en}/review-uml.md` に S13 (type bound violation) / S14 (variance violation) 追加
- [ ] `SPEC_VERSION` 0.8.0 bump

## 未解決事項

- higher-kinded types (`protocol Monad<F<_>>`) — 将来 RFC
- 暗黙的型推論 (`@@implements(Repository)` で T を推論)
- GADT 相当の型制約
- Subtype polymorphism と generics の相互作用詳細
