# with-glob-imports — RFC 0014 Glob import デモ

spec 0.4.0 の `import "./tasks/*.uml"` で複数ファイルを一括取り込みする例。

## ディレクトリ構成

```
with-glob-imports/
├── root.uml                (import "./tasks/*.uml" + 統合 view)
└── tasks/
    ├── sprint-1.uml        (namespace sprint1, 3 タスク)
    ├── sprint-2.uml        (namespace sprint2, 3 タスク)
    └── sprint-3.uml        (namespace sprint3, 3 タスク)
```

## glob pattern のデモ

`root.uml` で使用:

```prisma
import "./tasks/*.uml"
```

これで `tasks/` 配下の `sprint-1.uml` / `sprint-2.uml` / `sprint-3.uml` が一括解決。

将来 `tasks/sprint-4.uml` を追加しても `root.uml` の import 行は変更不要。

## Gantt 統合

3 つの namespace (sprint1 / sprint2 / sprint3) に跨る Task を `global-gantt` view で 1 つのチャートに束ねる:

```prisma
view global-gantt @gantt_chart {
  include: sprint1.Task, sprint2.Task, sprint3.Task
  layout: direction(LR), engine(elk)
}
```

## その他の glob パターン (参考)

```prisma
import "./tasks/sprint-?.uml"         // 1 文字ワイルドカード
import "./phases/**/*.uml"             // 再帰ディレクトリ
import "./modules/{core,shared}/*.uml" // 選択 (optional for minimum spec)
```

**制約**:
- glob には `as` alias 不可 (展開ファイル数が可変のため)
- マッチ 0 件は warning (error ではない)
- 展開結果に namespace 衝突があれば error

## 適用 RFC

- [RFC 0014](../../../spec/src/rfcs/0014-wildcard-import.md) — Wildcard / glob import
- [RFC 0009](../../../spec/src/rfcs/0009-import-cross-file.md) — 基礎 import 構文 (parent)
- [RFC 0004](../../../spec/src/rfcs/0004-sample-data.md) — `@@sample` によるタスクインスタンス
