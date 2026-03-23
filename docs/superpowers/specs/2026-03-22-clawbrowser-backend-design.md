# Clawbrowser Backend — Design Specification

## Overview

Backend system for clawbrowser.ai: a Go monolith API that generates browser fingerprints with proxy credentials, manages customers, and integrates with external services for auth, billing, API key management, and proxy provisioning.

**Repos:**
- `clawbrowser-api` — Go backend (this spec)
- `clawbrowser-dashboard` — Next.js frontend (separate spec)

**Master spec:** `docs/superpowers/specs/2026-03-21-clawbrowser-design.md`
**API contract:** `api/openapi.yaml`

**Note:** This spec supersedes `docs/superpowers/plans/2026-03-21-plan1-backend-api.md`. That plan was written before the backend architecture was finalized and uses a different project structure, fewer external services, and no dashboard endpoints. Use this spec as the source of truth for the backend.

## Technology Stack

| Component | Technology | Deployment |
|-----------|-----------|------------|
| API | Go 1.22+, Chi router | Docker → EKS |
| Database | PostgreSQL | AWS RDS |
| Cache | Redis | AWS ElastiCache |
| User auth | Auth0 | Managed SaaS |
| API key management | Unkey | Self-hosted → EKS |
| Billing & metering | UniBee | Self-hosted → EKS |
| Proxy provider | Nodemaven | External API |
| Transactional email | MailerSend SMTP | External SaaS |
| Config | Viper (YAML + env var overrides) | — |
| Code generation | oapi-codegen (OpenAPI → Chi server + types) | Build-time |

## Architecture

```
┌─────────────┐     ┌─────────────┐
│  clawbrowser │     │   Next.js   │
│   (browser)  │     │  Dashboard  │
└──────┬───────┘     └──────┬──────┘
       │                    │
       │  Bearer API key    │  Auth0 JWT
       │  (Unkey-issued)    │
       ▼                    ▼
┌──────────────────────────────────┐
│         Go API (monolith)        │
│                                  │
│  ┌───────────┐  ┌─────────────┐  │
│  │Fingerprint│  │  Dashboard  │  │
│  │  Routes   │  │   Routes    │  │
│  └─────┬─────┘  └──────┬──────┘  │
│        │               │         │
│  ┌─────┴───────────────┴──────┐  │
│  │      Service Layer         │  │
│  └─────┬──┬──┬──┬──┬──┬──────┘  │
│        │  │  │  │  │  │         │
└────────┼──┼──┼──┼──┼──┼─────────┘
         │  │  │  │  │  │
         ▼  ▼  ▼  ▼  ▼  ▼
       PG  Redis Unkey UniBee Nodemaven Auth0
```

### Authentication Paths

- **Browser clients** (clawbrowser binary) → Bearer token verified against Unkey (<40ms)
- **Dashboard** (Next.js) → Auth0 JWT verified against Auth0 JWKS
- **Webhooks** (Auth0, UniBee) → signature verification

## API Design

### Browser-facing (Unkey API key auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/fingerprints/generate` | Generate fingerprint + proxy credentials |
| POST | `/v1/proxy/verify` | Verify proxy geo matches expectations |

### Dashboard-facing (Auth0 JWT auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/me` | Get current customer profile |
| PUT | `/v1/me` | Update customer profile |
| POST | `/v1/api-keys` | Create new API key (→ Unkey) |
| GET | `/v1/api-keys` | List customer's API keys |
| DELETE | `/v1/api-keys/{id}` | Revoke API key (→ Unkey) |
| POST | `/v1/api-keys/{id}/rotate` | Rotate API key (→ Unkey) |
| GET | `/v1/usage` | Get usage stats (→ Unkey) |
| GET | `/v1/usage/history` | Usage over time for charts (→ Unkey) |
| GET | `/v1/billing/subscription` | Current plan & status (→ UniBee) |
| POST | `/v1/billing/portal` | Get UniBee portal URL for plan management |

