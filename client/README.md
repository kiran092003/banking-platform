# Banking Platform — Frontend

React + TypeScript client for the Banking Platform microservices. The browser talks
**only** to the API Gateway on `http://localhost:8080`; individual services
(`8081`–`8084`) are never addressed directly.

## Stack

| Concern | Choice |
| --- | --- |
| Build | Vite 8 |
| Language | TypeScript (strict) |
| UI | React 19 |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) |
| Client state | Redux Toolkit |
| Server state | TanStack React Query v5 |
| HTTP | Axios (interceptors for auth + refresh) |
| Routing | React Router v7 |
| Forms | React Hook Form + Zod |
| Icons | lucide-react |

## Running it

The backend must already be up (gateway on `8080`, plus auth, account and
transaction services).

```bash
npm install
npm run dev     # http://localhost:5173
```

Other scripts:

```bash
npm run build     # typecheck + production build
npm run preview   # serve the production build
npm run lint
```

### Why `/api` and not `http://localhost:8080`

The gateway sends no CORS headers, so a browser on `:5173` cannot call `:8080`
cross-origin. Rather than widen the backend's CORS policy, Vite proxies `/api`
to the gateway (see `vite.config.ts`), which keeps the backend untouched and
makes every request same-origin.

`VITE_API_BASE_URL` therefore defaults to `/api`. For a deployment, either serve
this build from the same origin as the gateway, or add CORS to the gateway and
set `VITE_API_BASE_URL=http://localhost:8080`.

### Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | Base URL for every request |
| `VITE_API_TIMEOUT` | `15000` | Axios timeout (ms) |

Vite also proxies `/ws` to the gateway with `ws: true`, so the notification
WebSocket is same-origin for the browser.

## Structure

```
src/
  api/          axios client, one module per service, query keys
  app/          store, router, typed hooks
  components/
    common/     route guards, page header, money/mono, error boundary
    layout/     app shell, sidebar, header, navigation config
    ui/         button, input, select, card, badge, modal, table, states…
  features/
    accounts/   account queries + client-side table state
    auth/       auth slice, token storage, validation schemas
    notifications/
    transactions/
    ui/         app-level UI slice
  pages/        one folder per area (auth, dashboard, accounts, …)
  types/        DTOs mirroring the backend exactly
  utils/        formatting, JWT decode, error normalisation, idempotency
```

## Authentication

1. `POST /auth/login` returns `{accessToken, refreshToken, tokenType, expiresIn}`.
   It carries **no user identity**, so `userId` and `role` are read from the
   access token's claims (`src/utils/jwt.ts`).
2. Every request gets `Authorization: Bearer <accessToken>`.
3. On a `401`, the response interceptor refreshes once via `POST /auth/refresh`
   and replays the original request. Concurrent 401s share a single in-flight
   refresh, and each request is retried at most once — no refresh storms, no
   infinite loop.
4. If refresh fails, tokens are cleared, the React Query cache is dropped and the
   app routes to `/login`.

Access tokens live 15 minutes; refresh tokens 7 days.

### Roles

Nav items are filtered by role **and** admin routes are wrapped in `RoleRoute`,
so typing `/admin` directly lands on `/403`. This is a UX guard only — the
backend authorises every request independently, which is the real boundary.

### Granting ADMIN

Registration always creates a `USER`. Only an existing admin can promote
someone, from **Admin → Users and roles** (`/admin/users`), which calls
`PATCH /auth/users/{userId}/role`.

Two rules are enforced in `auth-service`, not in the UI:

- **Nobody changes their own role.** Otherwise an admin can demote themselves
  out of the console with no way back through the API, and a hijacked admin
  session could quietly reassign roles.
- **The last remaining admin cannot be demoted**, which would leave the platform
  with nobody able to administer it.

The role travels in the access token, so a promoted user gains admin access when
their token next refreshes — within 15 minutes, or at once if they sign in
again. `auth-service` itself reads the user row on every request, so a demoted
admin loses the user-administration endpoints immediately.

**Bootstrapping the first admin:** with no admin in the database there is nobody
who can promote anyone, so the first one is set directly in SQL:
`UPDATE users SET role = 'ADMIN' WHERE username = '<you>';`

## Live notifications (WebSocket)

Notifications stream to the browser in real time. The chain:

```
transaction-service → Kafka(transaction-events) → notification-service
    → persist → AFTER_COMMIT → push to that user's sockets
    → gateway WebSocket proxy → browser
```

### Why the gateway proxies the socket

`spring-cloud-starter-gateway-server-webmvc` is the *servlet* gateway and has no
WebSocket routing filter — that only exists in the reactive gateway. So the
gateway terminates `/ws/notifications` itself and proxies to
notification-service, keeping the rule that a browser only ever talks to `:8080`.

### How the socket is authenticated

A browser's WebSocket API cannot set an `Authorization` header. Putting the
access token in the query string would write a live bearer token into access
logs, proxy logs and browser history, so instead:

1. `POST /ws-ticket` with the normal `Bearer` token.
2. The gateway mints a **single-use ticket**: 32 random bytes, stored in Redis,
   30-second TTL, bound to the userId from the token.
3. The browser opens `ws://…/ws/notifications?ticket=…`.
4. The handshake redeems the ticket with Redis `GETDEL`, which is atomic — a
   ticket cannot be replayed even if two handshakes race.

