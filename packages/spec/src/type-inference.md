# Umlay Type Inference Rules

**spec version**: 0.8.0 (RFC 0030 受諾時に初版作成)

DSL 内で型変数 `T` が現れる箇所 (protocol / union / impl / `@@implements`) の**解決と検証規則**を形式化する。

## 対象

- `protocol<T>` / `union<T>` のジェネリクス
- `impl<T> P for M where (T: Q)` (通常 + blanket)
- `@@implements(Repository<User>)` の型引数適用
- `<out T>` / `<in T>` の variance 検証
- `Self` 型の解決

## 1. 型引数の明示指定

**現行 (spec 0.8.0)**: 型引数は **必須**。推論省略は将来 RFC で追加予定。

```prisma
// ✅ OK
model UserRepo @service { @@implements(Repository<User>) }

// ❌ NG (parse error)
model UserRepo @service { @@implements(Repository) }
```

## 2. Bound 検証 (RFC 0015)

protocol の type parameter に制約がある場合、型引数の supply 時に検証。

### アルゴリズム

```
function checkBound(T, typeArg, bound):
  if bound is a single protocol P:
    return typeArg implements P          // 名義的判定
  if bound is intersection (A & B & ...):
    return ∀ p in [A, B, ...]: typeArg implements p
```

### 例

```prisma
protocol Repository<T: Identifiable> { ... }

model User @aggregate_root {
  @@implements(Identifiable)             // User は Identifiable を実装
}
model UserRepo @service {
  @@implements(Repository<User>)         // ✅ bound 満たす
}

model Config @entity { ... }             // Identifiable 未実装
model ConfigRepo @service {
  @@implements(Repository<Config>)       // ❌ S13: bound 違反
}
```

### intersection bound

```prisma
protocol IndexedCache<K: Hashable & Comparable, V> { ... }

model Hash42 {
  @@implements(Hashable)
  @@implements(Comparable)
}
model Cache42 @service {
  @@implements(IndexedCache<Hash42, string>)   // ✅ 両方の bound を満たす
}
```

## 3. Variance 規則 (RFC 0019)

### 使用位置の検証

```
for each declaration of protocol P<V> where V has variance X:
  for each occurrence of V in P's body:
    check position is allowed by X
```

| variance | 許可位置 | 禁止位置 |
| --- | --- | --- |
| `out` (共変) | return type / read-only field | parameter / mutable field |
| `in` (反変) | parameter / write-only field | return / read field |
| (不変、既定) | 任意の位置 | (なし) |

### Subtyping 規則

```
Dog <: Animal のとき:

  Producer<out T>:   Producer<Dog>    <: Producer<Animal>     ✅
  Consumer<in T>:    Consumer<Animal> <: Consumer<Dog>        ✅
  Repository<T>:     Repository<Dog>  ∼ Repository<Animal>    ❌ (無関係)
```

違反の例と error:

```prisma
// ❌ S14: 共変 T を in 位置で使用
protocol BadProducer<out T> {
  fn accept(x: T!) -> void     // ← out T が parameter 位置
}
```

## 4. 型等価性

Umlay は**名義的等価**を採用:

```prisma
protocol A { fn foo() -> int! }
protocol B { fn foo() -> int! }

// 構造は同じだが、A ∼ B は false
// @@implements(A) と @@implements(B) は別々に必要
```

## 5. Blanket impl の選択順位 (RFC 0020)

複数の blanket impl が同一型で適用可能な場合:

### アルゴリズム `pickBestImpl`

```
function pickBestImpl(T, candidates: [Impl]):
  filtered = candidates.filter(impl => impl.boundsSatisfiedBy(T))
  sorted   = filtered.sort(by: (a, b) => boundStrictness(b) - boundStrictness(a))

  if sorted.empty:
    return NoApplicableImpl
  if sorted.length > 1 && boundStrictness(sorted[0]) == boundStrictness(sorted[1]):
    throw AmbiguousImplError(sorted[0..1])      // S16 相当の曖昧性
  return sorted[0]

function boundStrictness(impl):
  // bound の数 + 厳密性の重み
  return impl.where.bounds.count
```

