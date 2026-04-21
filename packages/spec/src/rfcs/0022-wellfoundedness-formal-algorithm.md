---
rfc: 0022
title: Well-foundedness 検査アルゴリズムの形式仕様
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.6.0
change-class: A
parent-rfc: 0018
---

# RFC 0022 — Well-foundedness 検査アルゴリズムの形式仕様

## 要約

RFC 0018 の well-foundedness 検査を**疑似コードレベルで形式化**し、実装間の挙動を一致させる。SCC 分解 → 終端 variant 判定 → container 寄与判定 の 3 段階で規定する。

## 背景 / モチベーション

RFC 0018 は「Tarjan SCC + 終端判定」と散文で規定したのみ。実装間で以下の境界で解釈が分かれうる:

- `field: Map<K, V?>` の `V?` が再帰 union の場合 (container 内 optional)
- ジェネリクス経由の間接再帰 (`Tree<Tree<int>>`)
- 相互再帰 SCC 内で「1 つでも終端があれば全 well-founded」か「各 variant で終端可能」か

RFC 0018 受諾から 1 バージョン経過したので、実装が増える前に詳細を固めておく。

## 提案内容

### アルゴリズム (形式仕様)

```
// 入力: 全 union 宣言の集合 U = {U1, U2, ...}
// 出力: 各 union に対する WellFounded判定 (bool) と、違反時のエラー情報

function checkWellFoundedness(U):

  // ── Step 1: 依存グラフ G 構築 ───────────────────────────
  G = emptyGraph()
  for each union u in U:
    for each variant v in u.variants:
      for each field f in v.fields:
        let targetType = resolveType(f.type)   // ジェネリクス展開含む
        if targetType is a union in U:
          edge_kind = classifyEdge(f)          // { required | optional | container }
          G.addEdge(u -> targetType, edge_kind)

  // ── Step 2: Tarjan SCC 分解 ─────────────────────────────
  sccs = tarjan(G)

  // ── Step 3: SCC ごとに well-foundedness を判定 ───────────
  for each scc in sccs:
    if |scc| == 1 and no self-loop:
      mark all as wellFounded
      continue

    // SCC 内のいずれかの union が「SCC 外への終端 variant」または
    // 「全 field が optional / container の variant」を持てば OK
    hasTerminating = false
    for each u in scc:
      for each variant v in u.variants:
        if ∀ field f in v.fields:
             resolveType(f) ∉ scc  OR
             edge(f) ∈ { optional, container }:
          mark v as terminatingVariant
          hasTerminating = true

    if hasTerminating:
      mark all u in scc as wellFounded
    else:
      emit error("SCC {u for u in scc} is not well-founded")


function classifyEdge(field):
  if field.nullable in ("null", "undefined"):  return optional
  if field.type matches Container<...>:        return container   // 今 List / Map / Set
  return required


function resolveType(typeExpr):
  // ジェネリクス展開: Tree<T> で T が union の場合、Tree<T> 自体は
  // 型パラメータ T の参照として扱う (T は instantiation 時に確定)
  // 型パラメータが再帰union 自身に bind される場合は recursive として扱う
  ...
```

### 定義

- **Container 型**: `List<T>` / `Set<T>` / `Map<K, V>` (追加予定含む)。
  全て「空 instance による終端寄与」を持つとみなす。
- **Optional field**: `?` / `??` 付き。null で終端可能。
- **Required edge**: 終端寄与無し。SCC 内に required 辺のみで構成される閉路があると non-well-founded。

### ジェネリクス経由の再帰 (追加規定)

- `Tree<T>` 内の `T` は、T が **Tree 自身** に束縛されたときのみ recursive とみなす
- `Tree<Tree<int>>` は 2 段の展開で解決。内側 `Tree<int>` は終端 Tree なので well-founded
- 型パラメータ制約 (RFC 0015) に再帰 union を含む場合は警告 (現状対応外)

### 違反時のエラーメッセージ仕様

```
Error: Non-well-founded union(s): X, Y
  SCC: [X, Y]
  No terminating variant found. At least one variant must have all fields
  either:
    - pointing outside the SCC, or
    - nullable (?, ??), or
    - container-wrapped (List<T>, Set<T>, Map<K,V>)
  Suggested fix: add a terminating case like `| Leaf` or make a field optional.
```

## IR 影響

現行 RFC 0018 の `wellFounded` / `terminatingVariants` に加え:

```jsonc
"union": {
  "properties": {
    "sccGroup": {
      "type": "integer",
      "description": "同一 SCC に属する union は同じ integer を共有 (デバッグ用)"
    }
  }
}
```

## 後方互換性

**Class A**: RFC 0018 時点で well-founded と判定されていた union は本アルゴリズムでも well-founded。判定境界が厳密化される結果、一部の実装依存ケースで挙動が変わる可能性あり (その場合 changelog に明記)。

## 代替案

- **案 B: 構造的型理論 (μ-types) ベース** — 却下: 実装コストが高く、DSL の表現力に対して過剰
- **案 C: 禁止 (`union` に再帰を許さない、RFC 0012 を revert)** — 却下: Tree / AST ユースケースを失う

## サンプル / テスト

- 既存の `ast-expr.uml` が本アルゴリズムで well-founded と判定されることの conformance テスト
- 新サンプル `samples/mutual-recursive-union.uml`: 相互再帰 SCC の境界ケース
- 新サンプル `samples/invalid-union-no-base.uml`: 意図的な non-well-founded を parse error にする

## 受諾時にやること

- [ ] `grammar.md` / `grammar.en.md` に形式仕様セクション追加 (またはリンク)
- [ ] `ir.schema.json` の union に `sccGroup` 追加
- [ ] `skills/{ja,en}/review-uml.md` R11 (well-foundedness 違反) をアルゴリズム準拠に更新
- [ ] conformance テストに境界ケースサンプル追加
- [ ] `SPEC_VERSION` 0.6.0 bump

## 未解決事項

- Iterator / Stream 型の container 扱い (現行 List / Set / Map のみ)
- GADT 相当 (型 index 付き union) の well-foundedness — 別 RFC
- IDE / LSP での well-foundedness quick-fix 提案
