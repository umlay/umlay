---
rfc: 0028
title: `critical` ブロックの `retry(n)` 指定
author: "@kigi"
status: accepted
created: 2026-04-20
updated: 2026-04-20
accepted: 2026-04-20
spec-version-target: 0.8.0
change-class: A
parent-rfc: 0021
---

# RFC 0028 — `critical` ブロックの `retry` 指定

## 要約

RFC 0017 / 0021 の `critical` に、**失敗時の自動再試行**を宣言する `retry(n, backoff: exponential|linear)` を追加する。

## 背景 / モチベーション

実運用では「タイムアウト or 一時的エラー時に N 回まで自動リトライ」が定石。RFC 0021 で timeout / catch / finally を入れたが、retry は未サポート。

- ネットワーク呼び出し (外部 API、DB、メッセージキュー)
- 楽観ロックの race condition
- Redis SETNX 取得失敗

現状は catch 内で手動フローを書くしかなく、宣言的に書けない。

## 提案内容

### 構文 (EBNF 差分)

```ebnf
CriticalBlock ::= "critical" String "{" SeqStatement* "}"
                  ("on" LockTarget)?
                  ("timeout" "(" Duration ")")?
                  ("retry" "(" RetrySpec ")")?               (* RFC 0028 追加 *)
                  ("catch" String "{" SeqStatement* "}")?
                  ("finally"       "{" SeqStatement* "}")?

RetrySpec     ::= Integer                                    (* max attempts (3 等) *)
                | "{" RetryField ("," RetryField)* "}"

RetryField    ::= "attempts" ":" Integer
                | "backoff"  ":" BackoffKind
                | "initial"  ":" Duration
                | "max"      ":" Duration
                | "jitter"   ":" Boolean

BackoffKind   ::= "exponential" | "linear" | "constant"
```

### 使用例

```prisma
view external-call @sequence_diagram {
  participants: API as api, Gateway as gw

  seq {
    critical "外部 API 呼び出し" timeout(3s) retry({
      attempts: 3,
      backoff:  exponential,
      initial:  100ms,
      max:      5s,
      jitter:   true
    }) {
      api ->> gw : GET /resource
      gw  -.> api: { payload }
    } catch "exhausted" {
      api ->> api : log("retry exhausted after 3 attempts")
    } finally {
      api ->> api : metrics.record_attempts()
    }
  }
}

// 短縮形: 回数のみ指定
critical "DB update" timeout(500ms) retry(5) {
  api ->> db : UPDATE ...
}
```

### セマンティクス

- `attempts`: 最大試行回数 (初回含む、既定 1 = retry なし)
- `backoff`: `exponential` / `linear` / `constant` (既定 exponential)
- `initial`: 初回待機時間 (既定 100ms)
- `max`: 待機時間の上限 (既定 30s)
- `jitter`: ±20% のランダム揺らぎ追加 (既定 true)

実行フロー:
1. `critical` ブロック実行
2. 失敗 / timeout 時、attempts カウンタを 1 消費 → backoff 待機 → 再実行
3. attempts 尽きたら `catch` へ
4. 最後に `finally` (成功・全失敗どちらでも)

## IR 影響

```jsonc
{
  "kind": { "const": "critical" },
  ...
  "retry": {
    "type": "object",
    "properties": {
      "attempts":  { "type": "integer" },
      "backoff":   { "enum": ["exponential", "linear", "constant"] },
      "initialMs": { "type": "integer" },
      "maxMs":     { "type": "integer" },
      "jitter":    { "type": "boolean" }
    }
  }
}
```

## 後方互換性

**Class A (additive)**: 既存 critical は retry なしで動作継続。

## サンプル / テスト

- `transfer-critical.uml` の Gateway 呼び出しに retry を追加した拡張版
- 新サンプル `samples/resilient-external-call.uml`
- Conformance: 4 backoff パターン、attempts 0 の error ケース

## 受諾時にやること

- [ ] `grammar.md` / `grammar.en.md` §9 の critical 節を拡張
- [ ] `grammar.bnf` の `CriticalBlock` に retry 追加
- [ ] `ir.schema.json` に retry object 追加
- [ ] `skills/{ja,en}/write-uml.md` に使用例
- [ ] `SPEC_VERSION` 0.8.0 bump

## 未解決事項

- retry 中の特定エラータイプでのみ再試行 (`retry(on: TimeoutError)` 等)
- circuit breaker 相当 (`fallback` block)
- 分散 retry (複数ノードでの試行上限) — 別 RFC
