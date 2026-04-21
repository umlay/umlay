# FAQ — よくある質問

## プロダクトについて

### Umlay は既存の Mermaid / PlantUML と何が違いますか

Umlay は「描画のための DSL」ではなく、「1 つの正本から複数の図とコードを派生させるモデリング基盤」を目指しています。

- **意味論を載せる**: 型、多重度、不変条件、意図 (`@intent`) を DSL 上で表現できる
- **AI / lint 連携が前提**: 「可視性・多重度・型の未指定」を静的検出し、AI レビューと組み合わせる
- **ポート矢印対応**: ER 図で FK / PK をカラム単位で可視化できる (Mermaid は非対応)

詳細比較は [overview.md](./overview.md#関連ツールとの位置関係) を参照してください。

### 実装コード (パーサ / レンダラー) はどこですか

本リポジトリには**含まれていません**。本リポジトリは**仕様 (spec) と契約** (JSON Schema) を公開する場所で、実装は別リポジトリで開発中です。

`@umlay/spec` に準拠する実装であれば、本リポジトリとは独立に OSS / クローズドを問わず開発できます。

### Web エディタはいつ公開されますか

Web エディタは本リポジトリの範囲外で、公開時期は別途アナウンスします。

## 利用について

### 商用利用できますか

- `@umlay/spec` は Apache License 2.0 — 商用利用可 (帰属表示必要)
- `@umlay/examples` は MIT — 商用利用可
- `skills/` 配下は CC-BY 4.0 (特記ない限り) — 帰属表示すれば商用利用可

詳細は [`LICENSE`](../../LICENSE) / [`NOTICE`](../../NOTICE) を参照してください。

### DSL に独自キーワードを追加できますか

現行 spec の範囲外のキーワードを使うと、`@umlay/spec` 準拠のツールでは `parse error` になります。拡張を提案する場合は [CONTRIBUTING.md](../../CONTRIBUTING.md) の RFC プロセスに沿って issue / PR を起票してください。

将来実装向けに**予約語**は受理される場合があります (`function` / `queue` / `component` など)。詳細は [roadmap.md](./roadmap.md) を参照してください。

### 日本語識別子は使えますか

使えます。コード生成時に英名が必要であれば `@codegenName("Foo")` を添えてください。

```prisma
model 注文 @aggregate_root @codegenName("Order") {
  id UUID! @id
}
```

## 技術的な質問

### 正規IR は直接書いてもよいですか

技術的には可能 (JSON) ですが、執筆は `.umlay` DSL を推奨します。IR はツール間連携用であり、人間が書くことは想定していません。

### 生成コードの品質はどう担保されますか

決定論的部分 (型 / DDL / OpenAPI) はテンプレート変換で再現性を担保します。LLM を使う部分 (メソッド実装、サンプルデータ) は IR + `@intent` + 契約をプロンプトに与え、出力を再度 lint / 型チェックで検証してから採用します。

詳細は [design-principles.md](./design-principles.md) を参照してください。

### Strict モードは何を強制しますか

Strict モード (`@@mode(strict)`) は、以下を error とします。

- すべての属性の `visibility` 指定 (L001)
- すべての relation の `multiplicity` 指定 (L002)
- 未解決の `@ref` 参照 (L003)
- ID の重複禁止 (L004)
- 循環 `inheritance` (L007)

詳細は [dsl-guide.md §9](./dsl-guide.md) を参照してください。

## 貢献について

### どうやって貢献できますか

- **仕様の提案**: Issue を起票後、`packages/spec/src/rfcs/` に RFC を置く
- **サンプル追加**: `packages/examples/samples/` に `.umlay` を追加 + README の表に行を追加
- **Skill 追加**: `skills/` に `.md` を追加 (フロントマター + 例付き)
- **ドキュメント改善**: `docs/ja/` と `docs/en/` の両方を更新 (できれば両言語一括)

詳細は [CONTRIBUTING.md](../../CONTRIBUTING.md) を参照してください。

### CLA や署名は必要ですか

CLA は不要です。コミットは DCO 相当の sign-off として扱います。

### 脆弱性を見つけました

[`.github/SECURITY.md`](../../.github/SECURITY.md) (存在する場合) または GitHub Security Advisory 経由で非公開に報告してください。

## その他

### 名前 "Umlay" の由来は

**UML** + **lay (配置する / 相を変える)** の合成。タグラインは "UML, relaid." (UML を置き直す)。

### 商標 / ロゴは

Keydrop が管理します。フォークや派生ツールで名前やロゴを使用する場合は事前にご相談ください。

### コミュニティチャンネル

- Discussions: GitHub Discussions
- Issues: GitHub Issues
- 脆弱性: GitHub Security Advisories
