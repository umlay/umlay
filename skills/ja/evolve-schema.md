---
name: evolve-schema
version: 0.8.0
spec: "@umlay/spec >= 0.8.0 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, developer, architect]
summary: 既存の Umlay DSL / IR を、後方互換と参照整合を維持しながら安全に拡張する手順
references:
  grammar: ../../packages/spec/src/grammar.md
  schema: ../../packages/spec/src/ir.schema.json
  keywords: ../../packages/spec/src/index.ts
---

# evolve-schema

## ゴール

既存の `.umlay` / IR に**意味のある変更**を加えつつ、既存 IR consumer (レンダラー、コード生成器、レビュー記録) への影響を最小化する。

## 前提

- IR バージョン `1.0` の範囲内での変更を第一選択とする
- `2.0` へのバンプは、**本当に破壊的でない方法がない**と確認してから行う

## 変更の分類

すべての変更は以下の 3 分類のいずれかに当てはめる。

| クラス | 例 | IR バージョン |
| --- | --- | --- |
| **A. 追加 (additive)** | 新しい model / attribute / view / enum 値の追加 | 1.0 のまま |
| **B. 緩和 (relaxation)** | `!` を `?` に変える、unique を外す、multiplicity を広げる | 1.0 のまま (注意) |
| **C. 破壊的 (breaking)** | 属性削除、型変更、参照削除、PK 変更、`onDelete: CASCADE` 追加 | 2.0 へバンプ |

`onDelete` の追加や強化は **C** として扱う (既存データに対する挙動変更のため)。

## 手順

### Step 1 — 変更の分類を決める

提案された変更に対し、次のマトリクスで A / B / C を決定する。

| 変更 | クラス |
| --- | --- |
| 新しい `model` を追加 | A |
| 既存 `model` に新しい属性を `?` で追加 | A |
| 既存 `model` に新しい属性を `!` + default 付きで追加 | A |
| 既存 `model` に新しい属性を `!` で追加 (default なし) | C |
| 既存属性の `type` を変更 | C |
| 既存属性の名前を変更 | C (rename 扱い: Stable ID は保たれるが表示名が変わる) |
| 既存属性を削除 | C |
| `@ref` の `onDelete` を `NO_ACTION` → `CASCADE` に変更 | C |
| `@ref` の `inverse` を追加 | A |
| 新しい `view` を追加 | A |
| 既存 view の `include` に model を追加 | A |
| `enum` に値を追加 | A (ただし default 影響は確認) |
| `enum` から値を削除 | C |
| ステレオタイプ変更 (`@entity` → `@aggregate_root` 等) | C |

### Step 2 — 参照整合性を確認

- 追加した attribute / model に対する `@ref` の targets が既存に解決するか
- 削除した attribute を参照していた `@ref` がないか
- view の include / exclude パターンが新規追加 model を巻き込むか (意図に合致するか)

### Step 3 — A (追加) の手順

1. 新要素を仕様に従って追加する ([write-uml](./write-uml.md) を参照)
2. 既存 view の `include` / `exclude` を確認し、意図通りに表示されるか確認
3. サンプルに 1 つ以上のユースケースを追加 ([`packages/examples/samples/`](../../packages/examples/samples/))
4. 関連する docs / skill に追記

### Step 4 — B (緩和) の手順

1. 変更前の属性値で動いていた consumer が壊れないか検証
2. `!` → `?` の場合、既存 IR を消費する側に null ハンドリングがあるか
3. 変更後の属性には `@intent` を残し、緩和理由を明示
4. 移行期間中はサンプルに**両バージョン**を置くことを検討

### Step 5 — C (破壊的) の手順

**原則: 破壊を一回のリリースに集中させず、2 段階で進める**

```
[v1] 旧 + 新 を併存 → [v2] 旧 deprecated → [v3] 旧削除
```

1. **Deprecation 段階**
   - 旧要素に `@deprecated("use X instead since 1.1")` を付与 (将来構文)
   - 新要素を並行追加 (Step 3 と同様)
   - ドキュメントに移行ガイドを追加

2. **Sunset 段階**
   - メジャーバージョンをバンプ (`IR_SCHEMA_VERSION` を `2.0` に)
   - マイグレーションスクリプト (旧 IR → 新 IR の変換) を用意
   - `docs/ja/roadmap.md` と `docs/en/roadmap.md` にマイグレーションガイドを追加

3. **RFC プロセス**
   - `packages/spec/src/rfcs/NNNN-<slug>.md` として提案を起こす
   - CONTRIBUTING.md 記載の RFC 手順に従う

## Stable ID と rename

IR の `_id` は**内容ハッシュベース**で、識別子 (name) の変更では変わらない。これを利用した安全な rename:

```
1. attribute の name を変更 (例: customerId → clientId)
2. IR diff で `_id` 同一、`name` 差分として検出される
3. consumer 側で `_id` 追跡していれば影響なし
4. name 依存の consumer (SQL 列名等) には移行が必要
```

注: `@codegenName` を使っている場合、コード生成結果を安定させるのに活用できる。

## 参照整合性の維持

```prisma
// ❌ NG: 参照先を削除すると、残る @ref が解決不能に
model Customer {
  id UUID! @id
}
model Order {
  customerId UUID! @ref(Customer.id)
}

// → Customer を削除する前に、Order.customerId の @ref を
//    新しい target に差し替えるか、Order 側から削除する
```

## チェックリスト

- [ ] 変更を A / B / C のどれかに分類した
- [ ] C の場合、2 段階移行の計画がある
- [ ] C の場合、RFC を `packages/spec/src/rfcs/` に起こした
- [ ] 追加 / 削除 model に対する `@ref` の解決性を確認した
- [ ] view の `include` / `exclude` で意図しない巻き込みがない
- [ ] サンプルに変更を反映した
- [ ] docs / skill に変更点を追記した
- [ ] IR バージョンバンプの要否を確認した (破壊的なら 2.0)

## 参照

- 文法: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- ロードマップ: [`docs/ja/roadmap.md`](../../docs/ja/roadmap.md)
- 関連 skill: [`write-uml`](./write-uml.md), [`review-uml`](./review-uml.md), [`codegen-mapping`](./codegen-mapping.md)