### Webhook endpoints (signature verification)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/webhooks/auth0` | New user signup → create customer + Nodemaven sub-client |
| POST | `/v1/webhooks/unibee` | Payment events, subscription changes |

Full OpenAPI specification: [`api/openapi.yaml`](../../../api/openapi.yaml)

## Data Model (PostgreSQL)

```sql
CREATE TABLE customers (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth0_id                  TEXT UNIQUE NOT NULL,
    email                     TEXT UNIQUE NOT NULL,
    name                      TEXT,
    status                    TEXT NOT NULL DEFAULT 'provisioning',  -- provisioning | active | provisioning_failed
    nodemaven_sub_client_id   TEXT UNIQUE,
    nodemaven_credentials     JSONB,  -- {host, username, password}
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE api_keys (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    unkey_key_id  TEXT UNIQUE NOT NULL,
    name          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at    TIMESTAMPTZ
);
```

**Notes:**
- Nodemaven credentials stored in `customers` — 1:1 relationship
- `api_keys` is a lightweight mirror of Unkey — source of truth is Unkey
- Usage data comes from Unkey's usage tracking API — no local logging
- Hard deletes for customer deletion (GDPR)

## Redis Caching

| Key pattern | Value | TTL | Purpose |
|-------------|-------|-----|---------|
| `customer:{unkey_key_id}` | Customer record + Nodemaven credentials | Configurable (default 10m) | Avoid DB lookup on every fingerprint generation |

**Customer lookup chain on the hot path:**
1. Unkey verifies the API key and returns the Unkey key ID + metadata (which includes `customer_id`)
2. Redis lookup: `customer:{unkey_key_id}` → customer record with Nodemaven credentials
3. On cache miss: query Postgres `api_keys` table by `unkey_key_id` → get `customer_id` → join with `customers` table → populate Redis cache

Invalidated when customer updates Nodemaven credentials (rare).

All TTL values are externalized in config (see Configuration section).

## Configuration

YAML defaults with env var overrides via Viper. Env var convention: `CLAWBROWSER_` prefix, double underscore for nesting.

```yaml
server:
  port: 8080

redis:
  url: redis://localhost:6379
  ttl:
    customer: 10m

postgres:
  url: postgres://localhost:5432/clawbrowser

auth0:
  domain: ""
  audience: ""

unkey:
  url: http://localhost:3000
  root_key: ""

unibee:
  url: http://localhost:8088
  api_key: ""

nodemaven:
  api_url: https://api.nodemaven.com
  api_key: ""

mailersend:
  smtp_host: smtp.mailersend.net
  smtp_port: 587
  api_key: ""
  from: noreply@clawbrowser.ai
```

| YAML path | Env var override |
|-----------|-----------------|
| `redis.ttl.customer` | `CLAWBROWSER_REDIS__TTL__CUSTOMER` |
| `postgres.url` | `CLAWBROWSER_POSTGRES__URL` |
| `auth0.domain` | `CLAWBROWSER_AUTH0__DOMAIN` |
| `unkey.root_key` | `CLAWBROWSER_UNKEY__ROOT_KEY` |

## Integration Flows

### Customer Signup

```
User clicks "Sign Up" (Next.js)
  → Auth0 handles registration + social OAuth
    (Google, Apple, Microsoft, GitHub)
  → Auth0 fires webhook to POST /v1/webhooks/auth0
  → Go API:
      1. Create customer record in Postgres (status: "provisioning")
      2. Call Nodemaven API → create sub-client
      3. Store sub-client credentials in customer record
      4. Create default API key via Unkey
      5. Update customer status to "active"
      6. Send welcome email via MailerSend with API key
```

**Failure handling:** The signup flow is a multi-step orchestration. Failures at any step leave the customer in a partial state. The strategy is **forward recovery with status tracking:**

