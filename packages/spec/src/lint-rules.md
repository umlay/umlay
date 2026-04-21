# Umlay Lint Rule Catalog

**spec version**: 1.0.0 (1.0 RC — freeze 時点)

`skills/*/review-uml.md` から Lint ルールを一元化した正本カタログ。全実装は本カタログに記載されたルール ID / 重大度 / mandatory 区分を尊重する。

## カテゴリ prefix

| Prefix | 用途 | 既定 severity | 番号範囲 |
| --- | --- | --- | --- |
| **S** | Spec violation (文法違反、必ず error) | error (blocker) | S01〜S99 |
| **L** | Lint (慣習違反、mode 依存) | mode-dependent | L001〜L199 |
| **R** | Risk (設計アンチパターン、ヒューリスティック) | warn/info | R001〜R099 |
| **W** | Warning (deprecated/experimental 使用等) | info | W001〜W099 |
| **C** | Compatibility (spec バージョン差分) | warn | C001〜C099 |

## 実装ステータス凡例

| マーク | 意味 |
| --- | --- |
| ✅ | 参照実装 (`@umlay/lint`) で実装済 |
| ⏳ | spec 1.0 RC までに実装予定 (現状は catalog のみ) |
| 🟡 | 実装は parser / IR validator 側で別途担保 (`@umlay/core`) |

