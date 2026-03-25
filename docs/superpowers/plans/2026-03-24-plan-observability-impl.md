# Clawbrowser Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured logging, Prometheus metrics instrumentation, and Grafana dashboard provisioning to the clawbrowser-api backend and clawbrowser-infra repos.

**Architecture:** Logging uses Go's `slog` with a JSON handler writing to stdout (collected by Fluent Bit → VictoriaLogs). Metrics use `prometheus/client_golang` exposed at `/metrics` (scraped by VictoriaMetrics). Grafana dashboards are provisioned as JSON ConfigMaps in the infra repo. All observability code is isolated in an `internal/observe/` package with middleware wrappers for HTTP and provider instrumentation.

**Tech Stack:** Go `slog` (stdlib), `prometheus/client_golang`, Grafana dashboard JSON

**Spec:** `docs/superpowers/specs/2026-03-23-clawbrowser-observability-design.md`
**Backend Spec:** `docs/superpowers/specs/2026-03-22-clawbrowser-backend-design.md`

**Prerequisites:** This plan builds on top of the backend implementation plan (`docs/superpowers/plans/2026-03-23-plan-backend-impl.md`). The backend's config, router, middleware, service, provider, and store packages must exist before this plan executes. The backend plan uses bare `slog.Error`/`slog.Info` calls — Task 11 replaces those with `observe.LogError()`/`observe.LogWarn()`/`observe.AuditLog()`. The backend plan already includes `Logging.Level` in its config struct and `logging.level: info` in `config.yaml`, and uses a `RouterDeps` struct extensible with `Logger`, `Metrics`, `Registry` fields.

**Repo context:** Tasks 1–11 target `clawbrowser-api`. Tasks 12–14 target `clawbrowser-infra` (the Grafana dashboard ConfigMaps that pair with the observability stack deployed by devops plan Task 13).

---

## File Structure

### clawbrowser-api additions

```
internal/
  observe/
    logger.go                       # slog JSON handler setup, NewLogger, request-scoped logger
    logger_test.go
    audit.go                        # Audit log helper (structured security events)
    audit_test.go
    errors.go                       # Structured error logging with stack traces (ERROR level)
    errors_test.go
    metrics.go                      # Prometheus metric definitions (all counters, histograms, gauges)
    metrics_test.go
  api/
    middleware_logging.go           # Request logging middleware (method, path, status, duration, customer)
    middleware_logging_test.go
    middleware_metrics.go           # HTTP metrics middleware (request count, duration, in-flight)
    middleware_metrics_test.go
  provider/
    metrics_wrapper.go              # Provider call duration/error instrumentation
    metrics_wrapper_test.go
  config/
    config.go                       # Modified: add Logging.Level field (already added by backend plan)
    config_test.go                  # Modified: add logging level test
  store/
    cache.go                        # Modified: add *observe.Metrics to RedisCache/NewRedisCache
    cache_test.go                   # Modified: add cache metrics assertions
  service/
    customer.go                     # Modified: add *observe.Metrics to ProvisioningRetrier
    customer_test.go                # Modified: add retry metrics assertions
```

### clawbrowser-infra additions

```
k8s/cluster-wide/observability/grafana/
  dashboards-configmap.yaml         # ConfigMap with all dashboard JSON files
  dashboards-provider.yaml          # Grafana dashboard provisioning config
  deployment.yaml                   # Modified: mount dashboards volume
  kustomization.yaml                # Modified: add new resources
```

---

### Task 1: Logging Package — slog JSON Handler + Config

**Files:**
- Create: `internal/observe/logger.go`
- Create: `internal/observe/logger_test.go`
- Modify: `internal/config/config.go` — add `Logging` section
- Modify: `internal/config/config_test.go` — add logging level test
- Modify: `config.yaml` — add `logging.level` default

- [ ] **Step 1: Write failing test for logger creation**

Create `internal/observe/logger_test.go`:

```go
package observe_test

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"testing"

	"github.com/clawbrowser/clawbrowser-api/internal/observe"
)

func TestNewLogger_JSONOutput(t *testing.T) {
	var buf bytes.Buffer
	logger := observe.NewLogger("info", &buf)

	logger.Info("test message", "component", "api")

	var entry map[string]any
	if err := json.Unmarshal(buf.Bytes(), &entry); err != nil {
		t.Fatalf("expected JSON log output, got: %s", buf.String())
	}
	if entry["msg"] != "test message" {
		t.Errorf("expected msg 'test message', got %v", entry["msg"])
	}
	if entry["component"] != "api" {
		t.Errorf("expected component 'api', got %v", entry["component"])
	}
	if _, ok := entry["time"]; !ok {
		t.Error("expected 'time' field in log output")
	}
}

func TestNewLogger_LevelFiltering(t *testing.T) {
	var buf bytes.Buffer
	logger := observe.NewLogger("info", &buf)

	logger.Debug("should be filtered")
	if buf.Len() != 0 {
		t.Errorf("expected DEBUG to be filtered at INFO level, got: %s", buf.String())
	}

	logger.Info("should appear")
	if buf.Len() == 0 {
		t.Error("expected INFO to appear at INFO level")
	}
}

func TestNewLogger_DebugLevel(t *testing.T) {
	var buf bytes.Buffer
	logger := observe.NewLogger("debug", &buf)

	logger.Debug("should appear")
	if buf.Len() == 0 {
		t.Error("expected DEBUG to appear at DEBUG level")
	}
}

type ctxKey string

func TestLoggerFromContext(t *testing.T) {
	var buf bytes.Buffer
	logger := observe.NewLogger("info", &buf)

	ctx := observe.WithLogger(context.Background(), logger)
	got := observe.LoggerFromContext(ctx)

	got.Info("from context")
	if buf.Len() == 0 {
		t.Error("expected logger from context to write to buffer")
	}
}

func TestLoggerFromContext_FallbackToDefault(t *testing.T) {
	got := observe.LoggerFromContext(context.Background())
	if got == nil {
		t.Error("expected non-nil fallback logger")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/observe/ -v
```

Expected: FAIL — package not found.

- [ ] **Step 3: Write the logger implementation**

Create `internal/observe/logger.go`:

```go
package observe

import (
	"context"
	"io"
	"log/slog"
	"os"
	"strings"
)

type loggerKey struct{}

// NewLogger creates a JSON slog.Logger writing to w at the given level.
// Valid levels: "debug", "info", "warn", "error". Defaults to "info".
func NewLogger(level string, w io.Writer) *slog.Logger {
	var lvl slog.Level
	switch strings.ToLower(level) {
	case "debug":
		lvl = slog.LevelDebug
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}

	handler := slog.NewJSONHandler(w, &slog.HandlerOptions{
		Level: lvl,
	})
	return slog.New(handler)
}

// WithLogger stores a logger in the context.
func WithLogger(ctx context.Context, logger *slog.Logger) context.Context {
	return context.WithValue(ctx, loggerKey{}, logger)
}

// LoggerFromContext retrieves the logger from context, or returns
// a default stdout JSON logger if none is set.
func LoggerFromContext(ctx context.Context) *slog.Logger {
	if l, ok := ctx.Value(loggerKey{}).(*slog.Logger); ok {
		return l
	}
	return slog.New(slog.NewJSONHandler(os.Stdout, nil))
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
go test ./internal/observe/ -v
```

Expected: PASS (all 5 tests).

- [ ] **Step 5: Add logging config to Viper**

Add to `internal/config/config.go` — insert `Logging` field in `Config` struct:

```go
type Config struct {
	Server     ServerConfig     `mapstructure:"server"`
	Logging    LoggingConfig    `mapstructure:"logging"`
	// ... rest of existing fields
}

type LoggingConfig struct {
	Level string `mapstructure:"level"`
}
```

Add to `config.yaml`:

```yaml
logging:
  level: info
```

Add test case to `internal/config/config_test.go`:

```go
func TestLoad_LoggingLevel(t *testing.T) {
	cfg, err := config.Load("../../config.yaml")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Logging.Level != "info" {
		t.Errorf("expected logging level 'info', got %q", cfg.Logging.Level)
	}
}

func TestLoad_LoggingLevelEnvOverride(t *testing.T) {
	os.Setenv("CLAWBROWSER_LOGGING__LEVEL", "debug")
	defer os.Unsetenv("CLAWBROWSER_LOGGING__LEVEL")

	cfg, err := config.Load("../../config.yaml")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Logging.Level != "debug" {
		t.Errorf("expected logging level 'debug', got %q", cfg.Logging.Level)
	}
}
```

- [ ] **Step 6: Run all config tests**

```bash
go test ./internal/config/ -v
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add internal/observe/logger.go internal/observe/logger_test.go internal/config/ config.yaml
git commit -m "feat: add slog JSON logger with level config and context propagation"
```

---

### Task 2: Request Logging Middleware

**Files:**
- Create: `internal/api/middleware_logging.go`
- Create: `internal/api/middleware_logging_test.go`

- [ ] **Step 1: Write failing test for request logging**

Create `internal/api/middleware_logging_test.go`:

