# Umlay Skills

Umlay DSL / IR を扱う開発者・AI エージェント向けの **skill 定義**。すべての skill は [`@umlay/spec`](../packages/spec/) (`grammar.md` と `ir.schema.json`) を正本とし、その枠内での手順・制約・DSL 例を提供します。

Skill definitions for developers and AI agents working with Umlay DSL / IR. Every skill is grounded in [`@umlay/spec`](../packages/spec/) (`grammar.md` and `ir.schema.json`) and provides procedures, constraints, and DSL examples within that contract.

## Skill 一覧 / Catalog

| Skill | 目的 (JA) | Purpose (EN) |
| --- | --- | --- |
| `umlay` | どの skill から始めるか 2 質問で振り分ける相談窓口 | Consultation entry-point — 2 questions to pick the right skill |
| `write-uml` | 要件から `.umlay` を書き起こす | Produce a spec-conformant `.umlay` from requirements |
| `review-uml` | DSL / IR を spec + lint + リスクでレビュー | Review DSL / IR across spec / lint / risk layers |
| `evolve-schema` | 既存 DSL を後方互換性を守って拡張 | Safely evolve existing DSL |
| `codegen-mapping` | IR を Prisma / SQL / TS へ決定論的に変換 | Deterministic IR → Prisma / SQL / TS mapping |
| `reverse-engineer` | 既存 Prisma / SQL / TS を `.umlay` に取り込み | Import existing Prisma / SQL / TS into `.umlay` (round-trip inverse of codegen-mapping) |
| `transcribe-design` | 既存設計書 (Markdown / Word / PDF) を `.umlay` に転記 | Lift an existing natural-language design doc into a `.umlay` skeleton (NL counterpart of reverse-engineer) |
| `change-impact-diff` | 概念先行の change-impact レポート (行 diff ではない) | Concept-first change-impact report (Purpose / Touch-points / Do-not-miss, not a line diff) |
| `plan-from-diff` | impact から順序付き実装計画 (phase / PR / rollback) | Turn an impact report into a sequenced plan (phases, PR bundles, rollback points) |

## 日本語 🇯🇵

| Skill | リンク |
| --- | --- |
| umlay | [`ja/umlay/SKILL.md`](./ja/umlay/SKILL.md) |
| write-uml | [`ja/write-uml/SKILL.md`](./ja/write-uml/SKILL.md) |
| review-uml | [`ja/review-uml/SKILL.md`](./ja/review-uml/SKILL.md) |
| evolve-schema | [`ja/evolve-schema/SKILL.md`](./ja/evolve-schema/SKILL.md) |
| codegen-mapping | [`ja/codegen-mapping/SKILL.md`](./ja/codegen-mapping/SKILL.md) |
| reverse-engineer | [`ja/reverse-engineer/SKILL.md`](./ja/reverse-engineer/SKILL.md) |
| transcribe-design | [`ja/transcribe-design/SKILL.md`](./ja/transcribe-design/SKILL.md) |
| change-impact-diff | [`ja/change-impact-diff/SKILL.md`](./ja/change-impact-diff/SKILL.md) |
| plan-from-diff | [`ja/plan-from-diff/SKILL.md`](./ja/plan-from-diff/SKILL.md) |

## English 🇬🇧

| Skill | Link |
| --- | --- |
| umlay | [`en/umlay/SKILL.md`](./en/umlay/SKILL.md) |
| write-uml | [`en/write-uml/SKILL.md`](./en/write-uml/SKILL.md) |
| review-uml | [`en/review-uml/SKILL.md`](./en/review-uml/SKILL.md) |
| evolve-schema | [`en/evolve-schema/SKILL.md`](./en/evolve-schema/SKILL.md) |
| codegen-mapping | [`en/codegen-mapping/SKILL.md`](./en/codegen-mapping/SKILL.md) |
| reverse-engineer | [`en/reverse-engineer/SKILL.md`](./en/reverse-engineer/SKILL.md) |
| transcribe-design | [`en/transcribe-design/SKILL.md`](./en/transcribe-design/SKILL.md) |
| change-impact-diff | [`en/change-impact-diff/SKILL.md`](./en/change-impact-diff/SKILL.md) |
| plan-from-diff | [`en/plan-from-diff/SKILL.md`](./en/plan-from-diff/SKILL.md) |

