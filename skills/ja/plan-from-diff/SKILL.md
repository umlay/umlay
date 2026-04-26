---
name: plan-from-diff
version: 1.5.0
spec: "@umlay/spec >= 1.5.0 (DSL 1.0 / IR 1.0)"
audience: [ai-agent, developer, architect]
summary: change-impact レポート (または生 IR diff) から、順序付き実装計画 — タスク / ファイル / PR 境界 / ロールバック戦略 — を生成
description: Umlay IR delta (new → old) を持っていて、次のアクション = 安全に出荷するための具体的で順序付けされたエンジニアリングタスク群が欲しいときに起動する。`change-impact-diff` の出力 (または生 diff) を入力に、migration フェーズ / PR 分割 / 検証ゲート / ロールバックポイント付きの計画を吐く。
references:
  grammar: ../../../packages/spec/src/grammar.md
  schema: ../../../packages/spec/src/ir.schema.json
  keywords: ../../../packages/spec/src/index.ts
---

# plan-from-diff

## ゴール

IR delta (もしくは `change-impact-diff` レポート) を入力に、**実行可能な計画**を生成する。「`.umlay` が更新された」から「prod が新しい形になった」までを安全に繋ぐ、順序付きエンジニアリングタスクの集合。

この skill は**概念** (change-impact-diff) と**コード生成** (codegen-mapping) の間の失われた環。答えるべき問いは:

> 「どの順で、何本の PR に分けて、どこにロールバックポイントを置き、どの検証ゲートを通すか」

## 前提

| 項目 | 内容 |
| --- | --- |
| 入力 A | `change-impact-diff` レポート (推奨 — risk / impact / intent を含む) |
| 入力 A' | または baseline + current IR ペア (本 skill が内部で impact を計算) |
| 入力 B | ターゲットスタック: `{ orm: "prisma" \| "raw-sql" \| "drizzle" \| "typeorm" \| "none", runtime: "node" \| "bun" \| "edge", deploy: "zero-downtime" \| "maintenance-window" }` |
| 任意 | チーム制約: merge freeze 日 / レビュワー空き / on-call 当番 — PR 並び順に影響 |
| 出力 | §7 の形の計画。Markdown checklist / GitHub issue / Jira / Linear に projection 可 |

## この skill が**やらない**こと

- **コード生成** — 実際の Prisma / SQL / TS 出力は `codegen-mapping` の仕事
- **影響分析** — それは `change-impact-diff` (上流)
- **品質レビュー** — それは `review-uml`
- **自動マージ** — タスクを吐くだけで commit はしない。人間と下流エージェントが実行する

## 決定論の条件

- **タスク分解ルール** (§3) は決定論的。同じ入力 + 同じターゲットスタック → 同じタスク集合と同じ順序
- **タスク説明** (平易なタイトル + 受け入れ条件) は LLM で磨いても良いが、**タスクの同定 (集合 + DAG) は LLM 抜きで再現可能**でないといけない。これで計画はテスト可能になる

## 1. 計画の 3 軸

全タスクに 3 軸のタグを付ける。どの tracker にも projection できるようにするため:

| 軸 | 値 | 目的 |
| --- | --- | --- |
| **Phase** | `schema`, `backfill`, `dual-write`, `cutover`, `cleanup`, `verify` | staging 順 |
| **Surface** | `dsl`, `db-migration`, `app-code`, `view`, `docs`, `ops` | 触る artifact |
| **Risk** | `breaking`, `caution`, `safe` | change-impact-diff から継承 |

3 軸全部が埋まらないタスクは仕様不足。reject する。

## 2. Phase のセマンティクス

Phase は厳密に順序あり。後続 phase のタスクを、前 phase のブロッキングタスクが全完了する前に出してはいけない。

| Phase | 意味 | 典型タスク |
| --- | --- | --- |
| **schema** | IR / DSL 自体が固まる | `.umlay` 更新、`codegen-mapping` で Prisma / DDL を再生成 |
| **backfill** | 既存データが新形式と互換になる | バックフィルスクリプト、データクレンジング、shadow 列投入 |
| **dual-write** | 新旧両形式を同時サービス | アプリは両フィールドに書き、読みは旧側 (互換ウィンドウ) |
| **cutover** | 読みを新形式に切替 | feature flag / config / ORM モデル切替。旧列は安全網として残す |
| **cleanup** | 旧形式を除去 | 旧列 drop、dual-write コード削除、shim 撤去 |
| **verify** | 着地確認 | メトリクス、audit log、query plan、下流コンシューマの ack |