- Customer is created with `status: provisioning` in step 1. This means the webhook always returns 200 to Auth0 (avoiding retries that would create duplicate records).
- If step 2 (Nodemaven) fails: customer stays in `provisioning`. A background retry job picks up incomplete customers and retries Nodemaven provisioning.
- If step 4 (Unkey) fails: same — retry job handles it.
- If step 6 (MailerSend email) fails: customer is still `active` and functional. Email delivery is best-effort; the customer can retrieve their API key from the dashboard.
- The dashboard shows a "setup in progress" state for customers in `provisioning` status.
- A retry job runs every 60 seconds, picks up `provisioning` customers older than 30 seconds, and attempts the remaining steps. After 5 failed retries, the customer is marked `provisioning_failed` and an alert is sent.

### Fingerprint Generation

```
clawbrowser --fingerprint=fp_abc123
  → POST /v1/fingerprints/generate (Bearer: clawbrowser_xxxxx)
  → Go API:
      1. Verify API key with Unkey (<40ms) → get customer identity
      2. Load customer + Nodemaven creds from Redis (miss → Postgres → cache)
      3. Generate fingerprint from curated datasets
      4. Attach proxy credentials from customer's Nodemaven sub-client
      5. Unkey auto-tracks usage (for billing via UniBee)
      6. Return fingerprint + proxy
```

### API Key Rotation

```
Dashboard → POST /v1/api-keys/{id}/rotate
  → Go API:
      1. Verify Auth0 JWT
      2. Revoke old key in Unkey
      3. Create new key in Unkey
      4. Update api_keys table in Postgres
      5. Invalidate Redis cache for old key
      6. Return new key (shown once to customer)
```

## Project Structure

```
clawbrowser-api/
├── cmd/
│   └── server/
│       └── main.go                    # Entry point
├── internal/
│   ├── config/
│   │   └── config.go                  # Viper-based YAML + env config
│   ├── api/
│   │   ├── gen/
│   │   │   ├── generate.go            # //go:generate directive for oapi-codegen
│   │   │   ├── server.gen.go          # Generated: ServerInterface + Chi routing
│   │   │   └── types.gen.go           # Generated: request/response types
│   │   ├── server.go                  # Implements gen.ServerInterface
│   │   ├── router.go                  # Chi router, middleware chain, mounts generated routes
│   │   ├── middleware_unkey.go         # API key auth (browser clients)
│   │   ├── middleware_auth0.go         # JWT auth (dashboard)
│   │   └── middleware_webhook.go       # Webhook signature verification
│   ├── service/
│   │   ├── fingerprint.go             # Fingerprint generation logic
│   │   ├── customer.go                # Customer CRUD + onboarding
│   │   ├── apikey.go                  # API key orchestration (Unkey wrapper)
│   │   ├── billing.go                 # Billing orchestration (UniBee wrapper)
│   │   └── usage.go                   # Usage aggregation (Unkey data)
│   ├── provider/
│   │   ├── unkey.go                   # Unkey API client
│   │   ├── unibee.go                  # UniBee API client
│   │   ├── nodemaven.go               # Nodemaven API client
│   │   ├── auth0.go                   # Auth0 Management API client
│   │   └── mailersend.go              # MailerSend SMTP email client
│   ├── store/
│   │   ├── postgres.go                # DB connection + migrations
│   │   ├── customer_repo.go           # Customer queries
│   │   ├── apikey_repo.go             # API key queries
│   │   └── cache.go                   # Redis cache layer
│   ├── fingerprint/
│   │   ├── generator.go               # Core generation logic
│   │   └── datasets.go                # Curated browser config presets
│   └── model/
│       └── types.go                   # Shared domain types
├── api/
│   └── openapi.yaml                   # OpenAPI spec (contract with frontend)
├── migrations/
│   ├── 001_create_customers.up.sql
│   ├── 001_create_customers.down.sql
│   ├── 002_create_api_keys.up.sql
│   └── 002_create_api_keys.down.sql
├── oapi-codegen.yaml                  # Code generation config
├── config.yaml                        # Default config
├── Dockerfile
├── go.mod
└── go.sum
```

### Layer Responsibilities

