# Clawbrowser DevOps — Design Specification

## Overview

Infrastructure and CI/CD design for clawbrowser.ai. A dedicated `clawbrowser-infra` repository stores all deployment descriptors, Kubernetes manifests, Terraform IaC, and GitHub Actions pipelines. Images are built once on merge to `main` and promoted through environments without rebuilding.

**Related specs:**
- Backend: `docs/superpowers/specs/2026-03-22-clawbrowser-backend-design.md`
- Frontend: `docs/superpowers/specs/2026-03-21-clawbrowser-design.md`

## Repositories

| Repo | Purpose |
|------|---------|
| `clawbrowser-api` | Go backend (source code only) |
| `clawbrowser-dashboard` | Next.js frontend (source code only) |
| `clawbrowser-infra` | Terraform, K8s manifests, CI/CD pipelines, sealed secrets |

Application repos contain no deployment logic. All infrastructure, pipelines, and deployment descriptors live in `clawbrowser-infra`.

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Container orchestration | AWS EKS (single cluster) |
| Ingress | Traefik with IngressRoute CRDs |
| TLS | Let's Encrypt via Traefik ACME (HTTP-01 challenge) |
| Auth middleware | Traefik ForwardAuth (Auth0 JWT, dashboard routes only) |
| K8s manifest management | Kustomize (base + overlays) |
| IaC | Terraform (S3 + DynamoDB backend) |
| Container registry | Docker Hub |
| CI/CD | GitHub Actions |
| Secrets (in-cluster) | Bitnami Sealed Secrets |
| Secrets (CI/CD) | GitHub Actions secrets |
| AWS auth (CI/CD) | OIDC federation (no long-lived keys) |
| Email | MailerSend SMTP |
| Secret scanning | detect-secrets + custom pre-commit hooks |

## Environments

Single EKS cluster with namespace isolation. All services deployed per-environment — no shared service instances across environments.

| Environment | Namespace | API Domain | Dashboard Domain | Purpose |
|-------------|-----------|-----------|-----------------|---------|
| dev | `clawbrowser-dev` | `api-dev.clawbrowser.ai` | `dev.clawbrowser.ai` | Development and local testing |
| qa | `clawbrowser-qa` | `api-qa.clawbrowser.ai` | `qa.clawbrowser.ai` | Automated + manual verification |
| prod | `clawbrowser-prod` | `api.clawbrowser.ai` | `clawbrowser.ai` | Production |

### Per-Environment Services

Each namespace contains its own instances of:
- clawbrowser-api
- clawbrowser-dashboard
- Unkey
- UniBee
- Traefik IngressRoutes

Traefik and Sealed Secrets controllers are cluster-wide (single instance).

## Repository Structure