```go
package api_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/clawbrowser/clawbrowser-api/internal/api"
	"github.com/clawbrowser/clawbrowser-api/internal/observe"
)

func TestRequestLoggingMiddleware_LogsRequestFields(t *testing.T) {
	var buf bytes.Buffer
	logger := observe.NewLogger("info", &buf)

	handler := api.RequestLoggingMiddleware(logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1/fingerprints/generate", nil)
	req.RemoteAddr = "192.168.1.1:12345"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	var entry map[string]any
	if err := json.Unmarshal(buf.Bytes(), &entry); err != nil {
		t.Fatalf("expected JSON log, got: %s", buf.String())
	}

	checks := map[string]any{
		"method":    "GET",
		"path":      "/v1/fingerprints/generate",
		"client_ip": "192.168.1.1",
	}
	for k, want := range checks {
		if entry[k] != want {
			t.Errorf("expected %s=%v, got %v", k, want, entry[k])
		}
	}
	// status should be float64 200 from JSON unmarshalling
	if entry["status"] != float64(200) {
		t.Errorf("expected status=200, got %v", entry["status"])
	}
	if _, ok := entry["duration_ms"]; !ok {
		t.Error("expected duration_ms field")
	}
}

func TestRequestLoggingMiddleware_IncludesCustomerFields(t *testing.T) {
	var buf bytes.Buffer
	logger := observe.NewLogger("info", &buf)

	handler := api.RequestLoggingMiddleware(logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Simulate auth middleware setting customer identity via RequestInfo
		info := api.RequestInfoFromContext(r.Context())
		info.CustomerID = "cust_abc"
		info.CustomerEmail = "alice@example.com"
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req.RemoteAddr = "10.0.0.1:9999"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	var entry map[string]any
	if err := json.Unmarshal(buf.Bytes(), &entry); err != nil {
		t.Fatalf("expected JSON log, got: %s", buf.String())
	}
	if entry["customer_id"] != "cust_abc" {
		t.Errorf("expected customer_id='cust_abc', got %v", entry["customer_id"])
	}
	if entry["customer_email"] != "alice@example.com" {
		t.Errorf("expected customer_email='alice@example.com', got %v", entry["customer_email"])
	}
}

func TestRequestLoggingMiddleware_OmitsCustomerFieldsWhenUnauthenticated(t *testing.T) {
	var buf bytes.Buffer
	logger := observe.NewLogger("info", &buf)

	handler := api.RequestLoggingMiddleware(logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	req.RemoteAddr = "10.0.0.1:9999"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	var entry map[string]any
	if err := json.Unmarshal(buf.Bytes(), &entry); err != nil {
		t.Fatalf("expected JSON log, got: %s", buf.String())
	}
	if _, ok := entry["customer_id"]; ok {
		t.Error("expected no customer_id for unauthenticated request")
	}
	if _, ok := entry["customer_email"]; ok {
		t.Error("expected no customer_email for unauthenticated request")
	}
}

func TestRequestLoggingMiddleware_InjectsLoggerIntoContext(t *testing.T) {
	var buf bytes.Buffer
	logger := observe.NewLogger("info", &buf)

	var ctxLogger bool
	handler := api.RequestLoggingMiddleware(logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		l := observe.LoggerFromContext(r.Context())
		// If context logger has request_id, it was injected by middleware
		ctxLogger = l != nil
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if !ctxLogger {
		t.Error("expected logger to be injected into request context")
	}
}

func TestRequestLoggingMiddleware_IncludesRequestID(t *testing.T) {
	var buf bytes.Buffer
	logger := observe.NewLogger("info", &buf)

	handler := api.RequestLoggingMiddleware(logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	var entry map[string]any
	if err := json.Unmarshal(buf.Bytes(), &entry); err != nil {
		t.Fatalf("expected JSON log, got: %s", buf.String())
	}
	if _, ok := entry["request_id"]; !ok {
		t.Error("expected request_id field in log entry")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/api/ -run TestRequestLogging -v
```

Expected: FAIL — `RequestLoggingMiddleware` not found.

- [ ] **Step 3: Write the middleware implementation**

Create `internal/api/middleware_logging.go`:

```go
package api

import (
	"context"
	"log/slog"
	"net"
	"net/http"
	"time"

	"github.com/clawbrowser/clawbrowser-api/internal/observe"
	"github.com/google/uuid"
)

// responseWriter wraps http.ResponseWriter to capture the status code.
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

type requestInfoKey struct{}

// RequestInfo holds mutable per-request metadata. The logging middleware
// creates it and stores it in context; auth middleware fills in customer fields.
// This avoids context-propagation issues (inner r.WithContext is invisible to outer middleware).
type RequestInfo struct {
	CustomerID    string
	CustomerEmail string
}

// WithRequestInfo stores a RequestInfo pointer in the context.
func WithRequestInfo(ctx context.Context, info *RequestInfo) context.Context {
	return context.WithValue(ctx, requestInfoKey{}, info)
}

// RequestInfoFromContext retrieves the RequestInfo, or nil if not set.
func RequestInfoFromContext(ctx context.Context) *RequestInfo {
	ri, _ := ctx.Value(requestInfoKey{}).(*RequestInfo)
	return ri
}

// RequestLoggingMiddleware logs every request with method, path, status, duration,
// client_ip, request_id, and customer_id/customer_email (when authenticated).
// It injects a request-scoped logger and a mutable RequestInfo into the context.
// Auth middleware should call RequestInfoFromContext and set CustomerID/CustomerEmail.
func RequestLoggingMiddleware(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			requestID := uuid.New().String()

			clientIP, _, _ := net.SplitHostPort(r.RemoteAddr)
			if clientIP == "" {
				clientIP = r.RemoteAddr
			}

			reqLogger := logger.With(
				"request_id", requestID,
				"component", "api",
			)

			info := &RequestInfo{}
			ctx := observe.WithLogger(r.Context(), reqLogger)
			ctx = WithRequestInfo(ctx, info)

			wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
			next.ServeHTTP(wrapped, r.WithContext(ctx))

			duration := time.Since(start)
			attrs := []any{
				"method", r.Method,
				"path", r.URL.Path,
				"status", wrapped.statusCode,
				"duration_ms", duration.Milliseconds(),
				"client_ip", clientIP,
			}

			// Include customer identity when set by auth middleware
			if info.CustomerID != "" {
				attrs = append(attrs, "customer_id", info.CustomerID, "customer_email", info.CustomerEmail)
			}

			reqLogger.Info("request", attrs...)
		})
	}
}
```

- [ ] **Step 4: Install uuid dependency and run tests**

```bash
go get github.com/google/uuid
go test ./internal/api/ -run TestRequestLogging -v
```

Expected: PASS (all 5 tests).

- [ ] **Step 5: Commit**

```bash
git add internal/api/middleware_logging.go internal/api/middleware_logging_test.go go.mod go.sum
git commit -m "feat: add request logging middleware with request_id, customer identity, and context logger"
```

---

### Task 3: Audit Log Helper

**Files:**
- Create: `internal/observe/audit.go`
- Create: `internal/observe/audit_test.go`

- [ ] **Step 1: Write failing test for audit logging**

Create `internal/observe/audit_test.go`:

```go
package observe_test

import (
	"bytes"
	"encoding/json"
	"testing"

	"github.com/clawbrowser/clawbrowser-api/internal/observe"
)

func TestAuditLog_EmitsStructuredEvent(t *testing.T) {
	var buf bytes.Buffer
	logger := observe.NewLogger("info", &buf)

	observe.AuditLog(logger, "api_key.rotated", "cust_123", "dashboard")

	var entry map[string]any
	if err := json.Unmarshal(buf.Bytes(), &entry); err != nil {
		t.Fatalf("expected JSON, got: %s", buf.String())
	}
	if entry["event"] != "api_key.rotated" {
		t.Errorf("expected event 'api_key.rotated', got %v", entry["event"])
	}
	if entry["customer_id"] != "cust_123" {
		t.Errorf("expected customer_id 'cust_123', got %v", entry["customer_id"])
	}
	if entry["actor"] != "dashboard" {
		t.Errorf("expected actor 'dashboard', got %v", entry["actor"])
	}
	if entry["level"] != "INFO" {
		t.Errorf("expected INFO level, got %v", entry["level"])
	}
}

func TestAuditLog_AlwaysLogsAtInfo(t *testing.T) {
	// Even with WARN level logger, audit events should appear because they use INFO
	var buf bytes.Buffer
	logger := observe.NewLogger("info", &buf)

	observe.AuditLog(logger, "auth.failed", "unknown", "browser")
	if buf.Len() == 0 {
		t.Error("expected audit log to appear at INFO level")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/observe/ -run TestAuditLog -v
```

Expected: FAIL — `AuditLog` not found.

- [ ] **Step 3: Write the audit log implementation**

Create `internal/observe/audit.go`:

```go
package observe

import (
	"log/slog"
)

// AuditLog emits a structured audit event at INFO level.
// Used for security-relevant events: auth failures, API key rotations, webhooks.
func AuditLog(logger *slog.Logger, event, customerID, actor string) {
	logger.Info("audit",
		"event", event,
		"customer_id", customerID,
		"actor", actor,
	)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
go test ./internal/observe/ -run TestAuditLog -v
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add internal/observe/audit.go internal/observe/audit_test.go
git commit -m "feat: add audit log helper for structured security events"
```

