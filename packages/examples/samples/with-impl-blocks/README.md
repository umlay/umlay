# with-impl-blocks — RFC 0016 `impl` ブロックデモ

spec 0.5.0 で導入された Rust 風 `impl` ブロックで、**別ファイル / 別 namespace から protocol 実装を注入**する例。

## ディレクトリ構成

```
with-impl-blocks/
├── core.uml            (core namespace: protocol + model の宣言のみ)
├── feature-auth.uml    (auth namespace: 認証用 protocol を core.User に適用)
└── feature-audit.uml   (audit namespace: 監査用 protocol を core.User/Order に適用)
```

## Orphan rule

`impl P for M { }` は以下のいずれかを満たす namespace でのみ書ける:

- **P を定義した namespace**、または
- **M を定義した namespace**

どちらも外部の場合は parse error。

### 本サンプルでの適用

- `feature-auth.uml`: `auth.Authenticatable` を `core.User` に適用 → Authenticatable は auth 所有なので OK
- `feature-audit.uml`: `audit.Timestamped` を `core.User` / `core.Order` に適用 → Timestamped は audit 所有なので OK

## where 句 (RFC 0015 との組み合わせ)

```prisma
impl Cacheable<T> for core.User where (T: Hashable) {
  fn cacheKey(entity: User!) -> string! { }
}
```

## IR 表現

実装後の `core.User` の IR `implements[]`:

```jsonc
"implements": [
  { "protocol": "auth.Authenticatable", "implSource": { "file": "feature-auth.uml", "namespace": "auth" } },
  { "protocol": "audit.Timestamped",    "implSource": { "file": "feature-audit.uml", "namespace": "audit" } }
]
```

`implSource` が存在する項目は impl ブロック由来、存在しない項目は `@@implements(...)` 由来。

## 関連

- [RFC 0016](../../../spec/src/rfcs/0016-impl-blocks.md) — 本機能の提案本体
- [RFC 0010](../../../spec/src/rfcs/0010-protocol-union-enhancements.md) — 多重継承 `extends` (parent)
- [RFC 0009](../../../spec/src/rfcs/0009-import-cross-file.md) — `import` 構文
