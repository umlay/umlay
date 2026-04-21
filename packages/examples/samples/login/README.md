# Login sample — 画面 + Google OAuth on AWS serverless

Umlay で「画面」「ユーザー操作」「バックエンド」「データ永続化」を一本の `.uml` にまとめ、ログインから `/dashboard` 遷移までを多視点で可視化したサンプル。

## 対象

| レイヤ | 要素 |
| --- | --- |
| 画面 | `LoginPage` (`/`) / `DashboardPage` (`/dashboard`) / `AuthErrorPage` (`/auth/error`) / `GoogleConsentScreen` (外部) |
| 操作 | `LoginAction` (`SignInWithGoogleButton` クリック) |
| エッジ | CloudFront (CDN) + S3 (Next.js 静的エクスポート) |
| API | API Gateway (HTTP API) + Lambda (`authStart` / `authCallback`) |
| データ | DynamoDB (User / OAuthAccount / Session 単一テーブル) |
| 認証 | Google OAuth 2.0 / OpenID Connect (scope = `openid email profile`) |

## ファイル

- [`login.uml`](./login.uml) — 全モデル + 7 view
- [`README.md`](./README.md) — 本ファイル

## 含まれるビュー (7 種、spec 準拠)

| View ID | kind | 目的 |
| --- | --- | --- |
| `login-er` | `@er_diagram` | DynamoDB 永続化データの ER (User / OAuthAccount / Session) |
| `login-class` | `@class_diagram` | ドメイン層 (entity / value_object / enum) |
| `login-arch` | `@component_diagram` | AWS 構成図 (Browser → CloudFront → S3 / ApiGateway / Lambda → DynamoDB / Google) |
| **`login-ui`** | `@component_diagram` | **画面と配信経路の配置** |
| **`login-screens`** | `@activity_diagram` | **画面遷移フロー (Login → Consent → Dashboard / Error)** |
| `login-flow` | `@sequence_diagram` | 画面レンダリング + API 呼び出しまでの完全フロー |
| `session-lifecycle` | `@state_machine` | `Session.status` (ACTIVE / EXPIRED / REVOKED) |

## 画面構成

```
LoginPage (/)
  └─ <SignInWithGoogleButton>
        └─ LoginAction (GET /api/auth/google)

GoogleConsentScreen (外部, accounts.google.com)
  ├─ Allow  → DashboardPage
  └─ Deny   → AuthErrorPage

DashboardPage (/dashboard) [requiresAuth]
  ├─ <UserMenu> (avatar + displayName + Logout)
  ├─ <WelcomeBanner>
  ├─ <ProjectList>
  └─ <ActivityFeed>

AuthErrorPage (/auth/error)
  ├─ <ErrorBanner reason={...}>
  └─ <RetryButton> → LoginPage
```

各画面の構成コンポーネントは `.uml` 内の `@@doc` ブロックに記載。

## 画面遷移 (`login-screens` @activity_diagram)

```
          [ LoginPage ]
                │  click Sign in with Google
                ▼
  [ GoogleConsentScreen ]  (accounts.google.com)
           │         │
      Allow│         │Deny
           ▼         ▼
   [ DashboardPage ] [ AuthErrorPage ]
                          │  Retry
                          ▼
                    [ LoginPage ]
```

## ドメインモデル (永続化対象)

```
User (aggregate_root)
├── OAuthAccount (entity, 0..* composition)   ← 同一 (provider, providerId) は一意
└── Session (aggregate_root, 0..* association) ← 現在 ACTIVE なものがログイン状態
```

## 発行される Session Cookie

```
Set-Cookie: session=<JWT>; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=86400
```

`JwtSessionToken` の `token` フィールドは private (`-`) — 外部露出しない設計。

## ログインフロー (`login-flow` @sequence_diagram)

1. **LoginPage 表示** — Browser → CloudFront → S3 → `render LoginPage`
2. **ボタンクリック** — LoginPage → `dispatch LoginAction(signin-google)` → GET `/api/auth/google`
3. **認可開始** — API Gateway → Lambda(authStart) → 302 to Google
4. **Google 同意画面** — Browser ↔ GoogleConsentScreen
   - **Allow** → 302 to `/api/auth/google/callback?code=...`
   - **Deny** → 302 to `/auth/error?reason=access_denied` → AuthErrorPage
5. **コールバック処理** — Lambda(authCallback) → Google `/token` + `/userinfo` → DynamoDB (User / OAuthAccount upsert, Session PutItem)
6. **Dashboard 遷移** — 302 to `/dashboard` + `Set-Cookie: session=<JWT>` → DashboardPage

## 設計判断

| 判断 | 理由 |
| --- | --- |
| **Strict mode** | 全属性に `+/-` visibility を明示 (`review-uml` L001 をパス) |
| **画面を `@service` で表現** | Phase 1 では `page` 予約語は parse 受理のみ。将来 `page LoginPage { ... }` 構文に移行予定 |
| **`LoginAction` を独立 model に** | ユーザー操作を明示的に DSL 上で扱い、AI 生成 (Storybook 等) の材料化 |
| **単一テーブル設計 (DynamoDB)** | 推奨パターン。PK/SK で `USER` / `OAUTH` / `SESSION` を単一テーブル |
| **Authorization Code + PKCE** | SPA の public client でも安全に使える現行推奨フロー |
| **JWT in HttpOnly Cookie** | XSS 対策。`SameSite=Lax` で CSRF 緩和 |
| **`User → Session` は association** | 両者 `@aggregate_root` なので composition を避け、FK + `onDelete: CASCADE` で連鎖削除 |

## 拡張ポイント (`skills/ja/evolve-schema.md` 基準)

| 変更 | 分類 |
| --- | --- |
| `AuthProvider` に `GITHUB` / `MICROSOFT` を追加 | A (additive) |
| `LoginPage` に `<PasswordlessEmail>` コンポーネントを追加 | A (additive、@@doc 更新 + LoginAction 追加) |
| `DashboardPage.requiresAuth` を `false` へ緩和 | B (relaxation、影響確認) |
| `OAuthAccount` の PK を `(userId, provider)` → `id UUID` へ変更 | C (breaking、RFC 必要) |

## 適用した skill

- [`skills/ja/write-uml.md`](../../../../skills/ja/write-uml.md) — 執筆手順 (Step 1〜9)
- [`skills/ja/review-uml.md`](../../../../skills/ja/review-uml.md) — S01〜S10 / L001〜L013 / R01〜R08 で自己レビュー済
- [`skills/ja/codegen-mapping.md`](../../../../skills/ja/codegen-mapping.md) — Prisma / SQL / TS への決定論的変換の参考

## 参照

- DSL Guide: [`docs/ja/dsl-guide.md`](../../../../docs/ja/dsl-guide.md)
- IR Guide: [`docs/ja/ir-guide.md`](../../../../docs/ja/ir-guide.md)
- 文法の正本: [`packages/spec/src/grammar.md`](../../../spec/src/grammar.md)
