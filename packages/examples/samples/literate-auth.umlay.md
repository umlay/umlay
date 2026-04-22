# Auth domain — Google OAuth login

This file demonstrates the **literate Umlay** format. Markdown prose lives
alongside `umlay` fenced code blocks — both are kept in the same `.umlay.md`
file. Tools that understand the format (LSP / VS Code preview / web editor)
extract the umlay blocks, parse them as one IR, and surface the prose
unchanged.

## Goal

Drive a single Google OAuth + PKCE login flow and persist the resulting
session to a JWT-or-Redis-backed store.

## Domain

Two aggregate roots — `User` and `Session` — with a one-to-many edge.

```umlay
namespace auth

model User @aggregate_root @intent("認証主体") {
  id        UUID!   @id
  email     string! @unique
  googleSub string! @unique
  -> composition 0..* sessions: Session
}

model Session @entity @intent("ログインセッション") {
  id        UUID!   @id
  userId    UUID!   @ref(User.id, onDelete: CASCADE, inverse: "sessions")
  token     string! @unique
  expiresAt Timestamp!
  @@index(userId)
}
```

## Views

The ER diagram alone is enough for a first review.

```umlay
view auth-er @er_diagram {
  include: auth.*
}
```

## Open questions

- Should `Session.token` be opaque (Redis-backed) or a self-contained JWT?
- How do we revoke a session — is `status: REVOKED` sufficient or do we need
  a separate revocation table?

> The trailing prose is just markdown — no umlay parsing applies here.
