---
rfc: 0024
title: Gantt の Critical Path 計算 (CPM)
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.7.0
change-class: A
parent-rfc: 0004
---

# RFC 0024 — Gantt の Critical Path 計算

## 要約

`@@sample` + `@@dependencies` + `TaskDependency` から構成される Gantt グラフに対し、**クリティカルパス法 (CPM)** の計算結果を IR に含める仕様を追加する。

## 背景 / モチベーション

現状:
- Gantt の `plannedStart/End` / `progress` / `@@dependencies` で構造は表現できる
- しかし「どのタスク列が最長パスか」「遅延許容量 (slack) はどれくらいか」は実装側で計算する必要がある

CPM は PM ツールの標準機能。spec が IR レベルで標準化しておけば、複数実装 (renderer / dashboard / alert) が一貫した結果を得られる。

## 提案内容

### 入力

- Task 様 model の `@@sample` 行 (`plannedStart` / `plannedEnd` が必須)
- `@@dependencies(...)` または Task 用 `TaskDependency` model の `@@sample` 行

### 計算アルゴリズム

```
1. タスクグラフ G = (V: task instances, E: dependencies) を構築
   - 各 task の duration = plannedEnd - plannedStart
   - 各 dependency は kind (FS/SS/FF/SF) + lag に応じた制約を付与
2. Forward pass: ES (earliest start) / EF (earliest finish) を計算
3. Backward pass: LS (latest start) / LF (latest finish) を計算
4. Total float: TF_i = LS_i - ES_i
5. Critical path: TF = 0 の task を繋いだ最長経路
```

### 構文への追加 (optional view hint)

Gantt view で CPM の計算結果を強調表示する指示を optional に:

```prisma
view pm-gantt @gantt_chart {
  include: pm.Task, pm.TaskDependency
  layout: direction(LR)
  criticalPath: highlight        // or compute | ignore (既定: ignore)
}
```

### IR 出力

CPM の計算結果は IR の Task instance (sample row) に optional な `_cpm` フィールドとして付与:

```jsonc
{
  "id": "t-kickoff",
  "name": "Kickoff",
  "plannedStart": "2026-04-20",
  "plannedEnd":   "2026-04-20",
  "_cpm": {
    "earliestStart": "2026-04-20",
    "earliestFinish": "2026-04-20",
    "latestStart":   "2026-04-20",
    "latestFinish":  "2026-04-20",
    "totalFloat":    0,
    "onCriticalPath": true
  }
}
```

View 側にも:

```jsonc
"criticalPath": {
  "strategy":    "highlight",
  "paths":       [["t-kickoff", "t-discovery", ...]],  // 複数存在しうる
  "totalDays":   72,
  "computedAt":  "2026-04-20T10:00:00Z"
}
```

## 後方互換性

**Class A (additive)**: `criticalPath` 指定なしの Gantt view は従来通り無変更。

## 代替案

- **案 B: 実装側に任せる (spec 規定なし)** — 却下: 結果の一貫性が保てない
- **案 C: Gantt 描画時にオンザフライ計算** — IR に含めず runtime で算出。キャッシュ不可で遅延大
- **案 D: 別 tool に委譲 (MS Project 互換フォーマット変換)** — 却下: 自己完結性を失う

## サンプル / テスト

- `project-schedule.uml` の `pm-gantt` view に `criticalPath: highlight` を追加した expected-ir を新規作成
- 新サンプル `samples/critical-path-demo.uml`: 意図的に 2 つのクリティカルパスを持つケース
- Conformance: CPM 結果の構造検証 (実装が計算を実施するかは任意、計算する場合は仕様準拠)

## 受諾時にやること

- [ ] `grammar.md` / `grammar.en.md` §4.5 (view) に `criticalPath:` 追加
- [ ] `grammar.bnf` の `ViewBody` に `CriticalPathClause` 追加
- [ ] `ir.schema.json` の view に `criticalPath`、task sample に `_cpm` 追加
- [ ] `skills/{ja,en}/codegen-mapping.md` に CPM 結果の Gantt 描画利用例を追加
- [ ] 新サンプル + expected-ir 更新
- [ ] `SPEC_VERSION` 0.7.0 bump

## 未解決事項

- Resource constraint (人員の同時割当制限) を考慮した CPM (resource-leveling) は次段
- Multi-project での共通 critical path 集計
- CPM 計算は optional か mandatory か (ツール実装レベル)