## Claude Code への導入 / Install into Claude Code

Claude Code の skill は `~/.claude/skills/<name>/SKILL.md` (全プロジェクト共通) または `<project>/.claude/skills/<name>/SKILL.md` (プロジェクト固有) に配置します。**subfolder + SKILL.md** が現在の標準フォーマット (`description` フィールドにより Claude が文脈を見て自動起動、sub-files も同梱可)。

### 方法 A: 全プロジェクト共通で使う (推奨)

```sh
# 1. リポジトリを任意の場所にクローン
git clone https://github.com/umlay/umlay.git ~/src/umlay

# 2. skill フォルダごとシンボリックリンク
mkdir -p ~/.claude/skills
ln -s ~/src/umlay/skills/ja/umlay            ~/.claude/skills/umlay
ln -s ~/src/umlay/skills/ja/write-uml        ~/.claude/skills/write-uml
ln -s ~/src/umlay/skills/ja/review-uml       ~/.claude/skills/review-uml
ln -s ~/src/umlay/skills/ja/evolve-schema    ~/.claude/skills/evolve-schema
ln -s ~/src/umlay/skills/ja/codegen-mapping  ~/.claude/skills/codegen-mapping
ln -s ~/src/umlay/skills/ja/reverse-engineer ~/.claude/skills/reverse-engineer
ln -s ~/src/umlay/skills/ja/transcribe-design ~/.claude/skills/transcribe-design
ln -s ~/src/umlay/skills/ja/change-impact-diff ~/.claude/skills/change-impact-diff
ln -s ~/src/umlay/skills/ja/plan-from-diff     ~/.claude/skills/plan-from-diff

# 英語版を使いたい場合は `ja/` を `en/` に読み替え
```

シンボリックリンクなので `git pull` で最新版が自動反映。

### 方法 B: 特定プロジェクトだけで使う

```sh
cd <your-project>
mkdir -p .claude/skills
# サブフォルダごと取得 (curl 単体では subfolder 取れないので git sparse-checkout か以下で代替)
git clone --depth=1 --filter=blob:none --sparse \
  https://github.com/umlay/umlay.git /tmp/umlay-skills
cd /tmp/umlay-skills
git sparse-checkout set skills/ja
cp -r skills/ja/write-uml <your-project>/.claude/skills/
# 必要な skill 分だけ繰り返す
```

### 方法 C: サブモジュールとして追跡

```sh
cd <your-project>
git submodule add https://github.com/umlay/umlay.git vendor/umlay
mkdir -p .claude/skills
ln -s ../../vendor/umlay/skills/ja/write-uml .claude/skills/write-uml
# 他 skill も同様
```

### 使い方 / Usage

インストール後、Claude Code のチャットで `/<skill-name>` として明示呼び出しが可能:

```
/umlay 「Umlay 試したい。何から始めれば?」     # 迷ったとき
/write-uml 「ECサイトで商品・カート・注文を扱う最小 DSL を書いて」
/review-uml 現在開いている .umlay ファイルをレビューして
/evolve-schema User モデルに role: UserRole を追加したい
/codegen-mapping この IR を Prisma schema に変換して
/reverse-engineer 既存の schema.prisma を取り込んで .umlay にして
/transcribe-design 既存の設計書 (Markdown) を .umlay に転記して
/change-impact-diff 前回保存と現在の IR を比較して影響を教えて
/plan-from-diff この impact レポートから PR に分けた計画を出して
```

また、各 skill の frontmatter `description` を見て Claude が文脈から**自動起動**します (例: 「この DSL をレビューして」だけで `review-uml` が選ばれる)。自動起動を止めたい場合は skill の frontmatter に `disable-model-invocation: true` を追加。

各 skill は `@umlay/spec` の grammar.md / ir.schema.json を正本として参照するため、**CLI ツールのインストールは不要**です。`.umlay` のパーサ / lint / レンダリングを併用したい場合のみ、以下を追加インストールしてください:

```sh
pnpm add -D @umlay/core @umlay/lint @umlay/renderer-er
# または VS Code 拡張 (LSP 内蔵):
# Marketplace で "Umlay" を検索
```

## 運用マニュアル / Operating manual