**ショートカットルール**: `safe` 変更 (additive only + default 付き) は `schema → verify` の 2 phase に畳む。自明な変更に 5 phase を**強制しない**。

## 3. タスク分解ルール

各ルールは変更カテゴリごとに、依存エッジ付きの固定タスク集合を吐く。

### model 削除

```
[schema]   .umlay 更新 + Prisma 再生成 (Breaking)
[schema]   ポリシーによっては先に @deprecated リリースを挟む
[verify]   app コードの model 参照を grep — 結果は空でなければいけない
[cleanup]  テーブル drop (DROP TABLE migration を生成)
[cleanup]  TS 型 / repository を削除
Edges: schema → verify → cleanup
```

### attribute 削除

```
[schema]    .umlay 更新 (attribute 削除)
[backfill]  N/A (削除)
[app-code]  N 箇所の参照元を全て削除 (impact scan のリスト)
[schema]    DROP COLUMN migration を生成 — 参照元クリーン後のみ
[verify]    query log で列が参照されなくなったか確認
Edges: schema(DSL) → app-code → schema(DDL) → verify
```

### NULL 許容 → 非 NULL (default 無し)

```
[schema]     .umlay 更新 (@default を足す / 2-phase を計画)
[backfill]   バックフィルスクリプトで新非 NULL 列を埋める
[dual-write] アプリはロールアウト中 nullable を許容
[schema]     prod でバックフィル実行
[schema]     列を NOT NULL に alter (検証後)
[verify]     NULL 件数 = 0
[cleanup]    "nullable 許容" 分岐を削除
Edges: schema(DSL) → backfill(code) → dual-write → backfill(data) → schema(DDL) → verify → cleanup
```

### PK 変更 (identity 拡張 / 置換)

```
[schema]     .umlay 更新 (新 identity)
[backfill]   既存行の新 PK 列を populate
[dual-write] 新旧両 PK に書き込み
[schema]     新 PK に UNIQUE 制約 (まだ PRIMARY KEY ではない)
[cutover]    トランザクションで PRIMARY KEY を swap
[cleanup]    旧 PK 列 / 旧 UNIQUE を drop
Edges: 厳密チェーン、並列化禁止
```

### 既存 FK に `onDelete: CASCADE` 追加

```
[schema]  .umlay 更新
[verify]  全参照行を列挙し、cascade が意図どおりか ADR で確認
[schema]  ALTER FK migration (高速、データ移動なし)
[verify]  回帰テスト: staging で親 delete → 子の挙動観察
Edges: schema(DSL) → verify(ADR) → schema(DDL) → verify(test)
```

### 型変更 (例: int → bigint)

```
[schema]     .umlay 更新
[backfill]   新型の shadow 列を追加
[backfill]   shadow 列にデータコピー
[dual-write] 新旧両方に書く
[cutover]    primary 参照を swap / shadow → target にリネーム
[cleanup]    旧列 drop
```

### stereotype 変更

```
[schema]     .umlay 更新
[app-code]   invariant 前提 (@@inv、リポジトリ境界) を監査
[docs]       カテゴリ変化の ADR を起こす
[verify]     review-uml で L-rule / R-rule 回帰ゼロ確認
DB migration なし — stereotype は意味論、DDL ではない
Edges: schema → app-code + docs (並列) → verify
```

### model 追加

```
[schema]     .umlay 更新 + 再生成
[schema]     CREATE TABLE migration を生成
[app-code]   repository / service の stub を追加 (任意、同 PR 可)
[view]       @er_diagram のカバレッジを追加 / 拡張 (write-uml フォロー)
[verify]     parse + render 確認
Edges: schema → app-code (view と並列) → verify
```

### view 追加 / 改名

```
[schema]  .umlay 更新 (view 定義)
[docs]    dsl-guide / onboarding の参照を更新
DB / app-code 影響なし — view は描画契約
Edges: schema → docs
```

### rename (attribute / model)

```
[schema]     .umlay 更新 (rename)
[schema]     rename migration を生成 (DROP + CREATE ではない)
[app-code]   旧名を grep、全参照元を更新
[docs]       外部ドキュメントの旧名引用を更新
[verify]     回帰テスト
Edges: schema(DSL) → app-code → schema(DDL) → verify
```

## 4. PR 境界ルール

同 phase 内のタスクは、**以下全て**を満たすとき 1 PR に束ねて良い:

1. 同じ **surface** (`db-migration` + `app-code` 混在はデプロイが原子的かつ diff が小さい場合のみ)
2. 同じ **risk** (Safe タスクの横に Breaking を置くとレビュワーが文脈を失う)
3. 全体の diff 量が人間レビュー可能 (デフォルトガイドで ≤ 400 LOC 目安、チーム基準で調整)

1 つでも破れたら分割。bundle タイトルテンプレ:

```
[Phase/Surface] <model or area>: <what + why>
```

例:

- `[schema/dsl] auth.User: email → contactEmail に rename`
- `[backfill/db] auth.User: contactEmail を email から populate`
- `[cleanup/db] auth.User: email 列を drop`

## 5. Phase ごとの検証ゲート

各 phase は**検証ゲートタスク**を吐き、次 phase 開始前に pass しないといけない。planner がこれを自動で差し込む。

| Phase | ゲート |
| --- | --- |
| `schema` | `@umlay/core` parse + `review-uml` で新規 S / Strict 違反ゼロ + `codegen-mapping` dry-run 成功 |
| `backfill` | 旧形式 vs 新形式の件数差 = 0 (prod) |
| `dual-write` | prod エラー率が N σ / M 時間内で不変 |
| `cutover` | 旧コードパス呼び出しが T 分以上ゼロ |
| `cleanup` | 削除した名前がコード / ドキュメント / telemetry で参照されていない |
| `verify` | メトリクスダッシュボード更新、ADR マージ、on-call ブリーフィング完了 |

## 6. ロールバックポイント

`breaking` / `caution` タスクごとに**ロールバック注記**をペアで吐く: 何を revert するか、どの commit まで、revert が安全に成立するためのデータ状態は何か。

```
Rollback for task "alter column NOT NULL":
  revert-to: <ALTER 前の commit>
  data-state: "全行がまだ NULL 許容形を保っていること"
  note:      "新 NOT NULL 下で書き込みが起きた場合は、revert 前に
              shadow 列のバックフィルが必要"
```

Safe のみの変更集合ではロールバック注記は省略 (revert は単なる `git revert` + 再デプロイで済む)。

## 7. 出力形式

```yaml
meta:
  generated_at: 2026-04-24T06:00:00Z
  source_diff_hash: <impact レポート / IR ペアの sha1>
  target_stack:
    orm: prisma
    runtime: node
    deploy: zero-downtime

summary:
  total_tasks: 12
  phases:      [schema: 4, backfill: 2, dual-write: 1, cutover: 1, cleanup: 2, verify: 2]
  risk:        [breaking: 1, caution: 3, safe: 8]
  blocking_chain_length: 5       # 最長依存チェーン (最小 PR 本数の下限)

tasks:
  - id: T01
    phase: schema
    surface: dsl
    risk: caution
    title: "auth.User を更新 — email → contactEmail rename、phone? 追加"
    description: "DSL 編集 + codegen-mapping で Prisma / SQL 再生成"
    acceptance:
      - "`pnpm typecheck` が通る"
      - "`review-uml` が新規 S レベル / Strict 昇格違反をゼロと報告"
    rollback:
      revert-to: <baseline>
      data-state: "DB に email 列がまだ存在"
    depends_on: []
  - id: T02
    phase: backfill
    surface: db-migration
    risk: caution
    title: "バックフィル migration: contactEmail = email"
    acceptance:
      - "migration 後 contactEmail IS NULL の行がゼロ"
    rollback:
      revert-to: T01
      data-state: "安全 — contactEmail は T05 までは additive"
    depends_on: [T01]
  # ...

pr_bundles:
  - title: "[schema/dsl] auth.User: email → contactEmail を rename"
    tasks: [T01]
    reviewers: [@data-owner, @auth-lead]
  - title: "[backfill/db] auth.User: contactEmail を populate"
    tasks: [T02]
    reviewers: [@dba, @auth-lead]
  # ...
```

この YAML は以下に projection できる:

- Markdown checklist (PR bundle ごとにグループ化、タスク 1 行)
- GitHub / Jira / Linear issue (タスク 1 件 = issue 1、`depends_on` = リンク)
- Mermaid Gantt (phase = swim lane、`depends_on` = edge)
- Umlay `@gantt_chart` view (ドッグフーディング — `.umlay` 断片を吐く)

## 8. 手順

### Step 1 — 受け取り
`change-impact-diff` レポート or 生 IR ペアのどちらでも受ける。生 IR の場合は内部で `change-impact-diff` を走らせて risk + impact を得る。