参照実装のルール定義は [`packages/lint/src/rules/index.ts`](https://github.com/keydrop/umlay/blob/main/packages/lint/src/rules/index.ts) (別リポジトリ)。

---

## S — Spec violations (必須、mandatory)

S ルールは parser / IR validator 側で検知される想定 (blocker)。lint package は S ルールを評価しない。

| ID | 内容 | Applies to | RFC | 状態 |
| --- | --- | --- | --- | --- |
| S01 | `namespace` がファイル先頭にない | file | — | 🟡 parser |
| S02 | view 内にモデル本体が書かれている | view | — | 🟡 parser |
| S03 | 未定義 stereotype (entity/aggregate_root/value_object/service/interface 以外) | model | — | 🟡 parser (Zod) |
| S04 | 未定義 view kind (10 種の enum 外) | view | 0001 | 🟡 parser (Zod) |
| S05 | `visibility` が 4 値以外 (public/private/protected/package) | attribute | — | 🟡 parser (Zod) |
| S06 | `@ref` `onDelete`/`onUpdate` が 4 値外 (CASCADE/RESTRICT/SET_NULL/NO_ACTION) | attribute | — | 🟡 parser (Zod) |
| S07 | identifier が RESERVED_KEYWORDS と衝突 | any | — | 🟡 parser |
| S08 | IR 必須フィールド欠落 (version/kind/namespaces/views) | file | — | 🟡 parser (Zod) |
| S09 | model に `_id`/`name`/`attributes` が欠落 | model | — | 🟡 parser (Zod) |
| S10 | attribute に `_id`/`name`/`type` が欠落 | attribute | — | 🟡 parser (Zod) |
| S11 | `@@dependencies(...)` の `on` が解決不能 | model | 0005 | ✅ |
| S12 | `@@dependencies(...)` の `kind` が 4 値外 (FS/SS/FF/SF) | model | 0005 | ✅ |
| S13 | 型 bound 違反 (`@@implements(Repository<T>)` で T が bound 未準拠) | model | 0015 / 0030 | ✅ |
| S14 | variance 使用位置違反 (`<out T>` を in 位置に使う等) | protocol | 0019 / 0030 | ✅ |
| S15 | orphan rule 違反 (`impl P for M` でどちらも外部 namespace) | impl | 0016 | ✅ |
| S16 | Diamond MRO 曖昧性 (C3 で解決不能、明示 `@@override(from:)` 必須) | protocol | 0011 | ✅ (pragmatic — 2+ 親で同名 method を子で再定義していないケースを検出) |
| S17 | Non-well-founded union (再帰のみで終端 variant なし) | union | 0018 / 0022 | ✅ |

## L — Lint (mode-dependent)

| ID | ルール | Severity (Draft / Strict) | Applies to | RFC | 状態 |
| --- | --- | --- | --- | --- | --- |
| L001 | 全 attribute に `visibility` | info / error | attribute | — | ✅ (stub — parser が既に `public` を default で埋めるため no-op) |
| L002 | 全 relation に `multiplicity` | warn / error | relation | — | ✅ |
| L003 | `@ref(X.y)` が解決する | error / error | attribute | — | ✅ |
| L004 | 同一 namespace 内の model 名重複なし、attribute 名重複なし | error / error | any | — | ✅ |
| L005 | enum attribute の `@default` が values に含まれる | error / error | attribute | — | ✅ |
| L006 | 非 aggregate_root が他の aggregate を直接 composition | warn / warn | relation | — | ✅ |
| L007 | 循環 `inheritance` なし | error / error | model | — | ✅ |
| L008 | 全 model に `@intent` | — / warn | model | — | ✅ |
| L009 | 多値 relation に `ordered`/`unique` 指定 | info / info | relation | — | ✅ |
| L010 | `Manager`/`Helper`/`Data` 等の曖昧単独名なし | warn / warn | model | — | ✅ |
| L011 | `string`/`int` 型に長さ/min/max 等の制約 | info / info | attribute | — | ✅ |
| L012 | Sequence participant が model に存在 | error / error | view | — | ✅ |
| L013 | Method `@pre` が参照する state 変数が実在 | warn / warn | fn | — | ✅ |
| L014 | `@default` の型が attribute 型と整合 | warn / error | attribute | 0029 | ✅ |
| L015 | `@ref(onDelete: CASCADE)` の循環検出 | warn / error | attribute | 0029 | ✅ |
| L016 | protocol `extends` の深さ 3 超で警告 | info / warn | protocol | 0029 | ✅ (heuristic: method 数 10+ を警告) |

### L 実装拡張 (参照実装独自)

spec 1.0 RC までに catalog に昇格予定の参照実装ルール:

| ID | ルール | Severity (Draft / Beta / Strict) | Applies to | 状態 |
| --- | --- | --- | --- | --- |
| L017 | namespace 未宣言 | warn / warn / warn | file | ✅ |
| L020 | model に `@@doc` / `@intent` が無い (rationale 不足) | — / warn / error | model | ✅ (L008 と機能重複、1.0 RC で統合) |
| L021 | `@aggregate_root` に `@inv` が無い | — / info / error | model | ✅ (R04 相当) |
| L033 | モデルが画像添付に依存している疑い (ヒューリスティック) | — / info / warn | model | ✅ |

## R — Risk (設計ヒューリスティック、常に warn/info)

| ID | パターン | Severity | RFC | 状態 |
| --- | --- | --- | --- | --- |
| R01 | 1 aggregate_root に 10+ entity がぶら下がる | info | — | ✅ |
| R02 | cross-namespace composition | warn | — | ✅ |
| R03 | 属性数 20 超の model | info | — | ✅ |
| R04 | aggregate_root without `@inv`/`@pre`/`@post` | info | — | ✅ (L021 で実装) |
| R05 | 全 attribute が public | info | — | ✅ |
| R06 | 自己参照 with `onDelete: CASCADE` | warn | — | ✅ |
| R07 | `@@attachments` に非画像拡張子 | info | — | ✅ |
| R08 | 巨大 enum (30+ values) | info | — | ✅ |
| R09 | 循環 `@@dependencies` (A → B → A) | error | 0005 | ✅ |
| R10 | Gantt/WBS model で `plannedStart`/`plannedEnd` 欠落 | error | — | ✅ |
| R11 | `@experimental` 要素が runtime critical path 上 | warn | 0029 | ✅ (static: CPM view / sequence critical 領域を検査) |
| R12 | `union` の variant が 10 超 (ADT 爆発) | info | 0029 | ✅ |

## W — Warning (実行時通知、常に info)

| ID | 内容 | RFC | 状態 |
| --- | --- | --- | --- |
| W001 | `@deprecated` 要素の使用 | 0023 | ✅ |
| W002 | `@experimental` 要素の使用 | 0027 | ✅ |

## C — Compatibility (バージョン差分)

| ID | 内容 | RFC | 状態 |
| --- | --- | --- | --- |
| C001 | IR version と現行 spec の不一致 | — | ✅ |
| C002 | 使用機能の `min-spec-version` が現行より新しい | 0029 | ✅ |

## 実装カバレッジサマリ (参照実装 `@umlay/lint` @ spec 1.0.0)

| カテゴリ | 実装済 | 実装予定 | 実装率 |
| --- | --- | --- | --- |
| S (parser / Zod + 追加 lint 側) | 17 (🟡 10 / ✅ 7) | 0 | **17/17 = 100%** |
| L 本流 (L001-L016) | 16 (L001-L016 全て) | 0 | **16/16 = 100%** |
| L 拡張 (L017+) | 4 (L017/L020/L021/L033) | — | 実装独自 |
| R | 12 (R01-R12) | 0 | **12/12 = 100%** |
| W | 2 (W001/W002) | 0 | 100% |
| C | 2 (C001/C002) | 0 | 100% |
| **全体** | **53** | **0** | **53/53 = 100%** |

> 1.0 catalog の全ルールが参照実装に載った。R11 は runtime trace 無しの **static 近似** (CPM view / sequence critical 領域を検査)。将来 runtime trace が導入されたら同 rule をアップグレード。

## Mandatory / Optional 区分

実装 (パーサ / lint / IR validator) は以下を参照:

| レベル | 対応必須ルール | 備考 |
| --- | --- | --- |
| **L1 parse** | S01〜S17 | parse error 相当、全て blocker |
| **L2 IR** | S01〜S17 + L003 / L005 / L007 | IR 生成時に検証 |
| **L3 render** | L1 + L2 + view 関連 (L012) | renderer 自身の責務範囲 |
| **Lint service (optional)** | L001〜L016 + R01〜R12 + W001〜W002 + C001〜C002 | Lint 専用パッケージが担当 |

## ルールの書き方 (新規追加時)

1. 番号割当: 該当 prefix の未使用最小番号を選ぶ
2. RFC 参照: 新ルールが RFC 由来なら RFC 番号を必ず記載
3. severity 既定: 想定重大度を記入 (mode-dependent なら `info/error` 等)
4. Example: 失敗例と修正例を 1 組以上添える
5. PR で本カタログに追記

## サプレッション

個別の false positive は `// umlay-lint-disable L001 next-line` 等のコメントで抑止可能 (将来正式化、RFC 0029 §未解決事項)。

## 参照

- [`grammar.md`](./grammar.md) — DSL 文法
- [`ir.schema.json`](./ir.schema.json) — IR schema
- [`rfcs/0029-lint-rule-catalog.md`](./rfcs/0029-lint-rule-catalog.md) — 本カタログ導入 RFC
- [`skills/{ja,en}/review-uml.md`](../../../skills/ja/review-uml.md) — レビュー手順 (本カタログを参照)
