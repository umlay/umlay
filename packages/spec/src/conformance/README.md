# Umlay DSL — Conformance Test Basis

`@umlay/spec` への準拠を実装側が宣言できるようにする、軽量なテスト基盤。

## 狙い

- 実装 (parser / IR 変換器 / renderer) が特定の spec バージョンに対して
  「どのサンプルを正しく処理できるか」を機械的に申告できる
- 新機能 (RFC 受諾) 時に「どの既存サンプルが通り続けなければいけないか」を追跡
- 異なる実装間で仕様解釈のズレを早期検出

## 構成

```
conformance/
├── README.md         (本ファイル)
├── manifest.yaml     (サンプル × 機能 マトリクス)
├── index.ts          (manifest ローダー + 自己検証)
└── expected-ir/      (将来: 各サンプルの期待 IR JSON)
```

## 3 レベルの conformance

| Level | 要件 |
| --- | --- |
| **L1 parse** | 全 13 サンプルが parse error 無しで受理される (`grammar.bnf` 準拠) |
| **L2 IR** | 各サンプルが `ir.schema.json` 準拠の IR を生成する |
| **L3 render** | 各サンプルの全 view が描画可能 (視覚出力は実装依存) |

実装は自己宣言形式で level を明示する (例: `@umlay/parser` は L1+L2、`@umlay/renderer-er` は er_diagram に対する L3)。

## 実行方法

### 本リポジトリでの自己検証 (L0: manifest 整合性)

```bash
cd packages/spec
pnpm test:conformance
```

`index.ts` が以下を検証:

1. `manifest.yaml` のパースと型チェック
2. 各 `sample.path` で指定したファイルが実在する
3. 各 `sample.features` に宣言された機能マーカーが DSL 中に出現する (grep ベース)
4. `min-spec-version` が `index.ts` の `SPEC_VERSION` 以下である

### 実装側での使用

実装は `manifest.yaml` を読み込み、各サンプルを自前パーサに通した結果を期待値と照合する:

```ts
import { loadManifest } from '@umlay/spec/conformance';
import { parse } from 'my-parser';

const manifest = loadManifest();
for (const sample of manifest.samples) {
  const ir = parse(readFileSync(sample.path));
  assertSchemaValid(ir, '@umlay/spec/ir-schema');
  assertFeaturesPresent(ir, sample.features);
}
```

## スコア算出

各実装は以下を申告する:

```yaml
implementation: my-parser@1.2.3
spec-version: 0.8.0
level: L2
samples:
  - path: hello-order.uml
    pass: true
  - path: login/login.uml
    pass: false
    reason: "sequence body の alt-else 未対応 (RFC 0003)"
```

## 関連

- [`manifest.yaml`](./manifest.yaml) — 現行サンプル × 機能マトリクス
- [`../grammar.bnf`](../grammar.bnf) — 構文の正本
- [`../ir.schema.json`](../ir.schema.json) — IR の正本
- [RFC](../rfcs/README.md) — 受諾済みの拡張