### 優先順位

1. **ユーザ明示の `impl P for SpecificType`** (blanket より常に優先)
2. **より厳密な blanket** (bound が多いほど優先)
3. 同じ厳密性で複数ある場合は parse error (S16)

### 例

```prisma
protocol Display { fn format() -> string! }
protocol Hashable { fn hash() -> bigint! }
protocol ToString { fn toString() -> string! }

impl<T> ToString for T where (T: Display) { ... }                      // blanket A (1 bound)
impl<T> ToString for T where (T: Display & Hashable) { ... }           // blanket B (2 bounds)
impl ToString for SpecificModel { ... }                                 // explicit C

// SpecificModel に対する選択:
//   C (explicit) が最優先
//   C がなければ B (strictness 2) > A (strictness 1) の順
//   B が適用可 (SpecificModel が Display & Hashable 両方を実装) なら B が勝つ
```

## 6. `Self` 型 (RFC 0015)

protocol 内で「実装する具体型」を指す擬似型:

```prisma
protocol Comparable {
  fn compareTo(other: Self!) -> int!
}

model User {
  @@implements(Comparable)
  fn compareTo(other: User!) -> int! { /* User 側で Self = User に解決 */ }
}
```

### Self 解決規則

```
in protocol body: Self = <abstract>           (未解決、型チェックでは placeholder)
in @@implements applying model M:  Self = M
in concrete fn impl: Self = hosting model
```

`Self` を protocol の return / parameter に自由に使える (variance 規則は適用されない)。

## 7. Diamond 継承の MRO (RFC 0011、型推論と関連)

`pickMethodFromMRO` アルゴリズム:

```
function resolveMethod(protocol P, methodName m):
  for ancestor in P.mro:                       // C3 order
    if ancestor declares m:
      return ancestor.implementationOf(m)
  throw MethodNotFound(P, m)

# @@override(from: X) で明示された場合:
function resolveMethodWithOverride(P, m):
  if P has @@override(from: X) for m:
    return X.implementationOf(m)
  return resolveMethod(P, m)
```

## 8. エラーメッセージ仕様

実装は以下の形式で診断を返すことが推奨:

```
S13: Cannot apply Repository<Config> to ConfigRepo
  Reason: type argument Config does not satisfy bound Identifiable
  Context: Repository<T: Identifiable> declared at packages/.../Repository.uml:12
           Config declared at packages/.../Config.uml:5, missing @@implements(Identifiable)
  Fix: add `@@implements(Identifiable)` to Config, or choose a different type
```

## 9. IR への反映

型推論結果を IR に optional で記録 (デバッグ用):

```jsonc
"implements": [
  {
    "protocol": "demo.Repository",
    "typeArgs": ["demo.User"],
    "resolved": {
      "bounds": [
        { "satisfied": true, "by": "demo.User implements demo.Identifiable" }
      ],
      "selectedImpl": "...",
      "mro":          [...]
    }
  }
]
```

## 10. 未解決事項 (将来 RFC)

- 暗黙推論 (`@@implements(Repository)` で T を context から推論)
- Higher-kinded types (`protocol Monad<F<_>>`)
- GADT 相当 (型 index 付き union)
- F-bounded polymorphism (`<T: Comparable<T>>`)

## 参照

- [RFC 0015](./rfcs/0015-type-parameter-bounds.md) — 型パラメータ bounds
- [RFC 0019](./rfcs/0019-type-parameter-variance.md) — variance
- [RFC 0020](./rfcs/0020-blanket-impl.md) — blanket impl
- [RFC 0030](./rfcs/0030-type-inference-rules.md) — 本ドキュメント導入 RFC
- [`lint-rules.md`](./lint-rules.md) — S13 / S14 / S16 等の診断ルール
- [`grammar.bnf`](./grammar.bnf) — 型構文の正本