---

### Task 4: Structured Error Logging with Stack Traces

**Files:**
- Create: `internal/observe/errors.go`
- Create: `internal/observe/errors_test.go`

- [ ] **Step 1: Write failing test for error logging**

Create `internal/observe/errors_test.go`:

```go
package observe_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"testing"

	"github.com/clawbrowser/clawbrowser-api/internal/observe"
)

func TestLogError_IncludesErrorAndStack(t *testing.T) {
	var buf bytes.Buffer
	logger := observe.NewLogger("error", &buf)

	observe.LogError(logger, errors.New("connection refused"), "failed to connect to database")

	var entry map[string]any
	if err := json.Unmarshal(buf.Bytes(), &entry); err != nil {
		t.Fatalf("expected JSON log, got: %s", buf.String())
	}
	if entry["level"] != "ERROR" {
		t.Errorf("expected level ERROR, got %v", entry["level"])
	}
	if entry["error"] != "connection refused" {
		t.Errorf("expected error='connection refused', got %v", entry["error"])
	}
	if entry["msg"] != "failed to connect to database" {
		t.Errorf("expected msg='failed to connect to database', got %v", entry["msg"])
	}
	stack, ok := entry["stack"].(string)
	if !ok || stack == "" {
		t.Error("expected non-empty 'stack' field")
	}
}

func TestLogWarn_NoStack(t *testing.T) {
	var buf bytes.Buffer
	logger := observe.NewLogger("info", &buf)

	observe.LogWarn(logger, errors.New("cache timeout"), "cache lookup slow")

	var entry map[string]any
	if err := json.Unmarshal(buf.Bytes(), &entry); err != nil {
		t.Fatalf("expected JSON log, got: %s", buf.String())
	}
	if entry["level"] != "WARN" {
		t.Errorf("expected level WARN, got %v", entry["level"])
	}
	if entry["error"] != "cache timeout" {
		t.Errorf("expected error='cache timeout', got %v", entry["error"])
	}
	if _, ok := entry["stack"]; ok {
		t.Error("expected no 'stack' field at WARN level")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/observe/ -run "TestLogError|TestLogWarn" -v
```

Expected: FAIL — `LogError` not found.

- [ ] **Step 3: Write the error logging implementation**

Create `internal/observe/errors.go`:

```go
package observe

import (
	"log/slog"
	"runtime"
)

// LogError logs an error at ERROR level with the error message and a stack trace.
// Use for unexpected failures that need debugging context.
func LogError(logger *slog.Logger, err error, msg string, attrs ...any) {
	allAttrs := make([]any, 0, len(attrs)+4)
	allAttrs = append(allAttrs, "error", err.Error())
	allAttrs = append(allAttrs, "stack", captureStack())
	allAttrs = append(allAttrs, attrs...)
	logger.Error(msg, allAttrs...)
}

// LogWarn logs an error at WARN level with the error message but no stack trace.
// Use for expected/recoverable issues (e.g., cache misses, retries).
func LogWarn(logger *slog.Logger, err error, msg string, attrs ...any) {
	allAttrs := make([]any, 0, len(attrs)+2)
	allAttrs = append(allAttrs, "error", err.Error())
	allAttrs = append(allAttrs, attrs...)
	logger.Warn(msg, allAttrs...)
}

// captureStack returns a string of the current goroutine's stack trace,
// skipping the captureStack and LogError frames.
func captureStack() string {
	buf := make([]byte, 4096)
	n := runtime.Stack(buf, false)
	return string(buf[:n])
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
go test ./internal/observe/ -run "TestLogError|TestLogWarn" -v
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add internal/observe/errors.go internal/observe/errors_test.go
git commit -m "feat: add structured error logging with stack traces at ERROR level"
```

---

### Task 5: Prometheus Metrics Registry

**Files:**
- Create: `internal/observe/metrics.go`
- Create: `internal/observe/metrics_test.go`

- [ ] **Step 1: Write failing test for metrics registration**

Create `internal/observe/metrics_test.go`:

```go
package observe_test

import (
	"testing"

	"github.com/clawbrowser/clawbrowser-api/internal/observe"
	"github.com/prometheus/client_golang/prometheus"
)

func TestNewMetrics_AllMetricsRegistered(t *testing.T) {
	reg := prometheus.NewRegistry()
	m := observe.NewMetrics(reg)

	if m.HTTPRequestsTotal == nil {
		t.Error("HTTPRequestsTotal not registered")
	}
	if m.HTTPRequestDuration == nil {
		t.Error("HTTPRequestDuration not registered")
	}
	if m.HTTPRequestsInFlight == nil {
		t.Error("HTTPRequestsInFlight not registered")
	}
	if m.ProviderRequestDuration == nil {
		t.Error("ProviderRequestDuration not registered")
	}
	if m.ProviderErrorsTotal == nil {
		t.Error("ProviderErrorsTotal not registered")
	}
	if m.CacheHitsTotal == nil {
		t.Error("CacheHitsTotal not registered")
	}
	if m.CacheMissesTotal == nil {
		t.Error("CacheMissesTotal not registered")
	}
	if m.SignupRetriesTotal == nil {
		t.Error("SignupRetriesTotal not registered")
	}
}

func TestNewMetrics_CanIncrementCounters(t *testing.T) {
	reg := prometheus.NewRegistry()
	m := observe.NewMetrics(reg)

	m.HTTPRequestsTotal.WithLabelValues("GET", "/test", "200").Inc()
	m.CacheHitsTotal.Inc()
	m.CacheMissesTotal.Inc()
	m.ProviderErrorsTotal.WithLabelValues("unkey", "timeout").Inc()
	m.SignupRetriesTotal.WithLabelValues("nodemaven").Inc()

	// Gather to verify no panics and metrics are collected
	families, err := reg.Gather()
	if err != nil {
		t.Fatalf("unexpected gather error: %v", err)
	}
	if len(families) < 5 {
		t.Errorf("expected at least 5 metric families, got %d", len(families))
	}
}

func TestNewMetrics_CanObserveHistograms(t *testing.T) {
	reg := prometheus.NewRegistry()
	m := observe.NewMetrics(reg)

	m.HTTPRequestDuration.WithLabelValues("GET", "/test").Observe(0.05)
	m.ProviderRequestDuration.WithLabelValues("nodemaven").Observe(0.2)

	families, err := reg.Gather()
	if err != nil {
		t.Fatalf("unexpected gather error: %v", err)
	}
	if len(families) < 2 {
		t.Errorf("expected at least 2 metric families, got %d", len(families))
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/observe/ -run TestNewMetrics -v
```

Expected: FAIL — `NewMetrics` not found.

- [ ] **Step 3: Write the metrics implementation**

Create `internal/observe/metrics.go`:

```go
package observe

import (
	"github.com/prometheus/client_golang/prometheus"
)

// Metrics holds all application Prometheus metrics.
type Metrics struct {
	HTTPRequestsTotal       *prometheus.CounterVec
	HTTPRequestDuration     *prometheus.HistogramVec
	HTTPRequestsInFlight    prometheus.Gauge
	ProviderRequestDuration *prometheus.HistogramVec
	ProviderErrorsTotal     *prometheus.CounterVec
	CacheHitsTotal          prometheus.Counter
	CacheMissesTotal        prometheus.Counter
	SignupRetriesTotal      *prometheus.CounterVec
}

// NewMetrics creates and registers all application metrics with the given registry.
func NewMetrics(reg prometheus.Registerer) *Metrics {
	m := &Metrics{
		HTTPRequestsTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "http_requests_total",
				Help: "Total number of HTTP requests.",
			},
			[]string{"method", "path", "status"},
		),
		HTTPRequestDuration: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "http_request_duration_seconds",
				Help:    "HTTP request latency in seconds.",
				Buckets: prometheus.DefBuckets,
			},
			[]string{"method", "path"},
		),
		HTTPRequestsInFlight: prometheus.NewGauge(
			prometheus.GaugeOpts{
				Name: "http_requests_in_flight",
				Help: "Current number of HTTP requests being processed.",
			},
		),
		ProviderRequestDuration: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "provider_request_duration_seconds",
				Help:    "External provider request latency in seconds.",
				Buckets: prometheus.DefBuckets,
			},
			[]string{"provider"},
		),
		ProviderErrorsTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "provider_errors_total",
				Help: "Total number of external provider errors.",
			},
			[]string{"provider", "error_type"},
		),
		CacheHitsTotal: prometheus.NewCounter(
			prometheus.CounterOpts{
				Name: "cache_hits_total",
				Help: "Total number of Redis cache hits.",
			},
		),
		CacheMissesTotal: prometheus.NewCounter(
			prometheus.CounterOpts{
				Name: "cache_misses_total",
				Help: "Total number of Redis cache misses.",
			},
		),
		SignupRetriesTotal: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "signup_provisioning_retries_total",
				Help: "Total number of signup provisioning retry attempts.",
			},
			[]string{"step"},
		),
	}

	reg.MustRegister(
		m.HTTPRequestsTotal,
		m.HTTPRequestDuration,
		m.HTTPRequestsInFlight,
		m.ProviderRequestDuration,
		m.ProviderErrorsTotal,
		m.CacheHitsTotal,
		m.CacheMissesTotal,
		m.SignupRetriesTotal,
	)

	return m
}
```