skill を実運用するための実践ガイド。**「どの skill を呼ぶ?」の決定木**、**入出力の橋渡しルール**、**よくある質問**の 3 部構成。

### 1. 起点 — どの skill から始めるか

迷ったら **`/umlay`** に聞く (2 質問で振り分け)。よくある起点パターン:

| 起点となる "資産" | 最初に呼ぶ skill | 補足 |
| --- | --- | --- |
| 自然言語の要件 (口頭 / メモ) | `/write-uml` | ゼロから `.umlay` を起こす |
| **既存の設計書** (Markdown / Word / PDF / Confluence) | **`/transcribe-design`** | NL→`.umlay` 転記、`@@confidence` でフラグ |
| 既存コード (Prisma / SQL DDL / TypeScript) | `/reverse-engineer` | 構造のみ決定論的取り込み |
| 既存 `.umlay` をレビュー | `/review-uml` | 4 層監査 (S / L / R / W+C) |
| 既存 `.umlay` を改修 | `/evolve-schema` | 後方互換差分 |
| 改修の影響範囲 | `/change-impact-diff` | Purpose / Touch / Miss + Risk |
| 改修の実装計画 | `/plan-from-diff` | phase / PR 分割 / rollback |
| 確定 IR をコードへ | `/codegen-mapping` | Prisma / SQL / TS |

### 2. skill 間の橋渡しルール

**前段の出力 → 後段の入力**として常に IR (`.umlay` か `IR JSON`) を渡す。skill 間は**ファイルベース**で繋ぐと再現性が高まる。

```
口頭/メモ ──► /write-uml ──► first.umlay
設計書    ──► /transcribe-design ──► first.umlay (+ TODO ヘッダ)
コード    ──► /reverse-engineer ──► first.umlay (+ TODO ヘッダ)
                                     │
                                     ▼
                                /review-uml ──► first.umlay (intent / @inv 補完)
                                     │
                                     ▼
                                /evolve-schema "<変更内容>" ──► next.umlay
                                     │
                                     ▼
                                /change-impact-diff first.umlay next.umlay ──► impact.yaml
                                     │
                                     ▼
                                /plan-from-diff impact.yaml ──► plan.yaml
                                     │
                                     ▼
                                /codegen-mapping next.umlay --target prisma|sql|ts
```

各 skill は**独立に呼べる**ので、途中段階だけやり直しも可能。

### 3. ステータス遷移 (`@@status`) の運用

新規 model は `@@status("in-review")` で始まり、人間レビュー後に `"active"` に昇格させる:

| 状態 | 意味 | 出口 |
| --- | --- | --- |
| `in-review` | AI が起こした / 改修中 — 人間未確認 | レビュー後 → `active` |
| `active` | 安定運用中 | 改修時 → `in-review` |
| `deprecated` | 削除予告 | 削除完了 → 行ごと削除 |
| `blocked` | ADR 待ち / 議論中 | ADR 確定 → `active` or `deprecated` |

**`@@status` は merge 前 CI gate の核**。`/review-uml` 完了 → 人間が `"active"` に書き換え → PR を merge、というフロー。

### 4. `@@confidence` の閾値ガイド (transcribe-design / reverse-engineer 出力時)

| 値 | 意味 | 推奨アクション |
| --- | --- | --- |
| 0.9–1.0 | ほぼ確定 | レビュー軽め |
| 0.7–0.9 | 中信頼 | 個別確認推奨 |
| 0.5–0.7 | 推測色強 | 1 つずつ確認 |
| 0.0–0.5 | ほぼ推測 | **必ず人間が判断** |

`/review-uml` は `@@confidence < 0.7` を info で持ち上げます (将来 lint 化検討)。

### 5. ファイル分割の原則

1 ファイル = 1 namespace 推奨。namespace ごとに別ファイルにし、cross-namespace 参照は `@ref(other_ns.Model.id)` で記述。

```
docs/design/
  index.md                  ← 全体像 (人間記述)
  auth.umlay                ← namespace auth
  billing.umlay             ← namespace billing
  shared.umlay              ← 共通の type / enum
```

`/transcribe-design` は**単一ファイル**を出力します。設計書が複数 namespace を扱う場合は、章ごとに分けて skill を複数回呼ぶか、出力後に手分割。

### 6. よくある質問

**Q. AI が `.umlay` を書くと毎回同じミスをする**

