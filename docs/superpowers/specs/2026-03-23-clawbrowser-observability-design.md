# Clawbrowser Backend Observability — Design Specification

## Overview

Logging, metrics, and dashboarding for the clawbrowser-api backend. Covers structured logging, application metrics instrumentation, collection infrastructure, and pre-built Grafana dashboards.

**Related specs:**
- Backend: `docs/superpowers/specs/2026-03-22-clawbrowser-backend-design.md`
- DevOps: `docs/superpowers/specs/2026-03-22-clawbrowser-devops-design.md`

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Structured logging | `slog` (Go stdlib) | JSON logs to stdout |
| Log collection | Fluent Bit (DaemonSet) | Collects pod stdout, forwards to VictoriaLogs |
| Log storage | VictoriaLogs | Full-text search, LogsQL queries |
| App metrics instrumentation | `prometheus/client_golang` | Counters, histograms, gauges at `/metrics` |
| Metrics storage | VictoriaMetrics | Scrapes `/metrics`, stores time-series |
| Dashboards | Grafana | Queries VictoriaMetrics + VictoriaLogs |

## Logging

### Format

JSON lines to stdout. Every log entry includes:

| Field | Description |
|-------|-------------|
| `time` | RFC3339 timestamp |
| `level` | DEBUG, INFO, WARN, ERROR |
| `msg` | Human-readable message |
| `request_id` | Propagated via middleware, correlates all logs for one request |
| `component` | Which layer emitted the log (api, service, provider, store) |

### Request Logs

Emitted by middleware on every request:

| Field | Description |
|-------|-------------|
| `method` | HTTP method |
| `path` | Request path |
| `status` | Response status code |
| `duration_ms` | Request duration in milliseconds |
| `client_ip` | Client IP address |
| `customer_id` | Customer UUID (when authenticated) |
| `customer_email` | Customer email (when authenticated) |

### Audit Logs

Security-relevant events, logged at INFO level so they are always captured:

| Field | Description |
|-------|-------------|
| `event` | Event type (e.g., `api_key.rotated`, `customer.created`, `auth.failed`, `webhook.received`) |
| `customer_id` | Affected customer |
| `actor` | Who triggered the event |

### Error Logs

| Field | Description |
|-------|-------------|
| `error` | Error message |
| `stack` | Stack trace (ERROR level only, not WARN) |

### Log Levels per Environment

| Environment | Level | Notes |
|-------------|-------|-------|
| dev | DEBUG | All logs |
| qa | INFO | No debug noise |
| prod | INFO | Adjustable via K8s configmap without redeploy |

### Configuration

Log level is configured via Viper:

| YAML path | Env var override | Default |
|-----------|-----------------|---------|
| `logging.level` | `CLAWBROWSER_LOGGING__LEVEL` | `info` |

## Metrics

### Application Metrics

Exposed at `/metrics` via `prometheus/client_golang`. This endpoint is unauthenticated but only accessible within the cluster — not exposed via Traefik ingress.

| Metric | Type | Labels | Purpose |
|--------|------|--------|---------|
| `http_requests_total` | Counter | `method`, `path`, `status` | Request rate, error rate |
| `http_request_duration_seconds` | Histogram | `method`, `path` | Latency percentiles (p50, p95, p99) |
| `http_requests_in_flight` | Gauge | — | Current concurrent requests |
| `provider_request_duration_seconds` | Histogram | `provider` (unkey, unibee, nodemaven, auth0, mailersend) | External service latency |
| `provider_errors_total` | Counter | `provider`, `error_type` | External service failures |
| `cache_hits_total` | Counter | — | Redis cache hit rate |
| `cache_misses_total` | Counter | — | Redis cache miss rate |
| `signup_provisioning_retries_total` | Counter | `step` | Retry job activity |

### Infrastructure Metrics

CPU, memory, pod restarts, and other container metrics come from VictoriaMetrics scraping K8s cAdvisor/kubelet. No application code needed.

## Infrastructure — Collection & Storage

### Fluent Bit (DaemonSet, cluster-wide)

- Collects JSON logs from pod stdout via K8s log files
- Adds K8s metadata labels (namespace, pod, container)
- Forwards to VictoriaLogs HTTP ingestion endpoint
- Lightweight (~15MB RAM per node)

### VictoriaLogs (single instance, cluster-wide)

- Receives JSON logs from Fluent Bit
- Full-text search via LogsQL
- Retention: 30 days (configurable per environment)

### VictoriaMetrics (single instance, cluster-wide)

- Scrapes `/metrics` from all pods every 30s
- Scrapes kubelet/cAdvisor for infrastructure metrics
- Retention: 90 days
- Prometheus-compatible — no migration needed if Prometheus-instrumented services are added later

### Grafana (single instance, cluster-wide)

- Two datasources: VictoriaMetrics (metrics) + VictoriaLogs (logs)
- Pre-built dashboards (see Dashboards section below)

### Resource Limits

All observability services are cluster-wide (like Traefik), deployed in the `observability` namespace. Single instance per service — shared across all environments on the single EKS cluster.

| Service | CPU (req=limit) | Memory (req=limit) |
|---------|----------------|-------------------|
| VictoriaMetrics | 500m | 1Gi |
| VictoriaLogs | 500m | 1Gi |
| Grafana | 256m | 512Mi |
| Fluent Bit (per node) | 128m | 128Mi |

## Dashboards

### Metrics Dashboards

**Request Overview:**
- Request rate (requests/sec), error rate (4xx/5xx), latency percentiles (p50, p95, p99)
- Filterable by method, path

**Provider Health:**
- Unkey, UniBee, Nodemaven, Auth0 latency + error rates
- Per-provider breakdown

**Cache Performance:**
- Redis cache hit/miss ratio over time

**Pod Resources:**
- CPU usage, memory usage, pod restarts per service per environment

### Logs Dashboards

**Request Logs:**
- Live request log stream
- Filterable by method, path, status, customer_id, customer_email

**Error Logs:**
- Recent errors with stack traces
- Grouped by component (api, service, provider, store)

**Audit Logs:**
- Security events: auth failures, API key rotations, webhook processing
- Filterable by event type and customer

**Customer Errors:**
- Errors grouped by `customer_email`
- Error count per customer, most recent error
- Filterable by time range

## Deferred Concerns

- **Alerting** — alert rules (error rate thresholds, provider failures, pod restarts) and notification channels (Slack, email). To be addressed in a follow-up spec.
- **PVC sizing** — persistent storage for VictoriaMetrics and VictoriaLogs. Determined during infra implementation based on expected log/metric volume.
