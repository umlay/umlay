# multi-project-schedule — RFC 0005 cross-namespace `@@dependencies`

3 つの namespace を跨いで Gantt スケジュールを組む例。spec 0.3.0 の **RFC 0005 cross-ns `@@dependencies`** + **RFC 0009 `import`** を実証する。

## ファイル

| ファイル | namespace | 役割 |
| --- | --- | --- |
| [`pm-core.uml`](./pm-core.uml) | `pm_core` | 全プロジェクト共通のインフラ系タスク |
| [`pm-feature-a.uml`](./pm-feature-a.uml) | `pm_feature_a` | 機能 A。`pm_core` に依存 |
| [`pm-feature-b.uml`](./pm-feature-b.uml) | `pm_feature_b` | 機能 B。`pm_core` + `pm_feature_a` に依存 |

## 依存グラフ

```
pm_core
  ├── c-infra  ─┐
  ├── c-auth   ─┤
  └── c-db     ─┤
                │
                ▼ (cross-ns dep, FS)
pm_feature_a
  ├── a-design ──▶ a-backend ──┐
  │            └─▶ a-frontend ─┤
  │                             │
  └────────────────────────────── a-release
                                    │
                                    ▼ (cross-ns dep, FS lag 3)
pm_feature_b
  └── b-design ──▶ b-impl ──▶ b-release
```

## Cross-namespace 構文デモ

### 短縮形 (pm-feature-a.uml より)

```prisma
model FeatureACoreDependency @entity {
  @@dependencies(pm_core.Task)                          // 短縮形
}
```

### 完全形 (pm-feature-b.uml より)

```prisma
model FeatureBCrossDeps @entity {
  @@dependencies(
    { on: pm_core.Task,      kind: FS, lag: 0 },
    { on: pm_feature_a.Task, kind: FS, lag: 3 }
  )
}
```

## 参照解決

- `pm_core.Task` — `pm_core` namespace の `Task` model (同名別 namespace だが解決可能)
- `pm_feature_a.Task` — `pm_feature_a` namespace の `Task` model
- S11 (review-uml): cross-ns `on` も同じ resolver で解決、未解決は error

## 適用 skill / RFC

- [`skills/ja/write-uml.md`](../../../../skills/ja/write-uml.md) Step 9 — `@@dependencies` 使用法
- [`skills/ja/review-uml.md`](../../../../skills/ja/review-uml.md) S11 — cross-ns 解決性
- [RFC 0005](../../../spec/src/rfcs/0005-cross-namespace-dependencies.md) — 本 RFC 本体