A. spec 1.6.4 時点で以下は parser が**寛容に受理**:
- `id: UUID!` (Prisma 風 colon)
- `'foo'` (single quote)
- `@@min-spec-version("1.6.0")` (kebab-case directive)
- `@@identity(a, b, ` `` `date` `` `)` (backtick escape inside directive)

それでも parse error が出る場合、エラー文末尾の **「Hint:」** を読めば修正方針が分かります。

**Q. `/review-uml` の指摘が大量に出すぎる**

A. `umlay check --stats --json` で頻発ルールから対処してください。`@@mode(strict)` で運用中なら一旦 `draft` に落として優先度を見直すのも手。

**Q. `/transcribe-design` と `/reverse-engineer` どちらを使えばいい?**

| 入力 | skill |
| --- | --- |
| schema.prisma / *.sql / *.ts | `/reverse-engineer` |
| 仕様書 .md / .docx (text) / .pdf (text) | `/transcribe-design` |
| 仕様書の図 (画像のみ) | OCR してから `/transcribe-design` |
| 両方ある | `/reverse-engineer` 先行 → 結果と仕様書を見比べて `/transcribe-design` で intent / @inv を補完 |

**Q. skill が auto-invoke されない**

A. AI が文脈から判断できる材料が薄い可能性。明示呼び `/skill-name <args>` で起動してください。または `/umlay` (相談窓口) に聞く。

---

## ユースケース別フロー / Workflow recipes

以下の 2 シナリオは、要求 → 要件 → 基本 → 詳細の 4 段階を Umlay の `.umlay` に積み上げ、最後にコード生成へ降ろす流れを示します。各段階で生成された `.umlay` は **Git でレビュー可能な単一成果物**になり、設計フェーズが進むほど仕様が**追加情報で厚くなる** (削れない) のが原則です。

### 1. 新規システム構築 (greenfield)

```
要求定義 → 要件定義 → 基本設計 → 詳細設計 → 実装
   │          │          │          │         │
   ▼          ▼          ▼          ▼         ▼
write-uml  write-uml   review-uml  evolve-    codegen-
(初版骨格) (語彙固め)   (品質監査)   schema   mapping
                                  (差分追加)
```

| 段階 | 主 skill | ねらい | 生成される .umlay の中身 |
| --- | --- | --- | --- |
| **要求定義** | `write-uml` | 自然言語要求 → 候補モデル / actor / 主要 view を最低限の DSL に落とす。stereotype は `@entity` の安全側 + 不確実点に `@@doc` | namespace / 主要 model + `rationale.intent` |
| **要件定義** | `write-uml` (続き) | 関係 (`@ref`) / 識別子 / 列挙の語彙を確定。`@@sample(from:)` で代表データの形を固定 | 全 model + 列 + enum + sample 参照 + 主要 sequence |
| **基本設計** | `review-uml` | spec 違反 / lint / 設計リスクを 4 層で監査 (S / L / R / W+C)。aggregate_root 候補確定、bounded context の境界決定 | stereotype 確定、`rationale.intent` 充実、view (audience 別) 追加 |
| **詳細設計** | `evolve-schema` | `@@inv` / `@@pre` / `@@post` 追加、PK / FK / unique 細部、複合 view、protocol 設計。後方互換を意識して差分積み上げ | 業務不変条件 + 完成 view 集合 + protocol (impl 境界) |
| **実装** | `codegen-mapping` | 確定 IR → Prisma / SQL DDL / TypeScript 型へ決定論変換。テストデータは `@@sample` から | (Umlay の外: `schema.prisma` / `*.sql` / `types.ts`) |

> ✅ 各段階の終わりに `review-uml` を回す習慣を付ける。後の段階で発覚した設計欠陥を前段に**差し戻す**コストが、レビュワー 1 人 + 1 時間で済む。

### 2. 既存システム改修 (brownfield)

既存 DB / コードがある場合、まず**現行**を `.umlay` に取り込んで「現行の要求 / 要件 / 基本 / 詳細設計を Umlay 上で復元」してから、改修対象だけに**詳細設計の新版**を起こします。