```
clawbrowser-infra/
├── terraform/
│   ├── main.tf                        # Provider config, S3 backend
│   ├── vpc.tf                         # VPC, subnets, security groups
│   ├── eks.tf                         # EKS cluster, node groups
│   ├── rds.tf                         # Single RDS instance, 3 databases, 9 users
│   ├── elasticache.tf                 # Single Redis instance
│   ├── iam.tf                         # IAM roles, GitHub Actions OIDC
│   ├── variables.tf
│   ├── outputs.tf
│   ├── terraform.tfvars.example          # Committed — template with placeholder values
│   └── terraform.tfvars                  # .gitignore'd — actual values
├── k8s/
│   ├── base/
│   │   ├── clawbrowser-api/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   ├── configmap.yaml                # Non-secret config (server port, log level, TTLs)
│   │   │   └── kustomization.yaml
│   │   ├── clawbrowser-dashboard/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── kustomization.yaml
│   │   ├── unkey/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── kustomization.yaml
│   │   ├── unibee/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── kustomization.yaml
│   │   └── (no cluster-wide services here — see cluster-wide/)
│   ├── overlays/
│   │   ├── dev/
│   │   │   ├── namespace.yaml
│   │   │   ├── kustomization.yaml
│   │   │   ├── clawbrowser-api/
│   │   │   │   ├── patches/
│   │   │   │   │   ├── resources.yaml
│   │   │   │   │   └── env.yaml
│   │   │   │   └── sealed-secrets/
│   │   │   │       └── secrets.yaml
│   │   │   ├── clawbrowser-dashboard/
│   │   │   │   ├── patches/
│   │   │   │   └── sealed-secrets/
│   │   │   ├── unkey/
│   │   │   │   ├── patches/
│   │   │   │   └── sealed-secrets/
│   │   │   ├── unibee/
│   │   │   │   ├── patches/
│   │   │   │   └── sealed-secrets/
│   │   │   └── traefik/
│   │   │       ├── patches/
│   │   │       └── ingress-routes.yaml
│   │   ├── qa/
│   │   │   └── ... (same structure as dev)
│   │   └── prod/
│   │       └── ... (same structure as dev)
│   └── cluster-wide/
│       ├── traefik/
│       │   ├── deployment.yaml
│       │   ├── service.yaml
│       │   ├── rbac.yaml
│       │   └── kustomization.yaml
│       ├── sealed-secrets-controller/
│       │   ├── deployment.yaml
│       │   └── kustomization.yaml
│       └── kustomization.yaml
├── .github/
│   └── workflows/
│       ├── deploy-api.yaml               # Triggered by clawbrowser-api: deploy image to QA
│       ├── deploy-dashboard.yaml        # Triggered by clawbrowser-dashboard: deploy image to QA
│       ├── deploy-dev.yaml               # Manual dispatch: deploy specific image to dev
│       ├── promote-prod.yaml             # Manual dispatch: promote QA image to prod
│       ├── terraform-apply.yaml          # Plan on PR, apply on merge
│       └── secret-scan.yaml              # Runs detect-secrets + sealed-only checks on PRs
├── .pre-commit-config.yaml
├── .secrets.baseline
└── scripts/
    ├── seal-secret.sh
    ├── check-sealed-only.sh
    └── deploy.sh
```

## CI/CD Pipeline Architecture

### Image Tagging

Format: `v{semver}-{build_number}-{short_sha}`

Example: `clawbrowser-api:v1.2.3-42-abc123f`

- `v1.2.3` — git tag (semantic version)
- `42` — GitHub Actions run number
- `abc123f` — short git commit hash

The same image tag follows through QA → prod. No rebuild on promotion.

### Build Flow (app repo builds, infra repo deploys)

Each app repo builds and pushes its own Docker image, then triggers the infra repo to deploy.

**Build (in app repo, on merge to main):**

```
clawbrowser-api repo (ci.yaml)
─────────────────────
PR merged to main
  → ci.yaml triggers:
      1. Run tests
      2. Build Docker image
      3. Tag: v1.2.3-42-abc123f
      4. Push to Docker Hub
      5. Fire repository_dispatch to clawbrowser-infra
```

Same flow for `clawbrowser-dashboard` (with pnpm install, lint, typecheck, test, generate-types before Docker build).

**Deploy (in infra repo, triggered by app repo):**

```
clawbrowser-api repo                     clawbrowser-infra repo
─────────────────────                    ──────────────────────
repository_dispatch ──────────────────→ deploy-api.yaml triggers:
                                          1. Update QA overlay image tag
                                          2. Deploy to QA namespace
```

Same flow for `clawbrowser-dashboard` via `deploy-dashboard.yaml`.

### Cross-Repo Triggering

App repos fire `repository_dispatch` to `clawbrowser-infra` using a GitHub App token (stored as GitHub Actions secret). Payload:

```json
{
  "event_type": "deploy-api",
  "client_payload": {
    "image_tag": "v1.2.3-42-abc123f"
  }
}
```

For dashboard: `"event_type": "deploy-dashboard"`.

### QA → Prod Promotion (Manual Dispatch)

