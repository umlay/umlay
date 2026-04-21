# Getting Started — 最初の `.umlay` を書く

本書は、Umlay DSL をまだ書いたことがない人向けに、最小のサンプルから手を動かすためのガイドです。

## 前提

| ツール | バージョン |
| --- | --- |
| Node.js | 22 以上 (`.node-version` に固定) |
| pnpm | 10 以上 |

Node のバージョンは [Volta](https://volta.sh) / [fnm](https://github.com/Schniz/fnm) / nvm が `.node-version` を読み取ります。

## 1. リポジトリを取得

```bash
git clone https://github.com/umlay/umlay.git
cd umlay
pnpm install
pnpm typecheck
```

本リポジトリが公開するのは **spec / examples / skills** のみです。実装 (パーサ・レンダラー) は別リポジトリで提供されます。

## 2. サンプルを眺める

`packages/examples/samples/` に、難易度順の `.umlay` が置いてあります。

| # | ファイル | ねらい |
| --- | --- | --- |
| 1 | `hello-order.umlay` | 最小サンプル |
| 2 | `blog.umlay` | Users / Posts / Comments / Tags |
| 3 | `ecommerce.umlay` | cascade / inverse デモ |
| 4 | `saas-multitenant.umlay` | Orgs / Users / Teams / Invitations |
| 5 | `japanese-domain.umlay` | 日本語識別子 + `@codegenName` |
| 6 | `with-attachments.umlay` | 画像添付デモ |
| 7 | `with-custom-theme.umlay` | 外部 CSS テーマ適用デモ |
| 8 | `reserved-keywords.umlay` | 将来予約語 (function / queue / component) を含む |
| 9 | `project-schedule.umlay` | WBS / ガント用スケジュール |

## 3. 最小の `.umlay` を書く

次の内容を `hello.umlay` として保存してみます。

```prisma
namespace shop

model Customer @aggregate_root {
  id    UUID! @id
  name  string!
  email string! @unique
}

model Order @aggregate_root {
  id          UUID! @id
  customerId  UUID! @ref(Customer.id)
  total       decimal!
}

view shop-er @er_diagram {
  include: shop.*
}
```

このファイルから:

- `model` 2 つ (`Customer`, `Order`) がエンティティとして定義される
- `@ref(Customer.id)` によって `Order.customerId` → `Customer.id` の参照が張られる
- `view` によって「どのモデル群を 1 つの ER 図として描くか」を指定する

## 4. 文法を深く知る

次のドキュメントで詳しく紹介します。

- [dsl-guide.md](./dsl-guide.md) — 文法、アノテーション、ビュー、nullable 記法
- [ir-guide.md](./ir-guide.md) — ツール開発者向けの正規IR
- `../../packages/spec/src/grammar.md` — 文法の正本

## 5. 困ったら

- 予約語や `@` 記法の正本 → [`packages/spec/src/grammar.md`](../../packages/spec/src/grammar.md)
- バグ・提案 → [GitHub Issues](https://github.com/umlay/umlay/issues)
- よくある質問 → [faq.md](./faq.md)
