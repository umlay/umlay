# Roadmap — 公開範囲と今後

本リポジトリ (`umlay-oss`) が公開するのは **Umlay DSL の仕様 (spec) / サンプル (examples) / 開発者・AI 向け skill 定義 (skills) / ドキュメント (docs)** です。実装は別リポジトリで開発中で、本リポジトリの範囲外です。

## 現在公開されているもの

| パッケージ / ディレクトリ | 内容 | バージョン |
| --- | --- | --- |
| `@umlay/spec` | DSL 文法 + 正規IR JSON Schema + 形式文法 (BNF) + conformance (manifest + expected-ir + id-hash-vectors) + **32 RFC accepted** (〜0032 view-selectors) | 1.2.0 |
| `@umlay/examples` | 38 本の `.umlay` サンプル (全 RFC 機能のライブデモ含む、google-oauth-login は 5 view で selector ショーケース) | 1.2.0 |
| `skills/` | 開発者 / AI 向け skill 定義 (枠組み) | — |
| `docs/` | 利用者向けドキュメント (本ガイド群) | — |

## DSL が**完全解釈・描画対象**とする構文 (現行)

- `namespace <identifier>`
- `type <Name> @value_object { ... }`
- `enum <Name> { V1, V2 }`
- `model <Name> [@entity|@aggregate_root|@value_object] { ... }`
- `view <id> @er_diagram | @class_diagram | @sequence_diagram | @component_diagram | @package_diagram | @state_machine | @activity_diagram | @deployment_diagram | @wbs_diagram | @gantt_chart { ... }`
- アノテーション: `@id`, `@@id(a,b)`, `@ref`, `@unique`, `@index`, `@default`, `@codegenName`
- ブロック: `@@doc("""...""")`, `@@attachments(...)`, `@@theme("...")`, `@@mode(draft|strict)`, `@@dependencies(...)`, `@@sample(...)` (inline / 外部ファイル), `@@implements(...)`, `@@override(from: ...)` (RFC 0011)
- 拡張宣言: `protocol<out T: Foo & Bar> extends A, B { ... }` (C3 MRO + variance + bounds、RFC 0015/0019), `union X = A | B { payload: T! } | Recursive { child: X! }`, `module X { ... }`, `import <ns>`/`import "path" as alias`/`import "./glob/**/*.umlay"` (RFC 0014)
- `impl` ブロック: `impl<T> P for M where (T: Q) { }` (通常 + blanket、RFC 0016/0020)
- Sequence 拡張フラグメント: `alt`/`else`/default, `opt`, `par`/`and`/`await all|any|(labels)|all timeout(...)`, `loop`, `critical "X" on (a,b) timeout(5s) { } catch { } finally { }` (RFC 0017/0021)
- nullability: `!` / `?` / `??`

## **予約語のみ受理** (将来実装)

以下は現行 spec で受理 (parse) はされますが、描画・意味論処理は未対応です。

`function` / `queue` / `component` / `worker` / `kv` / `actor` / `event` など (完全リストは `@umlay/spec` の `RESERVED_KEYWORDS`)。

## spec の拡張方針

### 後方互換扱い

- 新しいアノテーション追加
- 新しい view kind の追加
- IR の新フィールド追加 (optional)

これらは `version: "1.0"` の範囲内で進めます。

### 破壊的変更

- 既存キーワードのセマンティクス変更
- IR の必須フィールド削除 / リネーム
- 参照解決ルールの変更

これらは `version: "2.0"` にバンプし、マイグレーションガイドを本ドキュメント配下で公開します。仕様変更は [CONTRIBUTING.md](../../CONTRIBUTING.md) 記載の RFC プロセスを経ます。

## 今後の検討項目 (優先度順)

| # | 項目 | 位置づけ |
| --- | --- | --- |
| 1 | Skills カタログの充実 (write / review / evolve / codegen) | 本リポジトリ |
| 2 | 予約語の描画対応 (function / queue / component) | 実装側 + spec 連携 |
| 3 | JSON Schema の厳格化 (必須制約、pattern 等) | 本リポジトリ |
| 4 | RFC プロセスの整備 (`packages/spec/src/rfcs/`) | 本リポジトリ |
| 5 | ツール作者向けコンフォーマンステストスイート | 本リポジトリ |
| 6 | 英語版 grammar.md | 本リポジトリ |

## バージョニング

- `@umlay/spec` は semver に従います
- `@umlay/examples` は spec のメジャー変更に追従します
- `skills/` 配下の各ファイルは独自に version タグを持ちます (フロントマター参照)

## 公開されない領域

以下は本リポジトリに含まれません。

- Umlay パーサ / Lint エンジン / SVG レンダラーの実装コード
- Web エディタ UI / サーバーサイド基盤
- 商用機能 / 課金 / 認証系
- 内部ロードマップ / 事業判断

## 関連

- [Overview](./overview.md)
- [Design Principles](./design-principles.md)
- [FAQ](./faq.md)