```
[現行] schema.prisma / DDL / TS
            │
            ▼  reverse-engineer (構造のみ取り込み + TODO ヘッダ)
[現行] umlay (一次)
            │
            ▼  review-uml (現行の lint / risk / stereotype 確定)
[現行] umlay (基本設計レベル — 現行の意図を補完)
            │
            ▼  human / write-uml (rationale.intent / @@inv 補完)
[現行] umlay (詳細設計レベル — 現行の "あるべき" 完成形)
            │
            ▼  evolve-schema (改修部分だけ差分 DSL を当てる)
[新版] umlay (改修後)
            │
            ▼  change-impact-diff  ← 現行 vs 新版 の影響を Purpose / Touch / Miss + リスクで可視化
            ▼  plan-from-diff      ← 改修部分に絞った phase / PR / rollback 付き詳細設計 = 実装計画
            ▼  codegen-mapping     ← 改修分の Prisma / SQL / TS 差分生成
```

| 段階 | 主 skill | ねらい | 出力 |
| --- | --- | --- | --- |
| **現行取り込み** | `reverse-engineer` | 既存 `schema.prisma` / DDL / TS を構造だけ `.umlay` に変換。stereotype / intent は推測せず `@@doc` でフラグ化 | `current.umlay` (一次) + TODO ヘッダ |
| **現行: 要求 / 要件再構築** | `review-uml` + 人間 | 一次取り込みに対して品質監査を回し、stereotype を確定。`rationale.intent` と `@@md` を追記して**現行の "なぜ"** を文書化 | `current.umlay` (要件定義レベル) |
| **現行: 基本 / 詳細設計復元** | `write-uml` (補完) + `review-uml` | view (audience 別) / `@@inv` / `@@pre` / `@@post` / 詳細 sequence を補完。Umlay 上に**現行のあるべき完成形**を置く | `current.umlay` (詳細設計レベル) |
| **改修部分の差分** | `evolve-schema` | 後方互換を守りつつ改修対象 model / attribute / view を変更。広げ過ぎず、改修スコープに**絞る** | `next.umlay` |
| **影響分析** | `change-impact-diff` | `current.umlay` ↔ `next.umlay` の Risk / Impact / Purpose-Touch-Miss を出す。改修が現行のどこに波及するかを名前で列挙 | impact レポート (YAML / Markdown) |
| **改修部分の詳細設計 = 実行計画** | `plan-from-diff` | impact から phase (schema / backfill / dual-write / cutover / cleanup / verify) と PR 分割と rollback を持つ計画を生成。**改修スコープ外には触れない** | 計画 YAML / `@gantt_chart` view |
| **実装** | `codegen-mapping` | 計画の各 phase が指す DSL から Prisma / SQL / TS の**差分**を生成 | migration ファイル + 型差分 |

> ✅ 「現行の Umlay 化」は重く感じるが、**一度やれば以後の全改修で再利用**できる資産。`change-impact-diff` と `plan-from-diff` は `current.umlay` がない限り精度の高い影響分析を返せない。
>
> ✅ 改修対象が小さいときも `current.umlay` の**全体は捨てない**。`evolve-schema` は差分を当てるので、現行の文脈 (intent / 関連 model / 既存 view) があるほど stereotype 競合や重複 trait を検知できる。

### 段階の対応関係 — 一覧

| 設計フェーズ | greenfield (新規) | brownfield (既存) |
| --- | --- | --- |
| 要求定義 | `write-uml` (初版骨格) | `reverse-engineer` + `review-uml` で現行の "なぜ" を再構築 |
| 要件定義 | `write-uml` (語彙固め) | 上記の続きで `rationale.intent` / `@@md` 補完 |
| 基本設計 | `review-uml` | `review-uml` (現行 + 改修候補の整合) |
| 詳細設計 | `evolve-schema` で差分積み上げ | `evolve-schema` → `change-impact-diff` → `plan-from-diff` (**改修スコープに絞る**) |
| 実装 | `codegen-mapping` | `codegen-mapping` (差分のみ) |

### English version

The two recipes below map the four design phases — *requirements gathering → requirements definition → basic design → detailed design* — onto the seven skills, then descend into code generation. Every phase produces a `.umlay` file that is **a single Git-reviewable artefact**; later phases **add information** rather than replace it.

#### 1. Greenfield — building a new system

