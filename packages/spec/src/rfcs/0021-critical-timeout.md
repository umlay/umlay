---
rfc: 0021
title: `critical` ブロックのタイムアウト指定
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.6.0
change-class: A
parent-rfc: 0017
---

# RFC 0021 — `critical` ブロックの timeout

## 要約

RFC 0017 の `critical "label" on (a, b) { ... }` にタイムアウト指定 (`timeout(5s)`) と、タイムアウト時の処理節 (`catch` / `finally`) を追加する。

## 背景 / モチベーション

`transfer-critical.uml` のような分散ロック下の処理で、実務では以下が必須:

- **タイムアウト**: ロック取得 / 処理が長時間ブロックしない保証
- **失敗ハンドリング**: タイムアウト時のロールバック / ログ
- **finally 的な cleanup**: 成功・失敗どちらでも必ずロック解放

現状 `critical` はタイムアウト指定なし。実用のシーケンスを正確に表現できない。

## 提案内容

### 構文 (EBNF 差分)

```ebnf
CriticalBlock   ::= "critical" String "{" SeqStatement* "}"
                    ("on" LockTarget)?
                    ("timeout" "(" Duration ")")?
                    ("catch" String "{" SeqStatement* "}")?
                    ("finally"     "{" SeqStatement* "}")?
Duration        ::= Integer ("ms" | "s" | "m")
```

### 使用例

```prisma
view transfer-with-timeout @sequence_diagram {
  participants: API as api, Lock as lock, DB as db, AuditLog as audit

  seq {
    api  ->> lock : acquire()
    lock -.> api  : acquired

    critical "残高更新" on (db) timeout(5s) {
      api ->> db : debit / credit / commit
    } catch "timeout" {
      api ->> audit : log("critical timeout, rolling back")
      api ->> db    : rollback
    } finally {
      api ->> lock : release()    // 必ず実行される
    }

    api -.> audit : log("transfer done")
  }
}
```

### セマンティクス

- `timeout(5s)` — この時間を超えた場合、critical block から抜けて `catch` 節を実行
- `catch "label"` — タイムアウト時に実行される処理 (label は UI 上のバッジ表示用)
- `finally` — 成功 / タイムアウト / エラーのいずれでも最後に実行

`catch` / `finally` は optional だが、順序は固定 (`catch` が `finally` より先)。

### 実装への影響 (情報)

spec 自体は**意図表現**のみを規定し、実装側 (parser / renderer / runtime) の実装は自由:

- Renderer: 破線枠 + タイムアウト秒数ラベル
- Lint: `timeout` 無しの `critical` に情報レベル警告
- Codegen: `critical` → `try-finally` / `CancellationToken` / Go の `context.WithTimeout`

## IR 影響

```jsonc
{
  "kind": { "const": "critical" },
  "label": { "type": "string" },
  "statements": { "type": "array" },
  "lockTargets": { "type": "array" },
  "timeoutMs": {
    "type": "integer",
    "description": "タイムアウト (ms 単位、省略時は無制限)"
  },
  "catchBranch": {
    "type": "object",
    "properties": {
      "label": { "type": "string" },
      "statements": { "type": "array" }
    }
  },
  "finallyStatements": { "type": "array" }
}
```

## 後方互換性

**Class A (additive)**: 既存の `critical { }` は無影響。

## 代替案

- **案 B: 別ブロック `with-timeout "X" seconds(5) { ... }`** — 却下: critical と独立する利点が薄い
- **案 C: `@@timeout(ms: 5000)` アノテーション** — 却下: sequence body 外に書くと文脈が曖昧

## サンプル / テスト

- `transfer-critical.uml` に timeout + catch + finally を追加した拡張版
- 新サンプル `samples/distributed-lock-with-timeout.uml`
- Conformance: timeout 単独、catch 単独、finally 単独、全部入り、ネスト

## 受諾時にやること

- [ ] `grammar.md` / `grammar.en.md` §9 (critical 節) を拡張
- [ ] `grammar.bnf` の `CriticalBlock` に timeout / catch / finally 追加
- [ ] `ir.schema.json` の seqStatement[critical] を拡張
- [ ] `skills/{ja,en}/write-uml.md` に使用例追加
- [ ] `SPEC_VERSION` 0.6.0 bump

## 未解決事項

- `retry(n)` 指定の要否 (失敗時の自動再試行回数)
- `catch` 節内での `throw` / 再スロー相当の表現
- `finally` 中のエラーハンドリング (既に finally 内にいるため)
