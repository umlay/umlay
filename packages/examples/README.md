# @umlay/examples

Umlay DSL のサンプル集。全サンプルは `@umlay/spec` に準拠し、`skills/ja/write-uml.md` と `skills/ja/review-uml.md` で自己レビュー済み。

| # | ファイル | ねらい | mode |
|---|---|---|---|
| 1 | `hello-order.umlay` | 最小サンプル (model 2 + view 2) | draft |
| 2 | `blog.umlay` | Users / Posts / Comments / Tags | strict |
| 3 | `ecommerce.umlay` | cascade / inverse + 値オブジェクト (Money) | strict |
| 4 | `saas-multitenant.umlay` | Orgs / Teams / Memberships / Invitations | strict |
| 5 | `japanese-domain.umlay` | 日本語識別子 + `@codegenName` | strict |
| 6 | `with-attachments.umlay` | 画像添付デモ (原則#6) | draft |
| 7 | `with-custom-theme.umlay` | 外部 CSS テーマ適用デモ (原則#5) | strict |
| 8 | `reserved-keywords.umlay` | 予約語の扱い (識別子禁止 / 将来構文はコメント) | strict |
| 9 | `project-schedule.umlay` | WBS / Gantt: 10 週間のリリース計画。**`@@sample(...)` (RFC 0004)** で 13 タスク + 11 依存をインスタンスデータ化、`parentId` で階層、cross-task 依存は `TaskDependency` | strict |
| 10 | [`login/`](./samples/login/) | Google OAuth + AWS serverless ログインフロー (画面 + バックエンド + DynamoDB、7 view、RFC 0003 `alt`/`else` 使用) | strict |
| 11 | `event-sourcing.umlay` | **RFC 0006 `union`** デモ。`union OrderEvent = OrderCreated \| OrderConfirmed \| OrderShipped \| OrderCancelled` | strict |
| 12 | `modules-ddd.umlay` | **RFC 0006 `module` + `protocol<T>`** デモ。`Repository<T>` / `EventPublisher<E>` を catalog / checkout モジュールで `@@implements` | strict |
| 13 | [`multi-project-schedule/`](./samples/multi-project-schedule/) | **RFC 0005 cross-namespace `@@dependencies`** + **RFC 0009 `import`** デモ。3 namespace 横断 | strict |
| 14 | `concurrent-flow.umlay` | **RFC 0007 `opt` / `par`** + **RFC 0013 `await`** デモ。注文 API の並行書き込み (必須 2 / fire-and-forget 1) + オプショナル通知 | strict |
| 15 | `ast-expr.umlay` | **RFC 0012 recursive union variant** デモ。算術式 AST (`Expr = Num \| Var \| Add \| Mul \| Let`) + ジェネリクス二分木 `Tree<T>` | strict |
| 16 | `diamond-protocol.umlay` | **RFC 0011 C3 MRO + `@@override`** デモ。Base/Left/Right/Diamond で 4 パターンの method 解決 | strict |
| 17 | [`with-glob-imports/`](./samples/with-glob-imports/) | **RFC 0014 glob import** デモ。`import "./tasks/*.umlay"` で 3 sprint の統合 Gantt | strict |
| 18 | `bounded-generics.umlay` | **RFC 0015 型パラメータ制約** デモ。`protocol Repository<T: Identifiable>` / `IndexedCache<K: Hashable & Comparable, V>` | strict |
| 19 | [`with-impl-blocks/`](./samples/with-impl-blocks/) | **RFC 0016 `impl` ブロック** デモ。3 namespace × orphan rule + where 句 | strict |
| 20 | `transfer-critical.umlay` | **RFC 0017 `critical` リージョン** デモ。送金フローの排他セクション + par/opt 組み合わせ | strict |
| 21 | `variance-demo.umlay` | **RFC 0019 型パラメータ variance** デモ。`<out T>` / `<in T>` の共変・反変 + subtyping 規則 | strict |
| 22 | `blanket-impl-demo.umlay` | **RFC 0020 Blanket impl** デモ。`impl<T> P for T where (T: Q)` による自動派生 | strict |
| 23 | `critical-with-timeout.umlay` | **RFC 0021 `critical` timeout + catch + finally** デモ。決済 API + ネスト critical | strict |
| 24 | `deprecated-migration.umlay` | **RFC 0023 `@deprecated`** デモ (5 レベル適用) | strict |
| 25 | `critical-path-demo.umlay` | **RFC 0024 Gantt CPM** デモ (2 critical path) | strict |
| 26 | `with-codegen-hooks.umlay` | **RFC 0025 `@@codegen`** デモ (6 target × 4 action) | strict |
| 27 | `experimental-api.umlay` | **RFC 0027 `@experimental`** デモ (attribute/model/protocol/enum/deprecated との遷移) | strict |
| 28 | `resilient-external-call.umlay` | **RFC 0028 `critical retry`** デモ (exponential/linear/constant backoff + ネスト) | strict |

## 全サンプルに適用した規律

- 全 model / enum / 主要 view に `@intent(...)` で意図を明記
- Strict mode サンプルは全属性に `+` / `-` の visibility を明示
- `@ref(..., onDelete:, inverse:)` で参照整合性を明示
- view の `kind` は IR schema enum の 10 種に限定 (`@er_diagram` / `@class_diagram` / `@sequence_diagram` / `@component_diagram` / `@package_diagram` / `@state_machine` / `@activity_diagram` / `@deployment_diagram` / `@wbs_diagram` / `@gantt_chart`)
- 予約語 (`function` / `queue` / `component` ほか) は identifier として使わない