### Step 2 — 各変更を分類
各 model レベル変更を §3 のルールセットに対応付ける。該当ルールなしなら `phase: schema, surface: dsl, risk: <継承>` のタスク 1 本を吐き、`TODO(author): uncategorised change — phasing を指定してください` を添える。

### Step 3 — 分解ルール適用
ヒットした各ルールがタスクリスト + エッジを吐く。全体 DAG に集約。

### Step 4 — 最小ブロッキングチェーン計算
DAG の最長パスを求める。これが逐次 PR の最小本数 + デプロイ段数の下限。summary に含める。

### Step 5 — PR に bundle (§4)
phase + surface + risk が一致するタスクを greedy にパック、サイズ予算を守る。bundle タイトルを吐く。

### Step 6 — 検証ゲートタスクを差し込む (§5)
phase 境界ごとにゲートタスクを 1 件挿入。edge: phase N の全タスク → ゲート → phase N+1 の全タスク。

### Step 7 — ロールバック注記を付ける (§6)
`breaking` / `caution` タスクごとに revert 先と data-state 前提を計算。

### Step 8 — 出力組立 (§7)
YAML を組む。任意で特定コンシューマ (Markdown / Linear / `@gantt_chart`) に projection。

## チェックリスト

- [ ] 全変更が §3 ルールにマップされている (未該当は `TODO`)
- [ ] 全タスクに phase / surface / risk が付いている
- [ ] DAG が acyclic、最長チェーン長が PR 本数の下限として summary に載る
- [ ] PR bundle が phase + surface + risk を守っている、サイズ予算を記載
- [ ] 全 phase 遷移に検証ゲートタスクが存在
- [ ] 全 breaking / caution タスクにロールバック注記がある
- [ ] Safe のみの変更集合は `schema → verify` に畳まれている
- [ ] 出力にソース diff の hash が含まれ、再現性が担保されている

## 例 (抜粋)

変更: `auth.User` が `contactEmail` を得る (`email` の rename) + 新 `phone: string?`。

畳んだ計画 (happy path):

```
T01 schema/dsl    User.email → contactEmail rename、phone? 追加  (caution)
T02 schema/dsl    Prisma / SQL 再生成                               (caution)
------- verify gate: parse + review-uml + dry-run migration -------
T03 backfill/db   contactEmail を email からバックフィル             (caution)
T04 app-code      4 箇所の参照元を更新 (impact リスト)                (caution)
------- verify gate: 旧列への書き込みが shim を通っている --------
T05 dual-write    書き込みで contactEmail + email 両方を許容         (caution)
------- verify gate: エラー率が 24h 安定 --------------------
T06 cutover       Prisma モデルから email を drop                    (breaking)
T07 cleanup/db    email 列を DROP COLUMN                            (breaking)
------- verify gate: 24h 列参照がログに出ない ---------------
T08 verify/ops    メトリクスダッシュボード安定を確認                   (safe)
```

PR bundles:

- PR 1: T01, T02 (schema/dsl) — 単一レビュワー、小 diff
- PR 2: T03 (backfill/db) — DBA レビュー
- PR 3: T04 (app-code) — サービスオーナーレビュー
- PR 4: T05 (dual-write) — サービスオーナーレビュー
- PR 5: T06, T07 (cutover + cleanup/db) — **ペア必須**。ここを分けると旧コードが drop 済み列に走るウィンドウが生まれる
- PR 6: T08 (verify) — クロージング

## skill の拡張ポイント

- **別 ORM** (Drizzle / TypeORM) → phasing が変わる箇所だけ §3 にルール追加。多くは ORM 非依存 (スキーマ意味論ベース)
- **別デプロイプロファイル** (zero-downtime ではなくメンテナンスウィンドウ) → `backfill + dual-write + cutover` をウィンドウ開始をゲートとする 1 phase に畳む。ロールバック注記は有効
- **チーム制約** (merge freeze / 休暇) → bundle に `blocked_by: "freeze until 2026-03-05"` を付ける。計画自体は有効、実行がズレるだけ

## 参照

- 文法: [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- IR: [`packages/spec/src/ir.schema.json`](../../packages/spec/src/ir.schema.json)
- 上流: [`change-impact-diff`](./change-impact-diff.md)
- 下流実行: [`codegen-mapping`](./codegen-mapping.md) (実際の Prisma / SQL / TS を生成)
- 姉妹: [`evolve-schema`](./evolve-schema.md) (進行中の DSL 変更。本 skill はその出力を食う)