```
Operator clicks "Run workflow" in GitHub Actions
  → promote-prod.yaml:
      1. Input: image tag (e.g., v1.2.3-42-abc123f)
      2. Verify image exists in Docker Hub
      3. Verify image is currently running in QA
      4. Update prod overlay image tag
      5. Deploy to prod namespace
      6. Commit updated overlay back to infra repo
```

### Terraform Pipeline

```
PR to clawbrowser-infra (terraform/ changes)
  → terraform-apply.yaml:
      1. terraform plan → posts plan as PR comment
      2. On merge → terraform apply
```

### AWS Authentication

GitHub Actions authenticates to AWS via OIDC federation. Terraform provisions the OIDC identity provider and an IAM role that GitHub Actions assumes. No long-lived AWS access keys stored anywhere.

## Networking & Ingress

### DNS Layout

| Environment | API Domain | Dashboard Domain |
|-------------|-----------|-----------------|
| dev | `api-dev.clawbrowser.ai` | `dev.clawbrowser.ai` |
| qa | `api-qa.clawbrowser.ai` | `qa.clawbrowser.ai` |
| prod | `api.clawbrowser.ai` | `clawbrowser.ai` |

All environments use the same routing topology (separate API and dashboard domains) to ensure CORS behavior, cookie domain scope, and TLS certificate handling are consistent across dev, QA, and prod.

### Traefik Configuration

- Single Traefik instance, cluster-wide
- Listens on ports 80 (redirect to 443) and 443
- ACME Let's Encrypt resolver with HTTP-01 challenge
- Separate TLS certificate per domain
- Host-based routing to differentiate environments

### Routing Rules

```
api-dev.clawbrowser.ai
  /v1/*              → clawbrowser-api (clawbrowser-dev namespace)

dev.clawbrowser.ai
  /*                 → clawbrowser-dashboard (clawbrowser-dev namespace)

api-qa.clawbrowser.ai
  /v1/*              → clawbrowser-api (clawbrowser-qa namespace)

qa.clawbrowser.ai
  /*                 → clawbrowser-dashboard (clawbrowser-qa namespace)

api.clawbrowser.ai
  /v1/*              → clawbrowser-api (clawbrowser-prod namespace)

clawbrowser.ai
  /*                 → clawbrowser-dashboard (clawbrowser-prod namespace)
```

### ForwardAuth Middleware

Traefik ForwardAuth validates Auth0 JWTs for dashboard routes. A lightweight auth verification endpoint (on the Go API at `/auth/verify` or a dedicated sidecar) receives forwarded requests and returns:

- `200` + `X-User-Id` header → request proceeds to backend
- `401` → Traefik returns unauthorized

**Applied to:**
- Dashboard authenticated routes (`/dashboard/*`, `/api/v1/me`, `/api/v1/api-keys/*`, `/api/v1/usage/*`, `/api/v1/billing/*`) — ForwardAuth validates Auth0 JWT
- Dashboard public routes (`/`, `/login`, `/signup`, `/_next/*`, `/favicon.ico`, static assets) — **no ForwardAuth**; must be accessible without authentication
- API routes (`/v1/fingerprints/*`, `/v1/proxy/*`) — **no ForwardAuth**; Unkey auth stays in-app because the verification response carries customer identity and usage tracking context
- Webhook routes (`/v1/webhooks/*`) — **no ForwardAuth**; signature verification is payload-dependent, must stay in-app

## Database Architecture

### PostgreSQL (Single RDS Instance)

Three databases with schema-level isolation per service. Each user has access to exactly one schema.

```
RDS Instance
├── clawbrowser_dev
│   ├── schema: clawbrowser_api  ← user: clawbrowser_api_dev
│   ├── schema: unkey            ← user: unkey_dev
│   └── schema: unibee           ← user: unibee_dev
├── clawbrowser_qa
│   ├── schema: clawbrowser_api  ← user: clawbrowser_api_qa
│   ├── schema: unkey            ← user: unkey_qa
│   └── schema: unibee           ← user: unibee_qa
└── clawbrowser_prod
    ├── schema: clawbrowser_api  ← user: clawbrowser_api_prod
    ├── schema: unkey            ← user: unkey_prod
    └── schema: unibee           ← user: unibee_prod
```

