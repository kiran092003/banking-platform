# Banking Platform

A microservice banking platform: five Spring Boot services behind an API
Gateway, with a React single-page client.

## Architecture

```
browser
  |
  |  http://localhost:5173          (nginx: static app + /api and /ws proxy)
  v
client  ──────────────────────────────┐
                                      |  /api/**  ->  (prefix stripped)
                                      |  /ws/**   ->  (WebSocket upgrade)
                                      v
                              api-gateway :8080
                              - JWT validation on every route
                              - Bucket4j rate limiting (Redis)
                              - terminates the notification WebSocket
                                and proxies it upstream
                              - aggregates the per-service OpenAPI specs
                                      |
        ┌───────────────┬─────────────┼──────────────────┐
        v               v             v                  v
  auth-service    account-service  transaction-service  notification-service
      :8081           :8082             :8083                :8084
                                          |                    ^
                                          └── transaction-events ┘
                                                 (Kafka)
        └───────────────┴─────────────┴──────────────────┘
                                 |
                          MySQL banking_platform
```

| Component              | Port  | Responsibility                                        |
| ---------------------- | ----- | ----------------------------------------------------- |
| `client`               | 5173  | React 19 + Vite SPA, served by nginx                  |
| `api-gateway`          | 8080  | Single browser-facing entry point, auth, rate limiting |
| `auth-service`         | 8081  | Registration, login, JWT issuing, refresh tokens      |
| `account-service`      | 8082  | Accounts and balance operations                       |
| `transaction-service`  | 8083  | Transfers, outbox, resilience4j retry/circuit breaker |
| `notification-service` | 8084  | Consumes `transaction-events`, pushes over WebSocket  |

Infrastructure: MySQL 8.4, Redis 7, Kafka 3.9 (single-node KRaft).

## Running with Docker Compose

Requires Docker Engine with the Compose v2 plugin. Nothing else — the JDK, Maven
and Node all live inside the build images.

```bash
cp .env.example .env     # then edit: set DB_PASSWORD, JWT_SECRET, INTERNAL_SERVICE_KEY, ...
docker compose up --build
```

Then open:

- **Client** — <http://localhost:5173>
- **Swagger UI** — <http://localhost:8080/swagger-ui.html>
- **Gateway health** — <http://localhost:8080/actuator/health>

The first build compiles five Maven projects from scratch and takes a while;
later builds reuse the cached dependency layers. Startup is ordered by
healthcheck, so the client only comes up once the gateway reports healthy.

```bash
docker compose ps                       # status and health of every container
docker compose logs -f transaction-service
docker compose down                     # stop, keep data
docker compose down -v                  # stop and wipe MySQL + Kafka volumes
```

### Published ports

Only the client and the gateway need to be reachable; the services talk to each
other over the Compose network by container name. The infrastructure ports are
deliberately off-default so they are less likely to collide with a local MySQL, Redis or
Kafka install:

| Service | In container | On host |
| ------- | ------------ | ------- |
| client  | 80           | 5173    |
| gateway | 8080         | 8080    |
| MySQL   | 3306         | 3308    |
| Redis   | 6379         | 6380    |
| Kafka   | 9094         | 9094    |

All six are overridable in `.env` (`CLIENT_HOST_PORT`, `MYSQL_HOST_PORT`, ...).

> Changing `CLIENT_HOST_PORT` also means changing `WEBSOCKET_ALLOWED_ORIGINS` to
> match. The gateway rejects a WebSocket handshake whose `Origin` is not on that
> list — that check is what stops cross-site socket hijacking, since the
> same-origin policy does not apply to WebSockets.

## Running without Docker

The services read the same environment variables, each with a `localhost`
default, so only the secrets have to be supplied. Export the contents of `.env`
first (or set them in your IDE run configuration):

```bash
set -a && . ./.env && set +a
```

Then start MySQL, Redis and Kafka locally and run each service:

```bash
cd server/auth-service && ./mvnw spring-boot:run     # and the other four
cd client && npm install && npm run dev              # http://localhost:5173
```

In dev the Vite dev server proxies `/api` and `/ws` to the gateway
(see `client/vite.config.ts`), which is the same arrangement nginx provides in
the container — so the gateway never needs CORS configuration.

## Configuration

Nothing secret is committed. Every credential is an environment variable, and
`.env` is gitignored; `.env.example` documents the full set.

| Variable | Used by | Purpose |
| -------- | ------- | ------- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` | auth, account, transaction, notification | MySQL connection. `DB_PASSWORD` is also the MySQL container's root password. |
| `JWT_SECRET` | all five | Base64 HMAC key for signing and validating access tokens. Must be identical everywhere. |
| `INTERNAL_SERVICE_KEY` | gateway, account, transaction, notification | Shared secret for service-to-service calls. |
| `AUTH_ADMIN_USERNAME`, `AUTH_ADMIN_PASSWORD` | auth | Spring Security in-memory admin user. |
| `KAFKA_BOOTSTRAP_SERVERS` | transaction, notification | Kafka brokers. |
| `REDIS_HOST`, `REDIS_PORT` | gateway | Redis backing the rate limiter. |
| `AUTH_SERVICE_URL`, `ACCOUNT_SERVICE_URL`, `TRANSACTION_SERVICE_URL`, `NOTIFICATION_SERVICE_URL` | gateway, transaction | Upstream routing targets. |
| `NOTIFICATION_WS_URL` | gateway | Upstream notification WebSocket. |
| `WEBSOCKET_ALLOWED_ORIGINS` | gateway | Origins allowed to open a WebSocket. |
| `GATEWAY_PUBLIC_URL` | gateway | Public URL stamped into the aggregated OpenAPI specs. |
| `VITE_API_BASE_URL`, `VITE_API_TIMEOUT` | client | Build-time only — Vite inlines them into the bundle. |

Schema is managed by Hibernate `ddl-auto=update`; each service owns its own
tables, so there is no migration step and no shared-table contention on boot.

## Notes

- The services run as a non-root user inside their images.
- `DB_USERNAME` defaults to `root`. For anything beyond local development,
  create a least-privilege MySQL user per service instead.