```
Requirements        Requirements      Basic            Detailed         Implementation
gathering    →      definition   →    design     →     design      →
   │                  │                 │                │                │
   ▼                  ▼                 ▼                ▼                ▼
write-uml          write-uml         review-uml       evolve-          codegen-
(skeleton)         (vocabulary)      (quality          schema           mapping
                                      audit)          (incremental
                                                       diffs)
```

| Phase | Primary skill | Aim | What the `.umlay` contains |
| --- | --- | --- | --- |
| **Requirements gathering** | `write-uml` | Convert natural-language requirements into a minimum DSL — candidate models / actors / primary views. Stereotypes default to `@entity`; uncertainty is captured as `@@doc` | namespaces / primary models + `rationale.intent` |
| **Requirements definition** | `write-uml` (cont.) | Lock in relationships (`@ref`), identifiers, and enums. Pin representative data shape via `@@sample(from:)` | all models + attributes + enums + sample bindings + key sequences |
| **Basic design** | `review-uml` | Audit across spec / lint / risk / compatibility (S / L / R / W+C). Confirm aggregate-root candidates and bounded-context boundaries | finalised stereotypes, fleshed-out `rationale.intent`, audience-specific views |
| **Detailed design** | `evolve-schema` | Add `@@inv` / `@@pre` / `@@post`, refine PK / FK / unique, compose composite views, design protocols. Incremental, backward-compatible | invariants + complete view set + protocols (impl boundary) |
| **Implementation** | `codegen-mapping` | Deterministic IR → Prisma / SQL DDL / TypeScript types. Test data flows from `@@sample` | (outside Umlay: `schema.prisma`, `*.sql`, `types.ts`) |

> ✅ Run `review-uml` at the end of every phase. Catching a design flaw one phase later costs one reviewer-hour; catching it after implementation costs a release.

#### 2. Brownfield — modifying an existing system

When a database / code base already exists, **import the current state into `.umlay` first** ("reconstruct the current system's requirements / design") before issuing a new detailed design **scoped only to the part being changed**.

```
[Current] schema.prisma / DDL / TS
              │
              ▼  reverse-engineer (structure-only import + TODO header)
[Current] umlay (first pass)
              │
              ▼  review-uml (lint / risk / lock in stereotypes)
[Current] umlay (basic-design level — current intent restored)
              │
              ▼  human / write-uml (fill rationale.intent / @@inv)
[Current] umlay (detailed-design level — the "as it should be" of today)
              │
              ▼  evolve-schema (apply diff DSL to ONLY the part being modified)
[Next]    umlay (after change)
              │
              ▼  change-impact-diff   ← current vs next: Purpose / Touch / Miss + risk
              ▼  plan-from-diff       ← detailed plan SCOPED to the change
              ▼  codegen-mapping      ← only the delta of Prisma / SQL / TS
```

| Phase | Primary skill | Aim | Output |
| --- | --- | --- | --- |
| **Import current state** | `reverse-engineer` | Convert existing `schema.prisma` / DDL / TS into `.umlay` (structure only). Stereotype / intent are not guessed — they are flagged in `@@doc` | `current.umlay` (first pass) + TODO header |
| **Reconstruct current requirements** | `review-uml` + human | Run quality audit on the first pass and lock in stereotypes. Add `rationale.intent` and `@@md` to **document the existing "why"** | `current.umlay` (requirements-definition level) |
| **Restore current basic / detailed design** | `write-uml` (fill-in) + `review-uml` | Add audience-specific views, `@@inv` / `@@pre` / `@@post`, detailed sequences. Establish **the "as it should be" of today** in Umlay | `current.umlay` (detailed-design level) |
| **Diff for the modification** | `evolve-schema` | Change only the in-scope models / attributes / views, preserving backward compatibility. **Stay inside the modification scope** — do not widen | `next.umlay` |
| **Impact analysis** | `change-impact-diff` | Emit Risk / Impact / Purpose-Touch-Miss for `current.umlay` ↔ `next.umlay`. Enumerate downstream models / views / participants by name | impact report (YAML / Markdown) |
| **Detailed design = execution plan for the modification** | `plan-from-diff` | Turn impact into a plan with phases (schema / backfill / dual-write / cutover / cleanup / verify), PR splits, rollback annotations. **Touches nothing outside the modification scope** | plan YAML / `@gantt_chart` view |
| **Implementation** | `codegen-mapping` | Generate the **delta** of Prisma / SQL / TS for the DSL that the plan's phases reference | migration files + type diff |