User permissions:
```sql
-- Example: clawbrowser_api_qa user
GRANT CONNECT ON DATABASE clawbrowser_qa TO clawbrowser_api_qa;
GRANT USAGE ON SCHEMA clawbrowser_api TO clawbrowser_api_qa;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA clawbrowser_api TO clawbrowser_api_qa;
ALTER DEFAULT PRIVILEGES IN SCHEMA clawbrowser_api GRANT ALL ON TABLES TO clawbrowser_api_qa;
-- No grants on other schemas or databases
```

9 users total, 3 databases, 9 schemas. Terraform provisions all databases, schemas, and users.

### Redis (Single ElastiCache Instance)

Per-service, per-environment database numbers:

| Redis DB | Environment | Service |
|----------|-------------|---------|
| 0 | dev | clawbrowser-api |
| 1 | qa | clawbrowser-api |
| 2 | prod | clawbrowser-api |
| 3 | dev | unkey |
| 4 | qa | unkey |
| 5 | prod | unkey |
| 6 | dev | unibee |
| 7 | qa | unibee |
| 8 | prod | unibee |

**Note:** Redis DB-number isolation provides logical separation but not a security boundary — all DB numbers share a single AUTH credential. This is an accepted risk for the single-cluster setup. If stronger Redis isolation is needed later, move to separate ElastiCache instances per environment.

## Resource Limits

All containers have CPU and memory requests/limits defined in per-environment overlay patches.

### CPU / Memory (requests = limits)

Format: `CPU limit / memory limit`. Requests are set equal to limits for predictable scheduling.

| Service | Dev | QA | Prod |
|---------|-----|----|------|
| clawbrowser-api | 128m CPU / 256Mi | 256m CPU / 512Mi | 500m CPU / 1Gi |
| clawbrowser-dashboard | 128m CPU / 256Mi | 256m CPU / 512Mi | 500m CPU / 1Gi |
| unkey | 128m CPU / 256Mi | 256m CPU / 512Mi | 500m CPU / 1Gi |
| unibee | 128m CPU / 256Mi | 256m CPU / 512Mi | 500m CPU / 1Gi |
| traefik | 128m CPU / 128Mi | 128m CPU / 128Mi | 256m CPU / 256Mi |

### Replica Counts

| Service | Dev | QA | Prod |
|---------|-----|----|------|
| clawbrowser-api | 1 | 1 | 2 |
| clawbrowser-dashboard | 1 | 1 | 2 |
| unkey | 1 | 1 | 2 |
| unibee | 1 | 1 | 1 |
| traefik | 1 | 1 | 2 |

These are starting values. Resource limits and replica counts are tuned per environment via Kustomize overlay patches.

### Health Probes

All deployments define liveness and readiness probes:

| Service | Liveness | Readiness | Initial delay |
|---------|----------|-----------|---------------|
| clawbrowser-api | `GET /healthz` | `GET /readyz` | 5s |
| clawbrowser-dashboard | `GET /` | `GET /` | 10s |
| unkey | Per Unkey docs | Per Unkey docs | 10s |
| unibee | Per UniBee docs | Per UniBee docs | 10s |
| traefik | Built-in ping | Built-in ping | 5s |

Readiness probes gate traffic routing during rolling deployments. Liveness probes restart unhealthy pods.

## Secrets Management

### Sealed Secrets (In-Cluster)

Bitnami Sealed Secrets controller runs cluster-wide. Secrets are encrypted with `kubeseal` using the controller's public key, committed to the infra repo as `SealedSecret` resources, and decrypted at deploy time into regular Kubernetes Secrets within the target namespace.

### Secrets per Service

