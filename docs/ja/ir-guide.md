# IR Guide — ツール開発者向け

Umlay の**正規IR (Intermediate Representation)** は、DSL をパースした後のツール内部表現です。`.uml` → 正規IR の変換は実装側 (別リポジトリ) が担いますが、IR の構造自体は本リポジトリの JSON Schema が正本です。

- JSON Schema: [`../../packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json) (Draft 2020-12)
- バージョン: `1.0`

## IR の位置づけ

```
.uml ─ parse ─▶ 正規IR (JSON) ─ consume ─┬─▶ SVG レンダラー
                                          ├─▶ Prisma / SQL / TS 生成
                                          ├─▶ Lint / スコア / リスク検出
                                          └─▶ レビュー / diff / 注釈付与
```

DSL の表現方法が変わっても、IR に到達した時点で形が揃います。以降の処理 (描画・生成・lint・レビュー) はすべて IR に対して行います。

## 例

`.uml`:

```prisma
model Order @aggregate_root @intent("顧客発注のアグリゲート") {
  id          UUID! @id
  customerId  UUID! @ref(Customer.id)
  -> composition 1..* lines: OrderLine
}
```

IR (抜粋):

```jsonc
{
  "version": "1.0",
  "kind": "UmlModel",
  "namespaces": {
    "ordering": {
      "models": {
        "Order": {
          "_id": "sha1:ordering.Order",
          "stereotype": "aggregate_root",
          "intent": "顧客発注のアグリゲート",
          "identity": ["id"],
          "attributes": [
            {
              "_id": "sha1:ordering.Order.id",
              "name": "id",
              "type": "UUID",
              "visibility": "public",
              "nullable": false,
              "pk": true
            }
          ],
          "relations": [
            {
              "kind": "composition",
              "target": "ordering.OrderLine",
              "multiplicity": "1..*",
              "role": "lines"
            }
          ]
        }
      }
    }
  },
  "views": []
}
```

## 主要な設計方針

### 1. Stable ID (`_id`)

各エンティティ / 属性 / リレーションに、内容ハッシュベースの安定 ID (`sha1:...`) を付与します。

- 識別子を改名しても、構造が同一なら IR diff は「rename」として検出可能
- レビュー注釈 (`@review` / `@fix`) は `_id` に紐づけ、リネーム耐性を確保

### 2. 必須フィールド

IR に到達した時点で、以下は必ず埋まっています (Strict モード時は DSL 段階で強制、Draft モード時は既定値で補完される)。

- `visibility` — `public` / `private` / `protected`
- `nullable` — bool
- `multiplicity` — relation の場合 `"1"`, `"0..1"`, `"1..*"`, `"0..*"`, ...

### 3. 参照は完全修飾名

すべての参照 (`@ref` / view の `include`) は、IR 上で `<namespace>.<name>` のフル修飾に正規化されます。

### 4. ビューはモデルを重複定義しない

`views[]` はモデルの**投影**のみを持ちます。`include` パターンで「どのモデル群を描くか」を指定し、描画属性 (layout / participant alias など) を乗せます。

## IR 消費者向けの推奨

| 目的 | 推奨アプローチ |
| --- | --- |
| 可視化 | `views[]` を 1 つ選び、参照される `namespaces[*].models[*]` を解決してレンダリング |
| コード生成 | 決定論的部分 (型 / DDL / OpenAPI) はテンプレート変換 / LLM 併用部分は IR + `intent` + 契約をプロンプトに |
| diff / レビュー | `_id` ベースで new / removed / renamed を判定 |
| lint / リスク | `attributes[*].nullable`, `relations[*].multiplicity` などをルールエンジンに投入 |

## バージョン互換

- `version: "1.0"` の配下でフィールド追加は**後方互換**として扱います
- 破壊的変更は `version: "2.0"` にバンプし、マイグレーション手順を公開します
- Schema の変更は RFC プロセスを経て `packages/spec` に反映されます ([CONTRIBUTING.md](../../CONTRIBUTING.md) 参照)

## spec 0.8.0 で追加されたフィールド

以下は RFC 受諾に伴って IR に追加された新フィールド (全て optional、既存 0.x IR とは互換):

### view.sequenceBody (RFC 0007 / 0017 / 0021 / 0028)

sequence diagram の参加者 + statement tree を構造化保持:

```json
{
  "kind": "sequence_diagram",
  "sequenceBody": {
    "participants": [
      { "id": "api", "label": "API", "ref": "auth.AuthAPI" }
    ],
    "statements": [
      { "kind": "message", "from": "api", "to": "db", "arrow": "sync", "label": "SELECT user" },
      {
        "kind": "critical", "label": "external call",
        "timeout": { "duration": "3s" },
        "retry": { "attempts": 3, "backoff": "exponential", "initial": "100ms", "jitter": true },
        "body": [ /* statements */ ],
        "catchBlock": { "label": "exhausted", "body": [ /* statements */ ] },
        "finallyBlock": { "body": [ /* statements */ ] }
      },
      { "kind": "alt", "cases": [{ "condition": "success", "body": [...] }], "elseBody": [...] },
      { "kind": "opt", "condition": "debug mode", "body": [...] },
      { "kind": "par", "branches": [{ "label": "cache", "body": [...] }], "awaitSpec": { "labels": ["cache"] } },
      { "kind": "loop", "condition": "more rows", "body": [...] },
      { "kind": "await", "labels": ["cache", "log"] }
    ]
  }
}
```

### view.layout (RFC 0002)

Layout ヒント (renderer 任意で尊重):

```json
{ "layout": { "direction": "LR", "engine": "elk", "spacing": 40, "align": "center" } }
```

### GanttTask.dependsOn — PMBOK 形式 (RFC 0024)

従来の `string[]` に加えて object 形が accepted:

```json
{
  "dependsOn": [
    "task-a",                                               // short: FS + lag=0
    { "id": "task-b", "kind": "SS", "lag": 2 },            // Start-to-Start + 2日 lag
    { "id": "task-c", "kind": "FF", "lag": 0 },            // Finish-to-Finish
    { "id": "task-d", "kind": "SF", "lag": -1 }            // Start-to-Finish + 1日 lead
  ]
}
```

実装側は CPM 計算時に全 kind + lag を反映する (詳細は `packages/spec/src/rfcs/0024-*.md`)。

### ir.meta.imports (RFC 0009 / 0014)

```json
{
  "meta": {
    "imports": [
      { "kind": "ns",   "value": "pm_core" },
      { "kind": "path", "value": "./tasks/sprint-1.uml", "alias": "sprint1" },
      { "kind": "path", "value": "./tasks/*.uml" }
    ]
  }
}
```

## 今後追加予定のフィールド (1.0 RC)

以下の RFC は spec に accepted だが、`ir.schema.json` (Zod 生成) にはまだ持ち上がっていない。実装パーサは内部表現で持ち、1.0 freeze までに schema 面にも反映する:

- `namespace.protocols[]` / `namespace.unions[]` / `namespace.impls[]` (RFC 0006 / 0010 / 0016 / 0020)
- `model.sampleSources[]` (RFC 0004 / 0008)
- `view.criticalPath` (RFC 0024 — CPM strategy)
- `attribute.deprecated` / `attribute.experimental` (RFC 0023 / 0027 — 現状は parser で解釈、IR export は未)

詳細は [`migration-guide-1.0.md`](./migration-guide-1.0.md) §4 を参照。

## 参考

- [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json) — `pnpm --filter @umlay/core gen:ir-schema` で自動生成
- [DSL Guide](./dsl-guide.md)
- [Design Principles](./design-principles.md)
- [Lint Rules](../../packages/spec/src/lint-rules.md)
- [Type Inference](../../packages/spec/src/type-inference.md)
- [Conformance helper](../../packages/spec/src/conformance/match.ts) — `assertIRMatches` の実装