> ✅ "Umlay-ifying the current system" feels heavy up front, but **once done it amortises across every future change**. `change-impact-diff` and `plan-from-diff` cannot return high-precision impact without a `current.umlay`.
>
> ✅ Even when the modification is small, **do not throw away the rest of `current.umlay`**. `evolve-schema` applies a diff to the whole model, so the more context (intent / related models / existing views) is present, the more reliably stereotype conflicts and duplicate traits are caught.

#### Phase mapping — at a glance

| Design phase | Greenfield (new) | Brownfield (existing) |
| --- | --- | --- |
| Requirements gathering | `write-uml` (skeleton) | `reverse-engineer` + `review-uml` to reconstruct the current "why" |
| Requirements definition | `write-uml` (vocabulary) | continue above; fill `rationale.intent` / `@@md` |
| Basic design | `review-uml` | `review-uml` (current state + reconcile with proposed change) |
| Detailed design | `evolve-schema` (incremental) | `evolve-schema` → `change-impact-diff` → `plan-from-diff` (**scoped to the modification**) |
| Implementation | `codegen-mapping` | `codegen-mapping` (delta only) |

## フォーマット / Format

各 skill ファイルはフロントマター (YAML) と本文 (Markdown) で構成されます。

```markdown
---
name: <skill-id>
version: <semver>
spec: "@umlay/spec >= <min-version> (DSL X.Y / IR X.Y)"
audience: [ai-agent, developer, ...]
summary: <one-line summary>
references:
  grammar: <path>
  schema: <path>
  keywords: <path>
---

# <skill-id>

## Goal
## Preconditions
## Inputs / Outputs
## Procedure (Step-by-step)
## Constraints (from spec)
## Checklist
## Example
## References
```

### Frontmatter フィールド / fields

| Field | Required | 意味 / Meaning |
| --- | --- | --- |
| `name` | ✅ | Skill 識別子 (ファイル名と一致) |
| `version` | ✅ | skill 自体の semver |
| `spec` | ✅ | 対応する `@umlay/spec` のバージョン範囲 |
| `audience` | ✅ | `ai-agent` / `developer` / `reviewer` / `architect` / `codegen-author` / `tool-author` |
| `summary` | ✅ | 1 行要約 |
| `references` | ✅ | 正本ファイルへのパス (grammar / schema / keywords の最低 3 点) |

## 正本との関係 / Relation to the spec

Skill は次の 3 ファイルを**唯一の正本**とし、それに従わない記述を含みません。

1. [`packages/spec/src/grammar.md`](../packages/spec/src/grammar.md) — DSL 文法
2. [`packages/spec/src/ir.schema.json`](../packages/spec/src/ir.schema.json) — 正規IR JSON Schema
3. [`packages/spec/src/index.ts`](../packages/spec/src/index.ts) — 予約語、バージョン定数

正本が変わる場合は、全 skill の `spec` フィールドを一斉に更新し、差分を記録します。

Skills reference exactly these three sources as canonical:

1. [`packages/spec/src/grammar.md`](../packages/spec/src/grammar.md) — DSL grammar
2. [`packages/spec/src/ir.schema.json`](../packages/spec/src/ir.schema.json) — normalized IR JSON Schema
3. [`packages/spec/src/index.ts`](../packages/spec/src/index.ts) — reserved keywords and version constants

When the spec changes, bump every skill's `spec` field in lockstep and record the delta.

## Skill 追加の手順 / Adding a new skill

1. `skills/ja/<slug>.md` と `skills/en/<slug>.md` を作成
2. フロントマターに `references` (grammar / schema / keywords) を埋める
3. 本文中の DSL / IR 例は `grammar.md` と `ir.schema.json` で検証できる形にする
4. 本 README の表に行を追加
5. `CONTRIBUTING.md` の手順に沿って PR を提出

## ライセンス / License

`skills/` 配下の各ファイルは、特記がない限り **CC-BY 4.0** です。帰属表示は `Umlay contributors (https://github.com/umlay/umlay)` で統一します。

Unless noted otherwise, files under `skills/` are **CC-BY 4.0**. Attribute as `Umlay contributors (https://github.com/umlay/umlay)`.