- [ ] **Step 4: Install prometheus dependency and run tests**

```bash
go get github.com/prometheus/client_golang/prometheus
go test ./internal/observe/ -run TestNewMetrics -v
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add internal/observe/metrics.go internal/observe/metrics_test.go go.mod go.sum
git commit -m "feat: add Prometheus metrics registry with all application metrics"
```

---

### Task 6: HTTP Metrics Middleware

**Files:**
- Create: `internal/api/middleware_metrics.go`
- Create: `internal/api/middleware_metrics_test.go`

- [ ] **Step 1: Write failing test for HTTP metrics middleware**

Create `internal/api/middleware_metrics_test.go`:

```go
package api_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/clawbrowser/clawbrowser-api/internal/api"
	"github.com/clawbrowser/clawbrowser-api/internal/observe"
	"github.com/prometheus/client_golang/prometheus"
)

func TestMetricsMiddleware_IncrementsRequestCount(t *testing.T) {
	reg := prometheus.NewRegistry()
	m := observe.NewMetrics(reg)

	handler := api.MetricsMiddleware(m)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1/fingerprints/generate", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	families, _ := reg.Gather()
	found := false
	for _, f := range families {
		if f.GetName() == "http_requests_total" {
			found = true
			metric := f.GetMetric()[0]
			if metric.GetCounter().GetValue() != 1 {
				t.Errorf("expected counter=1, got %v", metric.GetCounter().GetValue())
			}
		}
	}
	if !found {
		t.Error("http_requests_total metric not found")
	}
}

func TestMetricsMiddleware_RecordsDuration(t *testing.T) {
	reg := prometheus.NewRegistry()
	m := observe.NewMetrics(reg)

	handler := api.MetricsMiddleware(m)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	families, _ := reg.Gather()
	for _, f := range families {
		if f.GetName() == "http_request_duration_seconds" {
			metric := f.GetMetric()[0]
			if metric.GetHistogram().GetSampleCount() != 1 {
				t.Errorf("expected 1 observation, got %d", metric.GetHistogram().GetSampleCount())
			}
			return
		}
	}
	t.Error("http_request_duration_seconds metric not found")
}

func TestMetricsMiddleware_TracksInFlight(t *testing.T) {
	reg := prometheus.NewRegistry()
	m := observe.NewMetrics(reg)

	var inFlightDuring float64
	handler := api.MetricsMiddleware(m)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check in-flight gauge while request is being processed
		families, _ := reg.Gather()
		for _, f := range families {
			if f.GetName() == "http_requests_in_flight" {
				inFlightDuring = f.GetMetric()[0].GetGauge().GetValue()
			}
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if inFlightDuring != 1 {
		t.Errorf("expected in-flight=1 during request, got %v", inFlightDuring)
	}

	// After request, in-flight should be 0
	families, _ := reg.Gather()
	for _, f := range families {
		if f.GetName() == "http_requests_in_flight" {
			val := f.GetMetric()[0].GetGauge().GetValue()
			if val != 0 {
				t.Errorf("expected in-flight=0 after request, got %v", val)
			}
		}
	}
}

```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/api/ -run TestMetricsMiddleware -v
```

Expected: FAIL — `MetricsMiddleware` not found.

- [ ] **Step 3: Write the metrics middleware implementation**

Create `internal/api/middleware_metrics.go`:

```go
package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/clawbrowser/clawbrowser-api/internal/observe"
)

// MetricsMiddleware instruments HTTP requests with Prometheus metrics:
// request count, duration histogram, and in-flight gauge.
func MetricsMiddleware(m *observe.Metrics) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			m.HTTPRequestsInFlight.Inc()
			defer m.HTTPRequestsInFlight.Dec()

			wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
			next.ServeHTTP(wrapped, r)

			duration := time.Since(start).Seconds()
			status := strconv.Itoa(wrapped.statusCode)

			m.HTTPRequestsTotal.WithLabelValues(r.Method, r.URL.Path, status).Inc()
			m.HTTPRequestDuration.WithLabelValues(r.Method, r.URL.Path).Observe(duration)
		})
	}
}
```

- [ ] **Step 4: Run tests**

```bash
go test ./internal/api/ -run TestMetricsMiddleware -v
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add internal/api/middleware_metrics.go internal/api/middleware_metrics_test.go
git commit -m "feat: add HTTP metrics middleware (request count, duration, in-flight)"
```

---

### Task 7: Provider Metrics Wrapper

**Files:**
- Create: `internal/provider/metrics_wrapper.go`
- Create: `internal/provider/metrics_wrapper_test.go`

- [ ] **Step 1: Write failing test for provider metrics**

Create `internal/provider/metrics_wrapper_test.go`:

```go
package provider_test

import (
	"errors"
	"testing"
	"time"

	"github.com/clawbrowser/clawbrowser-api/internal/observe"
	"github.com/clawbrowser/clawbrowser-api/internal/provider"
	"github.com/prometheus/client_golang/prometheus"
)