| Service | Sealed Secrets |
|---------|---------------|
| clawbrowser-api | Postgres URL, Redis URL, Auth0 domain/audience, Unkey root key, UniBee API key, Nodemaven API key, MailerSend SMTP credentials |
| clawbrowser-dashboard | Auth0 client ID/secret, API base URL |
| unkey | Postgres URL, root key |
| unibee | Postgres URL, API key, payment gateway credentials |
| traefik | Let's Encrypt ACME account key (auto-managed) |

### GitHub Actions Secrets

| Secret | Purpose |
|--------|---------|
| AWS OIDC role ARN | Authenticate to AWS/EKS |
| Docker Hub credentials | Push images |
| GitHub App token | Cross-repo `repository_dispatch` |

### Helper Script

```bash
./scripts/seal-secret.sh dev clawbrowser-api db-password "postgres://user:pass@..."
# → writes encrypted SealedSecret to k8s/overlays/dev/clawbrowser-api/sealed-secrets/db-password.yaml
```

## Secret Scanning & Pre-Commit Guards

### Pre-Commit Hooks

`.pre-commit-config.yaml` enforces secret safety on every commit:

1. **Pattern scanner** (`detect-secrets`) — scans for:
   - Connection strings with passwords (`postgres://.*:.*@`)
   - API key prefixes (`sk_live_`, `sk_test_`, `key_`, `apikey_`)
   - AWS access keys (`AKIA...`)
   - Private keys (`-----BEGIN.*PRIVATE KEY-----`)
   - Generic `password=`, `secret=`, `token=` patterns in YAML/env files

2. **File type guard** — blocks commits of:
   - `.env`, `.env.*` files
   - `*.pem`, `*.key` files
   - Any file in `sealed-secrets/` directories that contains `kind: Secret` instead of `kind: SealedSecret`

3. **Custom hook** (`scripts/check-sealed-only.sh`) — validates all files under `sealed-secrets/` directories contain only `kind: SealedSecret`, never plain `kind: Secret`

### CI Enforcement

Same checks run in GitHub Actions on every PR to `clawbrowser-infra`. Even if a developer bypasses local hooks with `--no-verify`, the pipeline catches plaintext secrets before merge.

## Email Configuration

MailerSend SMTP with per-environment sender addresses:

| Environment | Sender Address |
|-------------|---------------|
| dev | `noreply-dev@clawbrowser.ai` |
| qa | `noreply-qa@clawbrowser.ai` |
| prod | `noreply@clawbrowser.ai` |

SMTP credentials stored as Sealed Secrets in each environment's `clawbrowser-api` overlay.

## Terraform — AWS Foundation

### Resources

| Resource | Details |
|----------|---------|
| VPC | Private + public subnets across 2 AZs |
| EKS | Single cluster, managed node group |
| RDS PostgreSQL | Single instance, 3 databases, 9 schemas, 9 users |
| ElastiCache Redis | Single instance, databases 0–8 |
| IAM | OIDC provider for GitHub Actions, EKS service roles |
| S3 | Terraform state bucket |
| Security Groups | RDS and Redis accessible only from EKS node security group |

### State Management

- S3 bucket for Terraform state
- DynamoDB table for state locking (prevents concurrent `terraform apply` corruption)
- Single state file

### RDS Backup

- Automated snapshots enabled, 7-day retention
- Point-in-time recovery enabled
- Terraform configures `backup_retention_period` and `backup_window`

### Network Policy

Kubernetes NetworkPolicy resources in each overlay restrict cross-namespace traffic:

- Pods in `clawbrowser-dev` cannot reach services in `clawbrowser-qa` or `clawbrowser-prod`
- Pods in `clawbrowser-qa` cannot reach services in `clawbrowser-prod`
- Only Traefik (cluster-wide) can ingress into all namespaces

## Deferred Concerns

The following are out of scope for this initial spec but should be addressed as the product matures:

- **Monitoring & observability** — logging (CloudWatch/Fluentd), metrics (Prometheus), alerting
- **Horizontal Pod Autoscaler (HPA)** — auto-scaling based on CPU/memory or custom metrics
- **CDN** — CloudFront or similar for dashboard static assets