A leaked ticket is close to worthless: it expires in 30 seconds, works once, and
only ever opens a notification stream for the user it was minted for.

The handshake also enforces an **Origin allow-list**
(`websocket.allowed-origins`). The same-origin policy does not apply to
WebSockets, so without this any site could open a socket from a visitor's
browser (cross-site WebSocket hijacking).

Upstream, notification-service's `/internal/ws/notifications` requires the
shared `X-Internal-Service-Key` and takes the userId from a gateway-set header —
the same trust model as the existing internal REST endpoints. It is not routed
publicly, so a browser cannot reach it.

### Client behaviour

`useNotificationSocket` reconnects with exponential backoff and **full jitter**,
so every open tab does not retry in lockstep after a gateway restart. It
heartbeats every 25s, and an inbound notification invalidates the notification,
transaction and account queries — a settled transaction moves balances too.

One socket is shared app-wide via `NotificationSocketProvider`, mounted in the
app shell.

## Backend changes

### auth-service

1. **Registration can no longer grant a role.** `POST /auth/register` accepted a
   `role` field, so anyone could create an ADMIN with a single anonymous request
   — the frontend hid the selector behind a flag, but the backend took the field
   regardless. `RegisterDto` no longer carries a role and `AuthService.register`
   always assigns `Role.USER`. A role sent by an older client is ignored rather
   than rejected.
2. **`GET /users`** (new, ADMIN-only) — paginated user directory with free-text
   search across username and email, plus a role filter. Page size is capped at
   50, matching the other services.
3. **`PATCH /users/{userId}/role`** (new, ADMIN-only) — the only way to grant
   ADMIN. Refuses changing your own role and demoting the last admin with a
   `409`, and returns `404` for an unknown user.
4. **`AccessDeniedException` handler** — the existing
   `@ExceptionHandler(Exception.class)` would have turned every `@PreAuthorize`
   failure into a `500`. It now returns `403` with a generic message. (This is
   the same bug that was fixed in account-service.)
5. **Lombok was not running under Maven.** `auth-service` declared Lombok as a
   plain `compile` dependency but never added it to `annotationProcessorPaths`,
   which the Spring Boot parent configures — and configuring it disables
   processor discovery from the classpath. Every generated getter and `log`
   field was therefore missing and `mvn compile` failed. The other four services
   already carried the `maven-compiler-plugin` block that is now in this pom.

### account-service

1. **`GET /account/accounts/me`** (new) — every other account endpoint carries a
   class-level `@PreAuthorize("hasRole('ADMIN')")`, which left a USER unable to
   read their own balance or discover the account id that a transfer requires as
   `senderAccountId`. The new endpoint resolves the account from the caller's own
   JWT, so it exposes nothing they are not already entitled to.
2. **`AccessDeniedException` handler** — the existing
   `@ExceptionHandler(Exception.class)` swallowed Spring Security's
   authorisation failure and returned `500` instead of `403`. The catch-all also
   returned raw `ex.getMessage()`, which is now a generic message.

### notification-service (previously had no API and no security at all)

- **Security**: added `SecurityConfig`, `JwtFilter` and `JWTService` mirroring
  the other services — the service was previously completely unauthenticated.
  `InternalServiceFilter` guards `/internal/**` with a **constant-time** key
  comparison. A `GlobalExceptionHandler` returns the platform's standard error
  shape, handles `AccessDeniedException` explicitly so it cannot become a 500,
  and never returns raw exception text.
- **REST API**:
  | Method | Endpoint | Notes |
  | --- | --- | --- |
  | GET | `/notification/notifications` | paginated, `unreadOnly` filter, max size 50 |
  | GET | `/notification/notifications/unread-count` | drives the header badge |
  | PATCH | `/notification/notifications/{id}/read` | |
  | POST | `/notification/notifications/read-all` | |
- **Entity**: `is_read` / `read_at` columns, added with
  `NOT NULL DEFAULT 0` so `ddl-auto=update` is safe on an existing table.
- **WebSocket**: `/internal/ws/notifications`, service-key protected, with a
  post-commit push listener.

Every query is scoped by the JWT's `userId`, and single-row updates match on
`id AND userId`, so one user can never read or modify another's notifications —
not even an ADMIN.

### api-gateway

- `/notification/**` route, `POST /ws-ticket`, and the `/ws/notifications`
  WebSocket proxy with Origin allow-listing.
- `JWTService.extractUserId` for binding a ticket to its user.

## Known backend limitations

These are backend gaps, surfaced honestly in the UI rather than faked:

- **No platform-wide transaction view.** `GET /transaction/transactions` always
  filters by the caller's own `userId`, so an ADMIN sees only their own history.
- **No account-number → id lookup for customers.** A transfer needs the
  recipient's numeric `receiverAccountId`, but
  `/accounts/number/{accountNumber}` is ADMIN-only, so customers must enter the
  recipient's account **id**.
- **Accounts are not paginated.** `GET /account/accounts` returns a plain array,
  so search, filter, sort and pagination are client-side.
- **One account per user.** `getAccountByUserId` returns a single account.
- **No password reset or profile update.** `auth-service` exposes register,
  login, refresh, logout and the two admin user endpoints — there is no
  self-service way to change a password, email or username.
- **Roles cannot be filtered server-side on accounts.** The user directory is
  paginated and searchable, but account lists are not, so the two admin tables
  page differently.