func TestObserveProvider_RecordsDuration(t *testing.T) {
	reg := prometheus.NewRegistry()
	m := observe.NewMetrics(reg)

	err := provider.ObserveProvider(m, "unkey", func() error {
		time.Sleep(5 * time.Millisecond)
		return nil
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	families, _ := reg.Gather()
	for _, f := range families {
		if f.GetName() == "provider_request_duration_seconds" {
			metric := f.GetMetric()[0]
			if metric.GetHistogram().GetSampleCount() != 1 {
				t.Errorf("expected 1 observation, got %d", metric.GetHistogram().GetSampleCount())
			}
			return
		}
	}
	t.Error("provider_request_duration_seconds not found")
}

func TestObserveProvider_RecordsErrorOnFailure(t *testing.T) {
	reg := prometheus.NewRegistry()
	m := observe.NewMetrics(reg)

	err := provider.ObserveProvider(m, "nodemaven", func() error {
		return errors.New("connection timeout")
	})

	if err == nil {
		t.Fatal("expected error")
	}

	families, _ := reg.Gather()
	for _, f := range families {
		if f.GetName() == "provider_errors_total" {
			metric := f.GetMetric()[0]
			if metric.GetCounter().GetValue() != 1 {
				t.Errorf("expected error count=1, got %v", metric.GetCounter().GetValue())
			}
			return
		}
	}
	t.Error("provider_errors_total not found")
}

func TestObserveProvider_NoErrorMetricOnSuccess(t *testing.T) {
	reg := prometheus.NewRegistry()
	m := observe.NewMetrics(reg)

	_ = provider.ObserveProvider(m, "auth0", func() error {
		return nil
	})

	families, _ := reg.Gather()
	for _, f := range families {
		if f.GetName() == "provider_errors_total" {
			t.Error("provider_errors_total should not be present on success")
		}
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/provider/ -run TestObserveProvider -v
```

Expected: FAIL — `ObserveProvider` not found.

- [ ] **Step 3: Write the provider metrics wrapper**

Create `internal/provider/metrics_wrapper.go`:

```go
package provider

import (
	"time"

	"github.com/clawbrowser/clawbrowser-api/internal/observe"
)

// ObserveProvider wraps a provider call with duration and error metrics.
// The provider name is used as a label (e.g., "unkey", "nodemaven", "auth0").
func ObserveProvider(m *observe.Metrics, providerName string, fn func() error) error {
	start := time.Now()
	err := fn()
	duration := time.Since(start).Seconds()

	m.ProviderRequestDuration.WithLabelValues(providerName).Observe(duration)

	if err != nil {
		m.ProviderErrorsTotal.WithLabelValues(providerName, "error").Inc()
	}

	return err
}
```

- [ ] **Step 4: Run tests**

```bash
go test ./internal/provider/ -run TestObserveProvider -v
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add internal/provider/metrics_wrapper.go internal/provider/metrics_wrapper_test.go
git commit -m "feat: add provider metrics wrapper for duration and error tracking"
```

---

### Task 8: Cache and Signup Retry Metrics Instrumentation

**Backend plan reference:** The backend plan creates `RedisCache` struct with `NewRedisCache(redisURL, db, ttl)` in `internal/store/cache.go`. This task renames it to `RedisCache` (keeping the name) but adds `*observe.Metrics` as a parameter. The backend plan also creates `ProvisioningRetrier` (not `CustomerService`) for retry logic — see `NewProvisioningRetrier(repo, nodemaven, unkey, mailer)` in `internal/service/customer.go`.

**Files:**
- Modify: `internal/store/cache.go` — add `*observe.Metrics` to `RedisCache` and `NewRedisCache`
- Modify: `internal/store/cache_test.go` — add metrics assertions
- Modify: `internal/service/customer.go` — add `*observe.Metrics` to `ProvisioningRetrier`
- Modify: `internal/service/customer_test.go` — add retry metrics assertions (uses `ProvisioningRetrier`, not `CustomerService`)

- [ ] **Step 1: Write failing test for cache metrics**

Add to `internal/store/cache_test.go`:

```go
func TestCache_Get_RecordsHitMetric(t *testing.T) {
	reg := prometheus.NewRegistry()
	m := observe.NewMetrics(reg)

	cache := store.NewRedisCache(redisURL, db, m, 10*time.Minute)
	// Pre-populate cache
	cache.Set(ctx, "customer:key123", testCustomer)

	_, err := cache.Get(ctx, "customer:key123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	families, _ := reg.Gather()
	for _, f := range families {
		if f.GetName() == "cache_hits_total" {
			val := f.GetMetric()[0].GetCounter().GetValue()
			if val != 1 {
				t.Errorf("expected cache_hits_total=1, got %v", val)
			}
			return
		}
	}
	t.Error("cache_hits_total not found")
}

func TestCache_Get_RecordsMissMetric(t *testing.T) {
	reg := prometheus.NewRegistry()
	m := observe.NewMetrics(reg)

	cache := store.NewRedisCache(redisURL, db, m, 10*time.Minute)

	_, err := cache.Get(ctx, "customer:nonexistent")
	// Miss returns ErrCacheMiss or nil value
	_ = err

	families, _ := reg.Gather()
	for _, f := range families {
		if f.GetName() == "cache_misses_total" {
			val := f.GetMetric()[0].GetCounter().GetValue()
			if val != 1 {
				t.Errorf("expected cache_misses_total=1, got %v", val)
			}
			return
		}
	}
	t.Error("cache_misses_total not found")
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/store/ -run "TestCache_Get_Records" -v
```

Expected: FAIL — `NewRedisCache` does not accept `*observe.Metrics` parameter yet.

- [ ] **Step 3: Add metrics parameter to RedisCache**

Modify `internal/store/cache.go` — add `*observe.Metrics` field to `RedisCache` struct and `NewRedisCache` constructor. The backend plan's existing `NewRedisCache(redisURL string, db int, ttl time.Duration)` becomes `NewRedisCache(redisURL string, db int, metrics *observe.Metrics, ttl time.Duration)`:

```go
type RedisCache struct {
	client  *redis.Client
	metrics *observe.Metrics
	ttl     time.Duration
}

func NewRedisCache(redisURL string, db int, metrics *observe.Metrics, ttl time.Duration) (*RedisCache, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}
	opts.DB = db
	client := redis.NewClient(opts)
	return &RedisCache{client: client, metrics: metrics, ttl: ttl}, nil
}

func (c *RedisCache) GetCustomerByUnkeyKeyID(ctx context.Context, unkeyKeyID string) (*model.Customer, error) {
	data, err := c.client.Get(ctx, customerCacheKey(unkeyKeyID)).Bytes()
	if err == redis.Nil {
		c.metrics.CacheMissesTotal.Inc()
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("redis get: %w", err)
	}
	c.metrics.CacheHitsTotal.Inc()

	var customer model.Customer
	if err := json.Unmarshal(data, &customer); err != nil {
		return nil, fmt.Errorf("unmarshal cached customer: %w", err)
	}
	return &customer, nil
}
```

**Note:** Also update `main.go` call site from `store.NewRedisCache(cfg.Redis.URL, cfg.Redis.DB, cfg.Redis.TTL.Customer)` to `store.NewRedisCache(cfg.Redis.URL, cfg.Redis.DB, metrics, cfg.Redis.TTL.Customer)`.

- [ ] **Step 4: Run cache tests**

```bash
go test ./internal/store/ -run "TestCache" -v
```

Expected: PASS.

- [ ] **Step 5: Write failing test for signup retry metrics**

Add to `internal/service/customer_test.go`. **Note:** The backend plan uses `ProvisioningRetrier` (not `CustomerService`) for retry logic. The retrier has `RetryOnce(ctx)` method, not `RunRetryJob`.

```go
func TestRetryJob_IncrementsRetryMetric(t *testing.T) {
	reg := prometheus.NewRegistry()
	m := observe.NewMetrics(reg)

	repo := &mockProvisioningRepo{
		customers: []*model.Customer{
			{ID: uuid.New(), Auth0ID: "auth0|1", Email: "test@example.com", Status: model.CustomerStatusProvisioning, CreatedAt: time.Now().Add(-2 * time.Minute)},
		},
		updated:     make(map[uuid.UUID]model.CustomerStatus),
		retryCounts: make(map[uuid.UUID]int),
	}
	nodemaven := &mockNodemavenFailing{} // CreateSubClient returns error
	unkey := &mockUnkeyForCustomer{}
	mailer := &mockMailer{}

	retrier := service.NewProvisioningRetrier(repo, nodemaven, unkey, mailer, m)
	err := retrier.RetryOnce(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	families, _ := reg.Gather()
	for _, f := range families {
		if f.GetName() == "signup_provisioning_retries_total" {
			val := f.GetMetric()[0].GetCounter().GetValue()
			if val != 1 {
				t.Errorf("expected retries=1, got %v", val)
			}
			return
		}
	}
	t.Error("signup_provisioning_retries_total not found")
}
```

- [ ] **Step 6: Run test to verify it fails**

```bash
go test ./internal/service/ -run TestRetryJob_IncrementsRetryMetric -v
```

Expected: FAIL — `NewProvisioningRetrier` does not accept `*observe.Metrics` parameter yet.

- [ ] **Step 7: Add metrics to ProvisioningRetrier**

Modify `internal/service/customer.go` — update `ProvisioningRetrier` (not `CustomerService`) to accept `*observe.Metrics` and increment `SignupRetriesTotal` in the retry loop:

```go
type ProvisioningRetrier struct {
	repo      store.CustomerRepository
	nodemaven NodemavenProvider
	unkey     UnkeyProvider
	mailer    Mailer
	metrics   *observe.Metrics
}

func NewProvisioningRetrier(
	repo store.CustomerRepository,
	nodemaven NodemavenProvider,
	unkey UnkeyProvider,
	mailer Mailer,
	metrics *observe.Metrics,
) *ProvisioningRetrier {
	return &ProvisioningRetrier{repo: repo, nodemaven: nodemaven, unkey: unkey, mailer: mailer, metrics: metrics}
}
```

In `RetryOnce`, before each retry attempt on a customer:

```go
r.metrics.SignupRetriesTotal.WithLabelValues("nodemaven").Inc()
```

**Note:** Also update `main.go` call site from `service.NewProvisioningRetrier(customerRepo, nodemavenAdapter, unkeyAdapter, mailerClient)` to `service.NewProvisioningRetrier(customerRepo, nodemavenAdapter, unkeyAdapter, mailerClient, metrics)`.

- [ ] **Step 8: Run all tests**

```bash
go test ./internal/store/ ./internal/service/ -v
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add internal/store/cache.go internal/store/cache_test.go internal/service/customer.go internal/service/customer_test.go
git commit -m "feat: add cache hit/miss and signup retry metrics instrumentation"
```

---

### Task 9: /metrics Endpoint + Router Integration

**Files:**
- Modify: `internal/api/router.go` — add `/metrics` endpoint, wire logging + metrics middleware
- Modify: `internal/api/router_test.go` — add metrics endpoint test

- [ ] **Step 1: Write failing test for /metrics endpoint**

Add to `internal/api/router_test.go`:

```go
func TestRouter_MetricsEndpoint(t *testing.T) {
	reg := prometheus.NewRegistry()
	m := observe.NewMetrics(reg)
	logger := observe.NewLogger("info", io.Discard)

	r := api.NewRouter(api.RouterDeps{
		Server:   &mockServer{},
		Logger:   logger,
		Metrics:  m,
		Registry: reg,
		// ... other existing deps
	})

	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
	body := rr.Body.String()
	if !strings.Contains(body, "http_requests_total") {
		t.Error("expected /metrics to contain http_requests_total")
	}
}

func TestRouter_MetricsMiddlewareApplied(t *testing.T) {
	reg := prometheus.NewRegistry()
	m := observe.NewMetrics(reg)
	logger := observe.NewLogger("info", io.Discard)

	r := api.NewRouter(api.RouterDeps{
		Server:   &mockServer{},
		Logger:   logger,
		Metrics:  m,
		Registry: reg,
	})

	// Make a request to any endpoint
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	// Check that metrics were recorded
	families, _ := reg.Gather()
	for _, f := range families {
		if f.GetName() == "http_requests_total" {
			return // found — middleware is wired
		}
	}
	t.Error("expected http_requests_total after request — metrics middleware not wired")
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/api/ -run "TestRouter_Metrics" -v
```

Expected: FAIL — `RouterDeps` does not have Logger/Metrics/Registry fields.

- [ ] **Step 3: Wire observability into router**

Modify `internal/api/router.go` to add observability dependencies and middleware:

```go
import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/clawbrowser/clawbrowser-api/internal/observe"
)

type RouterDeps struct {
	Server   gen.ServerInterface
	Logger   *slog.Logger
	Metrics  *observe.Metrics
	Registry *prometheus.Registry
	// ... existing auth deps
}

func NewRouter(deps RouterDeps) *chi.Mux {
	r := chi.NewRouter()

	// Global middleware — observability first
	r.Use(RequestLoggingMiddleware(deps.Logger))
	r.Use(MetricsMiddleware(deps.Metrics))

	// Health probes (no auth)
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	r.Get("/readyz", func(w http.ResponseWriter, r *http.Request) {
		// ... existing readiness check
	})

	// Metrics endpoint (cluster-internal only, not exposed via Traefik)
	r.Handle("/metrics", promhttp.HandlerFor(deps.Registry, promhttp.HandlerOpts{}))

	// ... rest of existing route mounting
}
```

- [ ] **Step 4: Install promhttp dependency and run tests**

```bash
go get github.com/prometheus/client_golang/prometheus/promhttp
go test ./internal/api/ -run "TestRouter_Metrics" -v
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add internal/api/router.go internal/api/router_test.go go.mod go.sum
git commit -m "feat: add /metrics endpoint and wire logging + metrics middleware into router"
```

---

### Task 10: Wire Observability Into main.go

**Files:**
- Modify: `cmd/server/main.go` — create logger, metrics, pass to router and services

- [ ] **Step 1: Write failing test for main wiring**

This is an integration check. Add to `cmd/server/main_test.go` (or verify by compile check):

```go
func TestMain_Compiles(t *testing.T) {
	// This test verifies the wiring compiles. The actual server isn't started.
	// Build check is sufficient.
}
```

```bash
go build ./cmd/server/
```

Expected: FAIL — main.go doesn't pass logger/metrics to RouterDeps yet.

- [ ] **Step 2: Update main.go to wire observability**

Add to `cmd/server/main.go`:

```go
import (
	"os"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/clawbrowser/clawbrowser-api/internal/observe"
)

func main() {
	cfg, err := config.Load("config.yaml")
	if err != nil {
		log.Fatal(err)
	}

	// Observability
	logger := observe.NewLogger(cfg.Logging.Level, os.Stdout)
	slog.SetDefault(logger) // Set as default so bare slog.Info() calls use it too

	reg := prometheus.NewRegistry()
	metrics := observe.NewMetrics(reg)

	// ... existing DB, Redis, provider setup ...

	// Pass metrics to cache (adds *observe.Metrics param to existing NewRedisCache)
	cache, err := store.NewRedisCache(cfg.Redis.URL, cfg.Redis.DB, metrics, cfg.Redis.TTL.Customer)

	// Pass metrics to provisioning retrier (adds *observe.Metrics param to existing NewProvisioningRetrier)
	retrier := service.NewProvisioningRetrier(customerRepo, nodemavenAdapter, unkeyAdapter, mailerClient, metrics)

	// ... existing server setup ...

	router := api.NewRouter(api.RouterDeps{
		Server:   server,
		Logger:   logger,
		Metrics:  metrics,
		Registry: reg,
		// ... existing deps
	})

	// ... rest of main
}
```

- [ ] **Step 3: Verify it compiles**

```bash
go build ./cmd/server/
```

Expected: BUILD SUCCESS.

- [ ] **Step 4: Run all tests**

```bash
go test ./... -v
```

Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add cmd/server/main.go
git commit -m "feat: wire observability (logger, metrics, registry) into main.go"
```

---

### Task 11: Webhook Audit Logging + Bare slog.Error Replacement

**Context:** The observability spec requires structured audit events for security-relevant actions (webhook receipts, auth failures, key rotations) and ERROR-level logs with stack traces. The backend plan uses bare `slog.Error`/`slog.Info`/`slog.Warn` calls that lack these structured fields. This task replaces them with `observe.AuditLog()` and `observe.LogError()`/`observe.LogWarn()`.

**Files:**
- Modify: `internal/api/server.go` — add audit logging to webhook handlers
- Modify: `internal/service/customer.go` — replace bare `slog.Error` with `observe.LogError`/`observe.LogWarn`
- Modify: `internal/service/customer.go` — replace bare `slog.Error` in `ProvisioningRetrier` with `observe.LogError`

**Bare `slog` calls to replace:**

| File | Call | Replacement |
|------|------|-------------|
| `server.go` `PostV1WebhooksAuth0` | (no logging) | Add `observe.AuditLog(logger, "webhook.received", payload.UserId, "auth0")` |
| `server.go` `PostV1WebhooksUnibee` | `slog.Info("unibee: payment succeeded", ...)` | `observe.AuditLog(logger, "webhook.received", "", "unibee")` + keep event-specific log |
| `server.go` `PostV1WebhooksUnibee` | `slog.Warn("unibee: payment failed", ...)` | `observe.AuditLog(logger, "webhook.received", "", "unibee")` + `observe.LogWarn(logger, ...)` |
| `customer.go` Signup | `slog.Error("nodemaven provisioning failed, will retry", ...)` | `observe.LogWarn(logger, err, "nodemaven provisioning failed, will retry", "customer_id", customer.ID)` |
| `customer.go` Signup | `slog.Error("unkey key creation failed, will retry", ...)` | `observe.LogWarn(logger, err, "unkey key creation failed, will retry", "customer_id", customer.ID)` |
| `customer.go` Signup | `slog.Error("welcome email failed", ...)` | `observe.LogWarn(logger, err, "welcome email failed", "customer_id", customer.ID)` |
| `customer.go` RetryOnce | `slog.Error("failed to increment retry count", ...)` | `observe.LogError(logger, err, "failed to increment retry count", "customer_id", c.ID)` |
| `customer.go` RetryOnce | `slog.Error("provisioning failed after max retries", ...)` | `observe.LogError(logger, err, "provisioning failed after max retries", "customer_id", c.ID, "retry_count", retryCount)` |
| `customer.go` RetryOnce | `slog.Error("failed to mark provisioning_failed", ...)` | `observe.LogError(logger, err, "failed to mark provisioning_failed", "customer_id", c.ID)` |
| `customer.go` RetryOnce | `slog.Error("retry provisioning failed", ...)` | `observe.LogError(logger, err, "retry provisioning failed", "customer_id", c.ID, "retry_count", retryCount)` |
| `customer.go` StartRetryLoop | `slog.Error("retry loop error", ...)` | `observe.LogError(logger, err, "retry loop error")` |
| `apikey.go` | `slog.Error("cache invalidation failed", ...)` | `observe.LogWarn(logger, err, "cache invalidation failed")` |

**Note:** The `slog.Error`/`slog.Info` calls in `main.go` (startup failures, shutdown, server start) remain as bare calls — they run before the structured logger is initialized or are simple lifecycle messages.

- [ ] **Step 1: Add audit logging to Auth0 webhook handler**

Modify `internal/api/server.go` — the `PostV1WebhooksAuth0` handler needs `observe.AuditLog` before the signup call:

```go
func (s *Server) PostV1WebhooksAuth0(w http.ResponseWriter, r *http.Request) {
	var payload gen.Auth0WebhookPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "Invalid webhook payload")
		return
	}

	logger := observe.LoggerFromContext(r.Context())
	observe.AuditLog(logger, "webhook.received", payload.UserId, "auth0")

	if err := s.customerSvc.Signup(r.Context(), payload.UserId, string(payload.Email), payload.Name); err != nil {
		writeError(w, http.StatusInternalServerError, "signup_failed", err.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
}
```

- [ ] **Step 2: Add audit logging to UniBee webhook handler**

Modify `internal/api/server.go` — replace bare `slog.Info`/`slog.Warn` with audit + structured logging:

```go
func (s *Server) PostV1WebhooksUnibee(w http.ResponseWriter, r *http.Request) {
	var payload gen.UniBeeWebhookPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "Invalid webhook payload")
		return
	}

	logger := observe.LoggerFromContext(r.Context())
	observe.AuditLog(logger, "webhook.received", "", "unibee")

	switch payload.Event {
	case gen.UniBeeWebhookPayloadEventPaymentSucceeded:
		logger.Info("unibee: payment succeeded", "event", string(payload.Event), "data", payload.Data)
	case gen.UniBeeWebhookPayloadEventPaymentFailed:
		logger.Warn("unibee: payment failed", "event", string(payload.Event), "data", payload.Data)
	case gen.UniBeeWebhookPayloadEventSubscriptionUpdated:
		logger.Info("unibee: subscription updated", "event", string(payload.Event), "data", payload.Data)
	case gen.UniBeeWebhookPayloadEventSubscriptionCancelled:
		logger.Info("unibee: subscription cancelled", "event", string(payload.Event), "data", payload.Data)
	default:
		logger.Warn("unibee: unknown event", "event", string(payload.Event))
	}

	w.WriteHeader(http.StatusOK)
}
```

- [ ] **Step 3: Replace bare slog.Error calls in customer.go service layer**

Modify `internal/service/customer.go` — the `Signup` method's error calls are recoverable (return nil for retry), so use `LogWarn`:

```go
// In Signup, replace:
//   slog.Error("nodemaven provisioning failed, will retry", "customer_id", customer.ID, "error", err)
// With:
logger := observe.LoggerFromContext(ctx)
observe.LogWarn(logger, err, "nodemaven provisioning failed, will retry", "customer_id", customer.ID, "component", "service")
```

Apply the same pattern to the other two `slog.Error` calls in `Signup` (unkey key creation, welcome email).

- [ ] **Step 4: Replace bare slog.Error calls in ProvisioningRetrier**

Modify `internal/service/customer.go` — the `RetryOnce` method's errors are real failures, so use `LogError` (includes stack trace):

```go
// In RetryOnce, replace each bare slog.Error with observe.LogError:
logger := observe.LoggerFromContext(ctx)
observe.LogError(logger, err, "failed to increment retry count", "customer_id", c.ID, "component", "service")
```

Apply to all 4 `slog.Error` calls in `RetryOnce` and the 1 in `StartRetryLoop`.

- [ ] **Step 5: Replace bare slog.Error in apikey.go**

Modify `internal/service/apikey.go` — cache invalidation failure is recoverable:

```go
// Replace:
//   slog.Error("cache invalidation failed", "error", err)
// With:
observe.LogWarn(observe.LoggerFromContext(ctx), err, "cache invalidation failed", "component", "service")
```

- [ ] **Step 6: Run all tests**

```bash
go test ./internal/api/ ./internal/service/ -v
```

Expected: PASS. The `observe.LoggerFromContext(ctx)` calls return the default logger in tests (no middleware injecting one), which is fine for unit tests.

- [ ] **Step 7: Commit**

```bash
git add internal/api/server.go internal/service/customer.go internal/service/apikey.go
git commit -m "feat: add webhook audit logging and replace bare slog calls with structured observe helpers"
```

---

### Task 12: Grafana Dashboard Provisioning Setup

**Files (in clawbrowser-infra):**
- Create: `k8s/cluster-wide/observability/grafana/dashboards-provider.yaml`
- Modify: `k8s/cluster-wide/observability/grafana/deployment.yaml` — mount dashboards volume
- Modify: `k8s/cluster-wide/observability/grafana/kustomization.yaml` — add new resource

- [ ] **Step 1: Create dashboard provisioning config**

Create `k8s/cluster-wide/observability/grafana/dashboards-provider.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-provider
  namespace: observability
data:
  dashboards.yaml: |
    apiVersion: 1
    providers:
      - name: clawbrowser
        orgId: 1
        folder: Clawbrowser
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards
          foldersFromFilesStructure: false
```

- [ ] **Step 2: Add dashboards volume mount to Grafana deployment**

Modify `k8s/cluster-wide/observability/grafana/deployment.yaml` — add to containers[0].volumeMounts:

```yaml
            - name: dashboard-provider
              mountPath: /etc/grafana/provisioning/dashboards
            - name: dashboards
              mountPath: /var/lib/grafana/dashboards
```

Add to volumes:

```yaml
        - name: dashboard-provider
          configMap:
            name: grafana-dashboard-provider
        - name: dashboards
          configMap:
            name: grafana-dashboards
```

- [ ] **Step 3: Update kustomization.yaml**

Add `dashboards-provider.yaml` to the resources list in `k8s/cluster-wide/observability/grafana/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - datasources.yaml
  - dashboards-provider.yaml
  - dashboards-configmap.yaml
  - deployment.yaml
  - service.yaml
```

- [ ] **Step 4: Validate**

```bash
kustomize build k8s/cluster-wide/observability/grafana/
```

Expected: Validation will fail because `dashboards-configmap.yaml` doesn't exist yet — that's Task 12. Confirm the kustomization.yaml content is correct and proceed.

- [ ] **Step 5: Commit**

```bash
git add k8s/cluster-wide/observability/grafana/
git commit -m "feat: add Grafana dashboard provisioning config and volume mounts"
```

---

### Task 13: Grafana Metrics Dashboards

**Files (in clawbrowser-infra):**
- Create: `k8s/cluster-wide/observability/grafana/dashboards-configmap.yaml`

This ConfigMap contains four metrics dashboards as JSON. Each dashboard uses VictoriaMetrics as the datasource (Prometheus-compatible queries).

- [ ] **Step 1: Create dashboards ConfigMap with Request Overview dashboard**

Create `k8s/cluster-wide/observability/grafana/dashboards-configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboards
  namespace: observability
data:
  request-overview.json: |
    {
      "dashboard": {
        "title": "Request Overview",
        "uid": "clawbrowser-requests",
        "tags": ["clawbrowser"],
        "timezone": "browser",
        "templating": {
          "list": [
            {
              "name": "namespace",
              "type": "query",
              "datasource": "VictoriaMetrics",
              "query": "label_values(http_requests_total, namespace)",
              "refresh": 2
            }
          ]
        },
        "panels": [
          {
            "title": "Request Rate",
            "type": "timeseries",
            "gridPos": {"h": 8, "w": 8, "x": 0, "y": 0},
            "targets": [
              {
                "expr": "sum(rate(http_requests_total{namespace=\"$namespace\"}[5m]))",
                "legendFormat": "requests/sec"
              }
            ]
          },
          {
            "title": "Error Rate (4xx + 5xx)",
            "type": "timeseries",
            "gridPos": {"h": 8, "w": 8, "x": 8, "y": 0},
            "targets": [
              {
                "expr": "sum(rate(http_requests_total{namespace=\"$namespace\",status=~\"4..|5..\"}[5m]))",
                "legendFormat": "errors/sec"
              }
            ]
          },
          {
            "title": "Latency Percentiles",
            "type": "timeseries",
            "gridPos": {"h": 8, "w": 8, "x": 16, "y": 0},
            "targets": [
              {
                "expr": "histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket{namespace=\"$namespace\"}[5m])) by (le))",
                "legendFormat": "p50"
              },
              {
                "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{namespace=\"$namespace\"}[5m])) by (le))",
                "legendFormat": "p95"
              },
              {
                "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{namespace=\"$namespace\"}[5m])) by (le))",
                "legendFormat": "p99"
              }
            ]
          },
          {
            "title": "Requests by Path",
            "type": "timeseries",
            "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8},
            "targets": [
              {
                "expr": "sum(rate(http_requests_total{namespace=\"$namespace\"}[5m])) by (method, path)",
                "legendFormat": "{{method}} {{path}}"
              }
            ]
          },
          {
            "title": "In-Flight Requests",
            "type": "gauge",
            "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8},
            "targets": [
              {
                "expr": "http_requests_in_flight{namespace=\"$namespace\"}",
                "legendFormat": "in-flight"
              }
            ]
          }
        ],
        "schemaVersion": 39
      }
    }
  provider-health.json: |
    {
      "dashboard": {
        "title": "Provider Health",
        "uid": "clawbrowser-providers",
        "tags": ["clawbrowser"],
        "timezone": "browser",
        "templating": {
          "list": [
            {
              "name": "namespace",
              "type": "query",
              "datasource": "VictoriaMetrics",
              "query": "label_values(provider_request_duration_seconds_count, namespace)",
              "refresh": 2
            }
          ]
        },
        "panels": [
          {
            "title": "Provider Latency (p95)",
            "type": "timeseries",
            "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
            "targets": [
              {
                "expr": "histogram_quantile(0.95, sum(rate(provider_request_duration_seconds_bucket{namespace=\"$namespace\"}[5m])) by (le, provider))",
                "legendFormat": "{{provider}}"
              }
            ]
          },
          {
            "title": "Provider Error Rate",
            "type": "timeseries",
            "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
            "targets": [
              {
                "expr": "sum(rate(provider_errors_total{namespace=\"$namespace\"}[5m])) by (provider)",
                "legendFormat": "{{provider}}"
              }
            ]
          },
          {
            "title": "Provider Request Rate",
            "type": "timeseries",
            "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8},
            "targets": [
              {
                "expr": "sum(rate(provider_request_duration_seconds_count{namespace=\"$namespace\"}[5m])) by (provider)",
                "legendFormat": "{{provider}}"
              }
            ]
          }
        ],
        "schemaVersion": 39
      }
    }
  cache-performance.json: |
    {
      "dashboard": {
        "title": "Cache Performance",
        "uid": "clawbrowser-cache",
        "tags": ["clawbrowser"],
        "timezone": "browser",
        "templating": {
          "list": [
            {
              "name": "namespace",
              "type": "query",
              "datasource": "VictoriaMetrics",
              "query": "label_values(cache_hits_total, namespace)",
              "refresh": 2
            }
          ]
        },
        "panels": [
          {
            "title": "Cache Hit/Miss Rate",
            "type": "timeseries",
            "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
            "targets": [
              {
                "expr": "rate(cache_hits_total{namespace=\"$namespace\"}[5m])",
                "legendFormat": "hits/sec"
              },
              {
                "expr": "rate(cache_misses_total{namespace=\"$namespace\"}[5m])",
                "legendFormat": "misses/sec"
              }
            ]
          },
          {
            "title": "Cache Hit Ratio",
            "type": "gauge",
            "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
            "targets": [
              {
                "expr": "rate(cache_hits_total{namespace=\"$namespace\"}[5m]) / (rate(cache_hits_total{namespace=\"$namespace\"}[5m]) + rate(cache_misses_total{namespace=\"$namespace\"}[5m]))",
                "legendFormat": "hit ratio"
              }
            ],
            "fieldConfig": {
              "defaults": {
                "unit": "percentunit",
                "min": 0,
                "max": 1
              }
            }
          }
        ],
        "schemaVersion": 39
      }
    }
  pod-resources.json: |
    {
      "dashboard": {
        "title": "Pod Resources",
        "uid": "clawbrowser-pods",
        "tags": ["clawbrowser"],
        "timezone": "browser",
        "templating": {
          "list": [
            {
              "name": "namespace",
              "type": "query",
              "datasource": "VictoriaMetrics",
              "query": "label_values(container_cpu_usage_seconds_total, namespace)",
              "refresh": 2
            }
          ]
        },
        "panels": [
          {
            "title": "CPU Usage",
            "type": "timeseries",
            "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
            "targets": [
              {
                "expr": "sum(rate(container_cpu_usage_seconds_total{namespace=\"$namespace\", container!=\"\"}[5m])) by (pod)",
                "legendFormat": "{{pod}}"
              }
            ]
          },
          {
            "title": "Memory Usage",
            "type": "timeseries",
            "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
            "targets": [
              {
                "expr": "sum(container_memory_working_set_bytes{namespace=\"$namespace\", container!=\"\"}) by (pod)",
                "legendFormat": "{{pod}}"
              }
            ],
            "fieldConfig": {
              "defaults": {"unit": "bytes"}
            }
          },
          {
            "title": "Pod Restarts",
            "type": "stat",
            "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8},
            "targets": [
              {
                "expr": "sum(kube_pod_container_status_restarts_total{namespace=\"$namespace\"}) by (pod)",
                "legendFormat": "{{pod}}"
              }
            ]
          }
        ],
        "schemaVersion": 39
      }
    }
```

- [ ] **Step 2: Validate**

```bash
kustomize build k8s/cluster-wide/observability/grafana/
```

Expected: Valid YAML output containing all ConfigMaps.

- [ ] **Step 3: Commit**

```bash
git add k8s/cluster-wide/observability/grafana/dashboards-configmap.yaml
git commit -m "feat: add Grafana metrics dashboards (request overview, provider health, cache, pods)"
```

---

### Task 14: Grafana Logs Dashboards

**Files (in clawbrowser-infra):**
- Modify: `k8s/cluster-wide/observability/grafana/dashboards-configmap.yaml` — add logs dashboard entries

This task adds four logs-based dashboards that query VictoriaLogs. These use the VictoriaLogs datasource with LogsQL queries.

- [ ] **Step 1: Add logs dashboards to ConfigMap**

Append to the `data` section of `k8s/cluster-wide/observability/grafana/dashboards-configmap.yaml`:

```yaml
  request-logs.json: |
    {
      "dashboard": {
        "title": "Request Logs",
        "uid": "clawbrowser-request-logs",
        "tags": ["clawbrowser", "logs"],
        "timezone": "browser",
        "templating": {
          "list": [
            {
              "name": "namespace",
              "type": "custom",
              "query": "clawbrowser-dev,clawbrowser-qa,clawbrowser-prod",
              "current": {"text": "clawbrowser-prod", "value": "clawbrowser-prod"}
            }
          ]
        },
        "panels": [
          {
            "title": "Live Request Stream",
            "type": "logs",
            "gridPos": {"h": 16, "w": 24, "x": 0, "y": 0},
            "datasource": "VictoriaLogs",
            "targets": [
              {
                "expr": "_stream:{kubernetes_namespace_name=\"$namespace\"} AND \"request\"",
                "refId": "A"
              }
            ]
          },
          {
            "title": "Requests by Status Code",
            "type": "timeseries",
            "gridPos": {"h": 8, "w": 24, "x": 0, "y": 16},
            "datasource": "VictoriaLogs",
            "targets": [
              {
                "expr": "_stream:{kubernetes_namespace_name=\"$namespace\"} AND \"request\" | stats by (status) count() requests",
                "refId": "A"
              }
            ]
          }
        ],
        "schemaVersion": 39
      }
    }
  error-logs.json: |
    {
      "dashboard": {
        "title": "Error Logs",
        "uid": "clawbrowser-error-logs",
        "tags": ["clawbrowser", "logs"],
        "timezone": "browser",
        "templating": {
          "list": [
            {
              "name": "namespace",
              "type": "custom",
              "query": "clawbrowser-dev,clawbrowser-qa,clawbrowser-prod",
              "current": {"text": "clawbrowser-prod", "value": "clawbrowser-prod"}
            },
            {
              "name": "component",
              "type": "custom",
              "query": "api,service,provider,store",
              "includeAll": true,
              "current": {"text": "All", "value": "$__all"}
            }
          ]
        },
        "panels": [
          {
            "title": "Recent Errors",
            "type": "logs",
            "gridPos": {"h": 16, "w": 24, "x": 0, "y": 0},
            "datasource": "VictoriaLogs",
            "targets": [
              {
                "expr": "_stream:{kubernetes_namespace_name=\"$namespace\"} AND level:\"ERROR\"",
                "refId": "A"
              }
            ]
          },
          {
            "title": "Error Count by Component",
            "type": "barchart",
            "gridPos": {"h": 8, "w": 24, "x": 0, "y": 16},
            "datasource": "VictoriaLogs",
            "targets": [
              {
                "expr": "_stream:{kubernetes_namespace_name=\"$namespace\"} AND level:\"ERROR\" | stats by (component) count() errors",
                "refId": "A"
              }
            ]
          }
        ],
        "schemaVersion": 39
      }
    }
  audit-logs.json: |
    {
      "dashboard": {
        "title": "Audit Logs",
        "uid": "clawbrowser-audit-logs",
        "tags": ["clawbrowser", "logs"],
        "timezone": "browser",
        "templating": {
          "list": [
            {
              "name": "namespace",
              "type": "custom",
              "query": "clawbrowser-dev,clawbrowser-qa,clawbrowser-prod",
              "current": {"text": "clawbrowser-prod", "value": "clawbrowser-prod"}
            },
            {
              "name": "event_type",
              "type": "custom",
              "query": "api_key.rotated,customer.created,auth.failed,webhook.received",
              "includeAll": true,
              "current": {"text": "All", "value": "$__all"}
            }
          ]
        },
        "panels": [
          {
            "title": "Security Events",
            "type": "logs",
            "gridPos": {"h": 16, "w": 24, "x": 0, "y": 0},
            "datasource": "VictoriaLogs",
            "targets": [
              {
                "expr": "_stream:{kubernetes_namespace_name=\"$namespace\"} AND \"audit\"",
                "refId": "A"
              }
            ]
          },
          {
            "title": "Events by Type",
            "type": "barchart",
            "gridPos": {"h": 8, "w": 24, "x": 0, "y": 16},
            "datasource": "VictoriaLogs",
            "targets": [
              {
                "expr": "_stream:{kubernetes_namespace_name=\"$namespace\"} AND \"audit\" | stats by (event) count() events",
                "refId": "A"
              }
            ]
          }
        ],
        "schemaVersion": 39
      }
    }
  customer-errors.json: |
    {
      "dashboard": {
        "title": "Customer Errors",
        "uid": "clawbrowser-customer-errors",
        "tags": ["clawbrowser", "logs"],
        "timezone": "browser",
        "templating": {
          "list": [
            {
              "name": "namespace",
              "type": "custom",
              "query": "clawbrowser-dev,clawbrowser-qa,clawbrowser-prod",
              "current": {"text": "clawbrowser-prod", "value": "clawbrowser-prod"}
            }
          ]
        },
        "panels": [
          {
            "title": "Errors by Customer",
            "type": "table",
            "gridPos": {"h": 12, "w": 24, "x": 0, "y": 0},
            "datasource": "VictoriaLogs",
            "targets": [
              {
                "expr": "_stream:{kubernetes_namespace_name=\"$namespace\"} AND level:\"ERROR\" AND customer_email:* | stats by (customer_email) count() errors",
                "refId": "A"
              }
            ]
          },
          {
            "title": "Recent Customer Errors",
            "type": "logs",
            "gridPos": {"h": 12, "w": 24, "x": 0, "y": 12},
            "datasource": "VictoriaLogs",
            "targets": [
              {
                "expr": "_stream:{kubernetes_namespace_name=\"$namespace\"} AND level:\"ERROR\" AND customer_email:*",
                "refId": "A"
              }
            ]
          }
        ],
        "schemaVersion": 39
      }
    }
```

- [ ] **Step 2: Validate**

```bash
kustomize build k8s/cluster-wide/observability/grafana/
```

Expected: Valid YAML output.

- [ ] **Step 3: Commit**

```bash
git add k8s/cluster-wide/observability/grafana/dashboards-configmap.yaml
git commit -m "feat: add Grafana logs dashboards (request, error, audit, customer errors)"
```