- **`api/gen/`** — Generated code (do not edit): `ServerInterface`, Chi route registration, request/response types
- **`api/`** — Hand-written: `server.go` implements `gen.ServerInterface`, `router.go` wires middleware + mounts generated routes
- **`service/`** — Business logic, orchestrates providers and store
- **`provider/`** — External service API clients (Unkey, UniBee, Nodemaven, Auth0, MailerSend)
- **`store/`** — Postgres + Redis data access
- **`fingerprint/`** — Standalone generation logic (no external dependencies)
- **`model/`** — Shared domain types

### Code Generation (oapi-codegen)

Server types and routing are generated from `api/openapi.yaml` using `oapi-codegen`. Configuration in `oapi-codegen.yaml`:

```yaml
# oapi-codegen v2 multi-output config
output:
  - package: gen
    output: internal/api/gen/server.gen.go
    generate:
      chi-server: true
      embedded-spec: false
  - package: gen
    output: internal/api/gen/types.gen.go
    generate:
      models: true
```

- Run `go generate ./...` to regenerate after OpenAPI spec changes
- Generated files (`*.gen.go`) are committed to the repo
- The OpenAPI spec is a build-time artifact only — it is **not** embedded in the binary and **not** served by any endpoint
- `internal/api/server.go` implements `gen.ServerInterface` — each method maps to one API endpoint and delegates to the service layer
- Health probes (`/healthz`, `/readyz`) are **not** in the OpenAPI spec — they are infrastructure endpoints registered directly in `router.go`
- Webhook signature verification is applied as Chi middleware in `router.go`, not via OpenAPI security schemes

## Deployment

All deployment logic, K8s manifests, Terraform IaC, and CI/CD pipelines live in `clawbrowser-infra`. This repo contains only application source code and a Dockerfile.

**Full deployment spec:** `docs/superpowers/specs/2026-03-22-clawbrowser-devops-design.md`

### App Repo CI Responsibilities

On merge to `main`, the app repo's `ci.yaml` workflow:

1. Run tests
2. Build Docker image
3. Tag: `v{semver}-{build_number}-{short_sha}` (e.g., `v1.2.3-42-abc123f`)
4. Push to Docker Hub
5. Fire `repository_dispatch` to `clawbrowser-infra` with `{"event_type": "deploy-api", "client_payload": {"image_tag": "v1.2.3-42-abc123f"}}`

The infra repo then deploys the image to QA. Promotion to prod is a separate manual workflow in the infra repo.

### Health Probes

The API must expose these endpoints for K8s liveness/readiness probes:

| Probe | Endpoint | Purpose |
|-------|----------|---------|
| Liveness | `GET /healthz` | Restart unhealthy pods |
| Readiness | `GET /readyz` | Gate traffic during rolling deploys |

## Fingerprint Generation

Fingerprints are generated from curated datasets of real browser configurations. The generation logic produces internally consistent profiles:

- macOS UA won't pair with Windows fonts
- Platform presets generate realistic combinations (e.g., "Chrome 122 on macOS 14, M2, 16GB")
- Timezone and language auto-aligned with proxy geo (from Nodemaven sub-client country)
- Seed-based PRNG for canvas, audio, and client rects noise — deterministic per profile

See master spec for full list of spoofed surfaces and consistency rules.

## Proxy Integration (Nodemaven)

- Each customer gets a Nodemaven sub-client created at signup
- Sub-client credentials (gateway host, username, password) stored in `customers.nodemaven_credentials`
- Geo-targeting is encoded in the proxy username string (e.g., `user-country-US-city-NYC:password`)
- On fingerprint generation, proxy credentials are included in the response for the clawbrowser binary
- Proxy verification endpoint (`/v1/proxy/verify`) connects through the proxy, checks actual geo against expected, and returns a `match` boolean

## Testing Strategy

- **Unit tests:** Service layer logic, fingerprint generation, config parsing
- **Integration tests:** Handler tests with mocked providers, DB tests against test Postgres
- **Provider tests:** Unkey/UniBee/Nodemaven client tests against test instances
- **Contract tests:** Validate OpenAPI spec matches actual handler responses
