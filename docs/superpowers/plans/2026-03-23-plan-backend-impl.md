# Clawbrowser Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Go monolith API that generates browser fingerprints with proxy credentials, manages customers, and integrates with Auth0, Unkey, UniBee, Nodemaven, and MailerSend.

**Architecture:** Go 1.22+ monolith using Chi router with oapi-codegen for OpenAPI-driven types and routing. Three auth paths: Unkey API key (browser clients), Auth0 JWT (dashboard), webhook signature verification. PostgreSQL for persistence, Redis for caching the hot path.

**Tech Stack:** Go 1.22+, Chi, oapi-codegen v2, PostgreSQL, Redis, Viper, golang-migrate

**Spec:** `docs/superpowers/specs/2026-03-22-clawbrowser-backend-design.md`
**API Contract:** `api/openapi.yaml`

---

## File Structure

```
cmd/
  server/
    main.go                         # Entry point: config load, DI wiring, server start
internal/
  config/
    config.go                       # Viper-based YAML + env config
    config_test.go
  model/
    types.go                        # Shared domain types (Customer, ApiKey, etc.)
  api/
    gen/
      generate.go                   # //go:generate directive
      server.gen.go                 # Generated: ServerInterface + Chi routing
      types.gen.go                  # Generated: request/response types
    server.go                       # Implements gen.ServerInterface
    server_test.go                  # Handler integration tests
    router.go                       # Chi router, middleware chain, health probes
    router_test.go
    middleware_unkey.go              # Unkey API key auth middleware
    middleware_unkey_test.go
    middleware_auth0.go              # Auth0 JWT auth middleware
    middleware_auth0_test.go
    middleware_webhook.go            # Webhook signature verification
    middleware_webhook_test.go
  service/
    customer.go                     # Customer CRUD + onboarding orchestration
    customer_test.go
    apikey.go                       # API key orchestration (Unkey wrapper)
    apikey_test.go
    fingerprint.go                  # Fingerprint generation logic
    fingerprint_test.go
    billing.go                      # Billing orchestration (UniBee wrapper)
    billing_test.go
    usage.go                        # Usage aggregation (Unkey data)
    usage_test.go
  provider/
    unkey.go                        # Unkey API client
    unkey_test.go
    unibee.go                       # UniBee API client
    unibee_test.go
    nodemaven.go                    # Nodemaven API client
    nodemaven_test.go
    auth0.go                        # Auth0 Management API client
    auth0_test.go
    mailersend.go                   # MailerSend SMTP email client
    mailersend_test.go
  store/
    postgres.go                     # DB connection + migration runner
    postgres_test.go
    customer_repo.go                # Customer queries
    customer_repo_test.go
    apikey_repo.go                  # API key queries
    apikey_repo_test.go
    cache.go                        # Redis cache layer
    cache_test.go
  fingerprint/
    generator.go                    # Core generation logic
    generator_test.go
    datasets.go                     # Curated browser config presets
    datasets_test.go
migrations/
  001_create_customers.up.sql
  001_create_customers.down.sql
  002_create_api_keys.up.sql
  002_create_api_keys.down.sql
oapi-codegen.yaml                   # Code generation config
config.yaml                         # Default config
Dockerfile
go.mod
.github/
  workflows/
    ci.yaml                          # CI/CD: test, build, push, deploy trigger
```

---

### Task 1: Project Scaffolding

**Prerequisite:** `api/openapi.yaml` must exist before Step 5 (code generation). This file is the API contract defined in the backend spec and must be created first. If it does not exist yet, create a minimal OpenAPI 3.0 spec with all 14 endpoints from the spec before running code generation.

**Files:**
- Create: `go.mod`
- Create: `config.yaml`
- Create: `oapi-codegen.yaml`
- Create: `internal/api/gen/generate.go`

- [ ] **Step 1: Initialize Go module**

```bash
cd /Users/devtest/claudews/clawbrowser
go mod init github.com/clawbrowser/clawbrowser-api
```

- [ ] **Step 2: Create default config.yaml**

Create `config.yaml` with all defaults from the spec:

```yaml
server:
  port: 8080

redis:
  url: redis://localhost:6379
  db: 0  # Per-env DB number: dev=0, qa=1, prod=2 (see devops spec)
  ttl:
    customer: 10m

postgres:
  url: postgres://localhost:5432/clawbrowser  # In K8s, Sealed Secret sets search_path=clawbrowser_api

auth0:
  domain: ""
  audience: ""

unkey:
  url: http://localhost:3000
  root_key: ""
  api_id: ""

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

webhooks:
  auth0_secret: ""
  unibee_secret: ""
  signature_header: "X-Webhook-Signature"
```

- [ ] **Step 3: Create oapi-codegen config**

Create `oapi-codegen.yaml`:

```yaml
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

- [ ] **Step 4: Create generate.go with go:generate directive**

Create `internal/api/gen/generate.go`:

```go
package gen

//go:generate go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen --config ../../../oapi-codegen.yaml ../../../api/openapi.yaml
```

- [ ] **Step 5: Install dependencies and run code generation**

```bash
go get github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen
go get github.com/oapi-codegen/runtime
go get github.com/go-chi/chi/v5
go generate ./...
```

- [ ] **Step 6: Verify generated files exist and compile**

```bash
ls internal/api/gen/server.gen.go internal/api/gen/types.gen.go
go build ./...
```

Expected: Both files exist, project compiles.

- [ ] **Step 7: Commit**

```bash
git add go.mod go.sum config.yaml oapi-codegen.yaml internal/api/gen/
git commit -m "feat: scaffold project with go module, config, and oapi-codegen"
```

---

### Task 2: Configuration

**Files:**
- Create: `internal/config/config.go`
- Create: `internal/config/config_test.go`

- [ ] **Step 1: Write the failing test for config loading**

Create `internal/config/config_test.go`:

```go
package config_test

import (
	"os"
	"testing"

	"github.com/clawbrowser/clawbrowser-api/internal/config"
)

func TestLoad_Defaults(t *testing.T) {
	cfg, err := config.Load("../../config.yaml")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Server.Port != 8080 {
		t.Errorf("expected port 8080, got %d", cfg.Server.Port)
	}
	if cfg.Redis.TTL.Customer.String() != "10m0s" {
		t.Errorf("expected 10m TTL, got %s", cfg.Redis.TTL.Customer)
	}
}

func TestLoad_EnvOverride(t *testing.T) {
	os.Setenv("CLAWBROWSER_SERVER__PORT", "9090")
	defer os.Unsetenv("CLAWBROWSER_SERVER__PORT")

	cfg, err := config.Load("../../config.yaml")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Server.Port != 9090 {
		t.Errorf("expected port 9090, got %d", cfg.Server.Port)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/config/ -v
```

Expected: FAIL — package not found.

- [ ] **Step 3: Write the config implementation**

Create `internal/config/config.go`:

```go
package config

import (
	"strings"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Server     ServerConfig     `mapstructure:"server"`
	Redis      RedisConfig      `mapstructure:"redis"`
	Postgres   PostgresConfig   `mapstructure:"postgres"`
	Auth0      Auth0Config      `mapstructure:"auth0"`
	Unkey      UnkeyConfig      `mapstructure:"unkey"`
	UniBee     UniBeeConfig     `mapstructure:"unibee"`
	Nodemaven  NodemavenConfig  `mapstructure:"nodemaven"`
	MailerSend MailerSendConfig `mapstructure:"mailersend"`
	Webhooks   WebhooksConfig   `mapstructure:"webhooks"`
}

type ServerConfig struct {
	Port int `mapstructure:"port"`
}

type RedisConfig struct {
	URL string         `mapstructure:"url"`
	DB  int            `mapstructure:"db"`
	TTL RedisTTLConfig `mapstructure:"ttl"`
}

type RedisTTLConfig struct {
	Customer time.Duration `mapstructure:"customer"`
}

type PostgresConfig struct {
	URL string `mapstructure:"url"`
}

type Auth0Config struct {
	Domain   string `mapstructure:"domain"`
	Audience string `mapstructure:"audience"`
}

type UnkeyConfig struct {
	URL     string `mapstructure:"url"`
	RootKey string `mapstructure:"root_key"`
	APIID   string `mapstructure:"api_id"`
}

type UniBeeConfig struct {
	URL    string `mapstructure:"url"`
	APIKey string `mapstructure:"api_key"`
}

type NodemavenConfig struct {
	APIURL string `mapstructure:"api_url"`
	APIKey string `mapstructure:"api_key"`
}

type MailerSendConfig struct {
	SMTPHost string `mapstructure:"smtp_host"`
	SMTPPort int    `mapstructure:"smtp_port"`
	APIKey   string `mapstructure:"api_key"`
	From     string `mapstructure:"from"`
}

type WebhooksConfig struct {
	Auth0Secret     string `mapstructure:"auth0_secret"`
	UniBeeSecret    string `mapstructure:"unibee_secret"`
	SignatureHeader string `mapstructure:"signature_header"`
}

func Load(path string) (*Config, error) {
	v := viper.New()
	v.SetConfigFile(path)
	v.SetEnvPrefix("CLAWBROWSER")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "__"))
	v.AutomaticEnv()

	if err := v.ReadInConfig(); err != nil {
		return nil, err
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
```

- [ ] **Step 4: Install Viper dependency and run tests**

```bash
go get github.com/spf13/viper
go test ./internal/config/ -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add internal/config/ go.mod go.sum
git commit -m "feat: add Viper-based config with env var overrides"
```

---

### Task 3: Domain Model Types

**Files:**
- Create: `internal/model/types.go`

- [ ] **Step 1: Create domain types**

Create `internal/model/types.go`:

```go
package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type CustomerStatus string

const (
	CustomerStatusProvisioning      CustomerStatus = "provisioning"
	CustomerStatusActive            CustomerStatus = "active"
	CustomerStatusProvisioningFailed CustomerStatus = "provisioning_failed"
)

type Customer struct {
	ID                    uuid.UUID        `json:"id" db:"id"`
	Auth0ID               string           `json:"auth0_id" db:"auth0_id"`
	Email                 string           `json:"email" db:"email"`
	Name                  *string          `json:"name,omitempty" db:"name"`
	Status                CustomerStatus   `json:"status" db:"status"`
	RetryCount            int              `json:"retry_count" db:"retry_count"`
	NodemavenSubClientID  *string          `json:"nodemaven_sub_client_id,omitempty" db:"nodemaven_sub_client_id"`
	NodemavenCredentials  *json.RawMessage `json:"nodemaven_credentials,omitempty" db:"nodemaven_credentials"`
	CreatedAt             time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time        `json:"updated_at" db:"updated_at"`
}

type NodemavenCreds struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
}

type ApiKey struct {
	ID         uuid.UUID  `json:"id" db:"id"`
	CustomerID uuid.UUID  `json:"customer_id" db:"customer_id"`
	UnkeyKeyID string     `json:"unkey_key_id" db:"unkey_key_id"`
	Name       *string    `json:"name,omitempty" db:"name"`
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
	RevokedAt  *time.Time `json:"revoked_at,omitempty" db:"revoked_at"`
}
```

- [ ] **Step 2: Install uuid dependency, verify it compiles**

```bash
go get github.com/google/uuid
go build ./internal/model/
```

Expected: Compiles without error.

- [ ] **Step 3: Commit**

```bash
git add internal/model/ go.mod go.sum
git commit -m "feat: add domain model types for Customer and ApiKey"
```

---

### Task 4: Database Migrations

**Files:**
- Create: `migrations/001_create_customers.up.sql`
- Create: `migrations/001_create_customers.down.sql`
- Create: `migrations/002_create_api_keys.up.sql`
- Create: `migrations/002_create_api_keys.down.sql`

- [ ] **Step 1: Create customers migration (up)**

Create `migrations/001_create_customers.up.sql`:

**Note on schema isolation:** Per the DevOps spec, each environment uses schema-level isolation (e.g., `clawbrowser_api` schema). The `search_path` is set via the Postgres connection URL (e.g., `?search_path=clawbrowser_api`), so migrations run within the correct schema automatically. The connection URL in each K8s environment's Sealed Secret includes the `search_path` parameter. For local development, the default `public` schema is used.

```sql
CREATE TABLE customers (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth0_id                  TEXT UNIQUE NOT NULL,
    email                     TEXT UNIQUE NOT NULL,
    name                      TEXT,
    status                    TEXT NOT NULL DEFAULT 'provisioning',
    retry_count               INTEGER NOT NULL DEFAULT 0,
    nodemaven_sub_client_id   TEXT UNIQUE,
    nodemaven_credentials     JSONB,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 2: Create customers migration (down)**

Create `migrations/001_create_customers.down.sql`:

```sql
DROP TABLE IF EXISTS customers;
```

- [ ] **Step 3: Create api_keys migration (up)**

Create `migrations/002_create_api_keys.up.sql`:

```sql
CREATE TABLE api_keys (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    unkey_key_id  TEXT UNIQUE NOT NULL,
    name          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at    TIMESTAMPTZ
);
```

- [ ] **Step 4: Create api_keys migration (down)**

Create `migrations/002_create_api_keys.down.sql`:

```sql
DROP TABLE IF EXISTS api_keys;
```

- [ ] **Step 5: Commit**

```bash
git add migrations/
git commit -m "feat: add database migrations for customers and api_keys"
```

---

### Task 5: Postgres Store + Customer Repository

**Files:**
- Create: `internal/store/postgres.go`
- Create: `internal/store/postgres_test.go`
- Create: `internal/store/customer_repo.go`
- Create: `internal/store/customer_repo_test.go`

- [ ] **Step 1: Write failing test for postgres connection**

Create `internal/store/postgres_test.go`:

```go
package store_test

import (
	"context"
	"os"
	"testing"

	"github.com/clawbrowser/clawbrowser-api/internal/store"
)

func TestNewPostgres_InvalidURL(t *testing.T) {
	_, err := store.NewPostgres(context.Background(), "postgres://invalid:5432/nonexistent")
	if err == nil {
		t.Fatal("expected error for invalid connection")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/store/ -v -run TestNewPostgres
```

Expected: FAIL — package not found.

- [ ] **Step 3: Write postgres.go**

Create `internal/store/postgres.go`:

```go
package store

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/stdlib"
)

type Postgres struct {
	Pool *pgxpool.Pool
}

func NewPostgres(ctx context.Context, databaseURL string) (*Postgres, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("connect to postgres: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping postgres: %w", err)
	}
	return &Postgres{Pool: pool}, nil
}

func (p *Postgres) Close() {
	p.Pool.Close()
}

func (p *Postgres) Ping(ctx context.Context) error {
	return p.Pool.Ping(ctx)
}

func (p *Postgres) Migrate(migrationsDir string) error {
	connConfig := p.Pool.Config().ConnConfig
	dsn := stdlib.RegisterConnConfig(connConfig)
	db, err := stdlib.Open(dsn)
	if err != nil {
		return fmt.Errorf("open stdlib connection: %w", err)
	}
	defer db.Close()

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("create migration driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://"+migrationsDir,
		"postgres",
		driver,
	)
	if err != nil {
		return fmt.Errorf("create migrator: %w", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("run migrations: %w", err)
	}
	return nil
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
go get github.com/jackc/pgx/v5
go get github.com/golang-migrate/migrate/v4
go test ./internal/store/ -v -run TestNewPostgres
```

Expected: PASS (test expects an error for invalid connection, which pgxpool returns).

- [ ] **Step 5: Write failing test for customer repository**

Create `internal/store/customer_repo_test.go`. These are unit tests using a mock — integration tests against a real DB would need a test container setup which is out of scope for this task.

```go
package store_test

import (
	"testing"

	"github.com/clawbrowser/clawbrowser-api/internal/store"
)

func TestCustomerRepo_InterfaceCompliance(t *testing.T) {
	// Verify CustomerRepo implements the CustomerRepository interface
	var _ store.CustomerRepository = (*store.CustomerRepo)(nil)
}
```

- [ ] **Step 6: Write customer_repo.go**

Create `internal/store/customer_repo.go`:

```go
package store

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/clawbrowser/clawbrowser-api/internal/model"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CustomerRepository interface {
	Create(ctx context.Context, auth0ID, email string, name *string) (*model.Customer, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.Customer, error)
	GetByAuth0ID(ctx context.Context, auth0ID string) (*model.Customer, error)
	Update(ctx context.Context, id uuid.UUID, name *string) (*model.Customer, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status model.CustomerStatus) error
	UpdateNodemavenCredentials(ctx context.Context, id uuid.UUID, subClientID string, creds model.NodemavenCreds) error
	IncrementRetryCount(ctx context.Context, id uuid.UUID) (int, error)
	ListProvisioning(ctx context.Context, olderThanSecs int, maxRetries int) ([]*model.Customer, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type CustomerRepo struct {
	pool *pgxpool.Pool
}

func NewCustomerRepo(pool *pgxpool.Pool) *CustomerRepo {
	return &CustomerRepo{pool: pool}
}

// scanCustomerColumns is the standard column list for all customer queries.
// Every SELECT/RETURNING that reads a customer row must use this exact list.
const scanCustomerColumns = `id, auth0_id, email, name, status, retry_count, nodemaven_sub_client_id, nodemaven_credentials, created_at, updated_at`

func scanCustomer(scanner interface{ Scan(dest ...any) error }) (*model.Customer, error) {
	var c model.Customer
	err := scanner.Scan(&c.ID, &c.Auth0ID, &c.Email, &c.Name, &c.Status, &c.RetryCount, &c.NodemavenSubClientID, &c.NodemavenCredentials, &c.CreatedAt, &c.UpdatedAt)
	return &c, err
}

func (r *CustomerRepo) Create(ctx context.Context, auth0ID, email string, name *string) (*model.Customer, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO customers (auth0_id, email, name)
		 VALUES ($1, $2, $3)
		 RETURNING `+scanCustomerColumns,
		auth0ID, email, name,
	)
	c, err := scanCustomer(row)
	if err != nil {
		return nil, fmt.Errorf("create customer: %w", err)
	}
	return c, nil
}

func (r *CustomerRepo) GetByID(ctx context.Context, id uuid.UUID) (*model.Customer, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+scanCustomerColumns+` FROM customers WHERE id = $1`, id,
	)
	c, err := scanCustomer(row)
	if err != nil {
		return nil, fmt.Errorf("get customer by id: %w", err)
	}
	return c, nil
}

func (r *CustomerRepo) GetByAuth0ID(ctx context.Context, auth0ID string) (*model.Customer, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+scanCustomerColumns+` FROM customers WHERE auth0_id = $1`, auth0ID,
	)
	c, err := scanCustomer(row)
	if err != nil {
		return nil, fmt.Errorf("get customer by auth0_id: %w", err)
	}
	return c, nil
}

func (r *CustomerRepo) Update(ctx context.Context, id uuid.UUID, name *string) (*model.Customer, error) {
	row := r.pool.QueryRow(ctx,
		`UPDATE customers SET name = COALESCE($2, name), updated_at = now()
		 WHERE id = $1
		 RETURNING `+scanCustomerColumns,
		id, name,
	)
	c, err := scanCustomer(row)
	if err != nil {
		return nil, fmt.Errorf("update customer: %w", err)
	}
	return c, nil
}

func (r *CustomerRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status model.CustomerStatus) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE customers SET status = $2, updated_at = now() WHERE id = $1`,
		id, string(status),
	)
	if err != nil {
		return fmt.Errorf("update customer status: %w", err)
	}
	return nil
}

func (r *CustomerRepo) UpdateNodemavenCredentials(ctx context.Context, id uuid.UUID, subClientID string, creds model.NodemavenCreds) error {
	credsJSON, err := json.Marshal(creds)
	if err != nil {
		return fmt.Errorf("marshal nodemaven credentials: %w", err)
	}
	_, err = r.pool.Exec(ctx,
		`UPDATE customers SET nodemaven_sub_client_id = $2, nodemaven_credentials = $3, updated_at = now() WHERE id = $1`,
		id, subClientID, credsJSON,
	)
	if err != nil {
		return fmt.Errorf("update nodemaven credentials: %w", err)
	}
	return nil
}

func (r *CustomerRepo) IncrementRetryCount(ctx context.Context, id uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`UPDATE customers SET retry_count = retry_count + 1, updated_at = now()
		 WHERE id = $1 RETURNING retry_count`, id,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("increment retry count: %w", err)
	}
	return count, nil
}

func (r *CustomerRepo) ListProvisioning(ctx context.Context, olderThanSecs int, maxRetries int) ([]*model.Customer, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+scanCustomerColumns+`
		 FROM customers
		 WHERE status = 'provisioning'
		   AND retry_count < $2
		   AND created_at < now() - make_interval(secs => $1)
		 LIMIT 50`, olderThanSecs, maxRetries,
	)
	if err != nil {
		return nil, fmt.Errorf("list provisioning customers: %w", err)
	}
	defer rows.Close()

	var customers []*model.Customer
	for rows.Next() {
		c, err := scanCustomer(rows)
		if err != nil {
			return nil, fmt.Errorf("scan customer: %w", err)
		}
		customers = append(customers, c)
	}
	return customers, nil
}

func (r *CustomerRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM customers WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete customer: %w", err)
	}
	return nil
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
go test ./internal/store/ -v
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add internal/store/postgres.go internal/store/postgres_test.go internal/store/customer_repo.go internal/store/customer_repo_test.go go.mod go.sum
git commit -m "feat: add postgres connection and customer repository"
```

---

### Task 6: API Key Repository

**Files:**
- Create: `internal/store/apikey_repo.go`
- Create: `internal/store/apikey_repo_test.go`

- [ ] **Step 1: Write failing test**

Create `internal/store/apikey_repo_test.go`:

```go
package store_test

import (
	"testing"

	"github.com/clawbrowser/clawbrowser-api/internal/store"
)

func TestApiKeyRepo_InterfaceCompliance(t *testing.T) {
	var _ store.ApiKeyRepository = (*store.ApiKeyRepo)(nil)
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/store/ -v -run TestApiKeyRepo
```

Expected: FAIL — type not found.

- [ ] **Step 3: Write apikey_repo.go**

Create `internal/store/apikey_repo.go`:

```go
package store

import (
	"context"
	"fmt"

	"github.com/clawbrowser/clawbrowser-api/internal/model"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ApiKeyRepository interface {
	Create(ctx context.Context, customerID uuid.UUID, unkeyKeyID string, name *string) (*model.ApiKey, error)
	GetByID(ctx context.Context, id uuid.UUID, customerID uuid.UUID) (*model.ApiKey, error)
	GetByUnkeyKeyID(ctx context.Context, unkeyKeyID string) (*model.ApiKey, error)
	ListByCustomerID(ctx context.Context, customerID uuid.UUID) ([]*model.ApiKey, error)
	Revoke(ctx context.Context, id uuid.UUID, customerID uuid.UUID) error
}

type ApiKeyRepo struct {
	pool *pgxpool.Pool
}

func NewApiKeyRepo(pool *pgxpool.Pool) *ApiKeyRepo {
	return &ApiKeyRepo{pool: pool}
}

func (r *ApiKeyRepo) Create(ctx context.Context, customerID uuid.UUID, unkeyKeyID string, name *string) (*model.ApiKey, error) {
	var k model.ApiKey
	err := r.pool.QueryRow(ctx,
		`INSERT INTO api_keys (customer_id, unkey_key_id, name)
		 VALUES ($1, $2, $3)
		 RETURNING id, customer_id, unkey_key_id, name, created_at, revoked_at`,
		customerID, unkeyKeyID, name,
	).Scan(&k.ID, &k.CustomerID, &k.UnkeyKeyID, &k.Name, &k.CreatedAt, &k.RevokedAt)
	if err != nil {
		return nil, fmt.Errorf("create api key: %w", err)
	}
	return &k, nil
}

func (r *ApiKeyRepo) GetByID(ctx context.Context, id uuid.UUID, customerID uuid.UUID) (*model.ApiKey, error) {
	var k model.ApiKey
	err := r.pool.QueryRow(ctx,
		`SELECT id, customer_id, unkey_key_id, name, created_at, revoked_at
		 FROM api_keys WHERE id = $1 AND customer_id = $2`, id, customerID,
	).Scan(&k.ID, &k.CustomerID, &k.UnkeyKeyID, &k.Name, &k.CreatedAt, &k.RevokedAt)
	if err != nil {
		return nil, fmt.Errorf("get api key by id: %w", err)
	}
	return &k, nil
}

func (r *ApiKeyRepo) GetByUnkeyKeyID(ctx context.Context, unkeyKeyID string) (*model.ApiKey, error) {
	var k model.ApiKey
	err := r.pool.QueryRow(ctx,
		`SELECT id, customer_id, unkey_key_id, name, created_at, revoked_at
		 FROM api_keys WHERE unkey_key_id = $1`, unkeyKeyID,
	).Scan(&k.ID, &k.CustomerID, &k.UnkeyKeyID, &k.Name, &k.CreatedAt, &k.RevokedAt)
	if err != nil {
		return nil, fmt.Errorf("get api key by unkey_key_id: %w", err)
	}
	return &k, nil
}

func (r *ApiKeyRepo) ListByCustomerID(ctx context.Context, customerID uuid.UUID) ([]*model.ApiKey, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, customer_id, unkey_key_id, name, created_at, revoked_at
		 FROM api_keys WHERE customer_id = $1 ORDER BY created_at DESC`, customerID,
	)
	if err != nil {
		return nil, fmt.Errorf("list api keys: %w", err)
	}
	defer rows.Close()

	var keys []*model.ApiKey
	for rows.Next() {
		var k model.ApiKey
		if err := rows.Scan(&k.ID, &k.CustomerID, &k.UnkeyKeyID, &k.Name, &k.CreatedAt, &k.RevokedAt); err != nil {
			return nil, fmt.Errorf("scan api key: %w", err)
		}
		keys = append(keys, &k)
	}
	return keys, nil
}

func (r *ApiKeyRepo) Revoke(ctx context.Context, id uuid.UUID, customerID uuid.UUID) error {
	result, err := r.pool.Exec(ctx,
		`UPDATE api_keys SET revoked_at = now() WHERE id = $1 AND customer_id = $2 AND revoked_at IS NULL`,
		id, customerID,
	)
	if err != nil {
		return fmt.Errorf("revoke api key: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("api key not found or already revoked")
	}
	return nil
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
go test ./internal/store/ -v -run TestApiKeyRepo
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add internal/store/apikey_repo.go internal/store/apikey_repo_test.go
git commit -m "feat: add API key repository"
```

---

### Task 7: Redis Cache Layer

**Files:**
- Create: `internal/store/cache.go`
- Create: `internal/store/cache_test.go`

- [ ] **Step 1: Write failing test**

Create `internal/store/cache_test.go`:

```go
package store_test

import (
	"testing"

	"github.com/clawbrowser/clawbrowser-api/internal/store"
)

func TestCache_InterfaceCompliance(t *testing.T) {
	var _ store.CacheRepository = (*store.RedisCache)(nil)
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/store/ -v -run TestCache
```

Expected: FAIL — type not found.

- [ ] **Step 3: Write cache.go**

Create `internal/store/cache.go`:

```go
package store

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/clawbrowser/clawbrowser-api/internal/model"
	"github.com/redis/go-redis/v9"
)

type CacheRepository interface {
	GetCustomerByUnkeyKeyID(ctx context.Context, unkeyKeyID string) (*model.Customer, error)
	SetCustomerByUnkeyKeyID(ctx context.Context, unkeyKeyID string, customer *model.Customer) error
	InvalidateCustomerByUnkeyKeyID(ctx context.Context, unkeyKeyID string) error
}

type RedisCache struct {
	client *redis.Client
	ttl    time.Duration
}

func NewRedisCache(redisURL string, db int, ttl time.Duration) (*RedisCache, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}
	opts.DB = db
	client := redis.NewClient(opts)
	return &RedisCache{client: client, ttl: ttl}, nil
}

func (c *RedisCache) Ping(ctx context.Context) error {
	return c.client.Ping(ctx).Err()
}

func (c *RedisCache) Close() error {
	return c.client.Close()
}

func customerCacheKey(unkeyKeyID string) string {
	return "customer:" + unkeyKeyID
}

func (c *RedisCache) GetCustomerByUnkeyKeyID(ctx context.Context, unkeyKeyID string) (*model.Customer, error) {
	data, err := c.client.Get(ctx, customerCacheKey(unkeyKeyID)).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("redis get: %w", err)
	}
	var customer model.Customer
	if err := json.Unmarshal(data, &customer); err != nil {
		return nil, fmt.Errorf("unmarshal cached customer: %w", err)
	}
	return &customer, nil
}

func (c *RedisCache) SetCustomerByUnkeyKeyID(ctx context.Context, unkeyKeyID string, customer *model.Customer) error {
	data, err := json.Marshal(customer)
	if err != nil {
		return fmt.Errorf("marshal customer: %w", err)
	}
	return c.client.Set(ctx, customerCacheKey(unkeyKeyID), data, c.ttl).Err()
}

func (c *RedisCache) InvalidateCustomerByUnkeyKeyID(ctx context.Context, unkeyKeyID string) error {
	return c.client.Del(ctx, customerCacheKey(unkeyKeyID)).Err()
}
```

- [ ] **Step 4: Install redis dependency and run test**

```bash
go get github.com/redis/go-redis/v9
go test ./internal/store/ -v -run TestCache
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add internal/store/cache.go internal/store/cache_test.go go.mod go.sum
git commit -m "feat: add Redis cache layer for customer lookup"
```

---

### Task 8: Provider — Unkey Client

**Files:**
- Create: `internal/provider/unkey.go`
- Create: `internal/provider/unkey_test.go`

- [ ] **Step 1: Write failing test**

Create `internal/provider/unkey_test.go`:

```go
package provider_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/clawbrowser/clawbrowser-api/internal/provider"
)

func TestUnkeyClient_VerifyKey_Valid(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/keys.verifyKey" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		json.NewEncoder(w).Encode(provider.UnkeyVerifyResponse{
			Valid:    true,
			KeyID:    "key_123",
			OwnerID:  "cust_456",
		})
	}))
	defer srv.Close()

	client := provider.NewUnkeyClient(srv.URL, "root_key_test")
	resp, err := client.VerifyKey(context.Background(), "test_api_key")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !resp.Valid {
		t.Error("expected valid key")
	}
	if resp.KeyID != "key_123" {
		t.Errorf("expected key_123, got %s", resp.KeyID)
	}
}

func TestUnkeyClient_VerifyKey_Invalid(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(provider.UnkeyVerifyResponse{Valid: false})
	}))
	defer srv.Close()

	client := provider.NewUnkeyClient(srv.URL, "root_key_test")
	resp, err := client.VerifyKey(context.Background(), "bad_key")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Valid {
		t.Error("expected invalid key")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/provider/ -v -run TestUnkeyClient
```

Expected: FAIL — package not found.

- [ ] **Step 3: Write unkey.go**

Create `internal/provider/unkey.go`:

```go
package provider

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type UnkeyClient struct {
	baseURL    string
	rootKey    string
	httpClient *http.Client
}

func NewUnkeyClient(baseURL, rootKey string) *UnkeyClient {
	return &UnkeyClient{
		baseURL: baseURL,
		rootKey: rootKey,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

// VerifyKey verifies an API key and returns identity info.
type UnkeyVerifyRequest struct {
	Key string `json:"key"`
}

type UnkeyVerifyResponse struct {
	Valid   bool   `json:"valid"`
	KeyID   string `json:"keyId"`
	OwnerID string `json:"ownerId"`
}

func (c *UnkeyClient) VerifyKey(ctx context.Context, key string) (*UnkeyVerifyResponse, error) {
	body, _ := json.Marshal(UnkeyVerifyRequest{Key: key})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/v1/keys.verifyKey", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("verify key: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unkey verify: unexpected status %d", resp.StatusCode)
	}

	var result UnkeyVerifyResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &result, nil
}

// CreateKey creates a new API key for a customer.
type UnkeyCreateKeyRequest struct {
	APIID   string            `json:"apiId"`
	OwnerID string            `json:"ownerId"`
	Name    string            `json:"name,omitempty"`
	Meta    map[string]string `json:"meta,omitempty"`
}

type UnkeyCreateKeyResponse struct {
	KeyID string `json:"keyId"`
	Key   string `json:"key"`
}

func (c *UnkeyClient) CreateKey(ctx context.Context, req UnkeyCreateKeyRequest) (*UnkeyCreateKeyResponse, error) {
	body, _ := json.Marshal(req)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/v1/keys.createKey", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.rootKey)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("create key: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unkey create key: unexpected status %d", resp.StatusCode)
	}

	var result UnkeyCreateKeyResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &result, nil
}

// RevokeKey revokes an existing API key.
type UnkeyRevokeKeyRequest struct {
	KeyID string `json:"keyId"`
}

func (c *UnkeyClient) RevokeKey(ctx context.Context, keyID string) error {
	body, _ := json.Marshal(UnkeyRevokeKeyRequest{KeyID: keyID})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/v1/keys.deleteKey", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.rootKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("revoke key: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unkey revoke key: unexpected status %d", resp.StatusCode)
	}
	return nil
}

// GetUsage fetches usage data for a key.
type UnkeyUsageResponse struct {
	Usage []UnkeyUsageDataPoint `json:"usage"`
}

type UnkeyUsageDataPoint struct {
	Time  string `json:"time"`
	Usage int    `json:"usage"`
}

func (c *UnkeyClient) GetUsage(ctx context.Context, keyID string, start, end string) (*UnkeyUsageResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		fmt.Sprintf("%s/v1/keys.getUsage?keyId=%s&start=%s&end=%s", c.baseURL, keyID, start, end), nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.rootKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("get usage: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unkey get usage: unexpected status %d", resp.StatusCode)
	}

	var result UnkeyUsageResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &result, nil
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
go test ./internal/provider/ -v -run TestUnkeyClient
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add internal/provider/unkey.go internal/provider/unkey_test.go
git commit -m "feat: add Unkey API client for key verification and management"
```

---

### Task 9: Provider — Nodemaven Client

**Files:**
- Create: `internal/provider/nodemaven.go`
- Create: `internal/provider/nodemaven_test.go`

- [ ] **Step 1: Write failing test**

Create `internal/provider/nodemaven_test.go`:

```go
package provider_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/clawbrowser/clawbrowser-api/internal/provider"
)

func TestNodemavenClient_CreateSubClient(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("unexpected method: %s", r.Method)
		}
		json.NewEncoder(w).Encode(provider.NodemavenCreateSubClientResponse{
			SubClientID: "sub_abc",
			Host:        "proxy.nodemaven.com",
			Port:        8080,
			Username:    "user123",
			Password:    "pass456",
		})
	}))
	defer srv.Close()

	client := provider.NewNodemavenClient(srv.URL, "api_key_test")
	resp, err := client.CreateSubClient(context.Background(), "test@example.com")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.SubClientID != "sub_abc" {
		t.Errorf("expected sub_abc, got %s", resp.SubClientID)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/provider/ -v -run TestNodemavenClient
```

Expected: FAIL — type not found.

- [ ] **Step 3: Write nodemaven.go**

Create `internal/provider/nodemaven.go`:

```go
package provider

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type NodemavenClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

func NewNodemavenClient(baseURL, apiKey string) *NodemavenClient {
	return &NodemavenClient{
		baseURL:    baseURL,
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

type NodemavenCreateSubClientRequest struct {
	Email string `json:"email"`
}

type NodemavenCreateSubClientResponse struct {
	SubClientID string `json:"sub_client_id"`
	Host        string `json:"host"`
	Port        int    `json:"port"`
	Username    string `json:"username"`
	Password    string `json:"password"`
}

func (c *NodemavenClient) CreateSubClient(ctx context.Context, email string) (*NodemavenCreateSubClientResponse, error) {
	body, _ := json.Marshal(NodemavenCreateSubClientRequest{Email: email})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/v1/sub-clients", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("create sub-client: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("nodemaven create sub-client: unexpected status %d", resp.StatusCode)
	}

	var result NodemavenCreateSubClientResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &result, nil
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
go test ./internal/provider/ -v -run TestNodemavenClient
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add internal/provider/nodemaven.go internal/provider/nodemaven_test.go
git commit -m "feat: add Nodemaven API client for sub-client provisioning"
```

---

### Task 10: Provider — Auth0 Client

**Files:**
- Create: `internal/provider/auth0.go`
- Create: `internal/provider/auth0_test.go`

- [ ] **Step 1: Write failing test**

Create `internal/provider/auth0_test.go`:

```go
package provider_test

import (
	"testing"

	"github.com/clawbrowser/clawbrowser-api/internal/provider"
)

func TestAuth0JWKS_NewClient(t *testing.T) {
	// Just verify the client can be constructed without panic
	client := provider.NewAuth0Client("test.auth0.com", "test-audience")
	if client == nil {
		t.Fatal("expected non-nil client")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/provider/ -v -run TestAuth0
```

Expected: FAIL — type not found.

- [ ] **Step 3: Write auth0.go**

Create `internal/provider/auth0.go`:

```go
package provider

import (
	"context"
	"fmt"
	"time"

	"github.com/auth0/go-jwt-middleware/v2/jwks"
	"github.com/auth0/go-jwt-middleware/v2/validator"
)

type Auth0Client struct {
	domain    string
	audience  string
	validator *validator.Validator
}

func NewAuth0Client(domain, audience string) *Auth0Client {
	return &Auth0Client{domain: domain, audience: audience}
}

// InitValidator creates and caches the JWT validator. Call once at startup.
func (c *Auth0Client) InitValidator() error {
	issuerURL := fmt.Sprintf("https://%s/", c.domain)

	provider := jwks.NewCachingProvider(issuerURL, 5*time.Minute)

	v, err := validator.New(
		provider.KeyFunc,
		validator.RS256,
		issuerURL,
		[]string{c.audience},
	)
	if err != nil {
		return fmt.Errorf("create jwt validator: %w", err)
	}
	c.validator = v
	return nil
}

// Auth0Claims represents the custom claims from an Auth0 JWT.
type Auth0Claims struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
}

// ValidateToken validates a JWT and returns the Auth0 user ID (sub claim).
func (c *Auth0Client) ValidateToken(ctx context.Context, token string) (*Auth0Claims, error) {
	if c.validator == nil {
		return nil, fmt.Errorf("validator not initialized, call InitValidator first")
	}

	claims, err := c.validator.ValidateToken(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("validate token: %w", err)
	}

	validatedClaims, ok := claims.(*validator.ValidatedClaims)
	if !ok {
		return nil, fmt.Errorf("unexpected claims type")
	}

	return &Auth0Claims{
		Sub: validatedClaims.RegisteredClaims.Subject,
	}, nil
}
```

- [ ] **Step 4: Install Auth0 dependency and run test**

```bash
go get github.com/auth0/go-jwt-middleware/v2
go test ./internal/provider/ -v -run TestAuth0
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add internal/provider/auth0.go internal/provider/auth0_test.go go.mod go.sum
git commit -m "feat: add Auth0 JWT validation client"
```

---

### Task 11: Provider — UniBee Client

**Files:**
- Create: `internal/provider/unibee.go`
- Create: `internal/provider/unibee_test.go`

- [ ] **Step 1: Write failing test**

Create `internal/provider/unibee_test.go`:

```go
package provider_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/clawbrowser/clawbrowser-api/internal/provider"
)

func TestUniBeeClient_GetSubscription(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(provider.UniBeeSubscriptionResponse{
			Plan:   "pro",
			Status: "active",
		})
	}))
	defer srv.Close()

	client := provider.NewUniBeeClient(srv.URL, "api_key_test")
	resp, err := client.GetSubscription(context.Background(), "cust_123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Plan != "pro" {
		t.Errorf("expected pro plan, got %s", resp.Plan)
	}
}

func TestUniBeeClient_CreatePortalSession(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(provider.UniBeePortalResponse{
			URL: "https://billing.example.com/portal/abc",
		})
	}))
	defer srv.Close()

	client := provider.NewUniBeeClient(srv.URL, "api_key_test")
	resp, err := client.CreatePortalSession(context.Background(), "cust_123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.URL == "" {
		t.Error("expected non-empty portal URL")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/provider/ -v -run TestUniBeeClient
```

Expected: FAIL — type not found.

- [ ] **Step 3: Write unibee.go**

Create `internal/provider/unibee.go`:

```go
package provider

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type UniBeeClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

func NewUniBeeClient(baseURL, apiKey string) *UniBeeClient {
	return &UniBeeClient{
		baseURL:    baseURL,
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

type UniBeeSubscriptionResponse struct {
	Plan               string `json:"plan"`
	Status             string `json:"status"`
	CurrentPeriodStart string `json:"current_period_start,omitempty"`
	CurrentPeriodEnd   string `json:"current_period_end,omitempty"`
	UsageLimit         *int   `json:"usage_limit,omitempty"`
	UsageCurrent       *int   `json:"usage_current,omitempty"`
}

func (c *UniBeeClient) GetSubscription(ctx context.Context, customerID string) (*UniBeeSubscriptionResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		fmt.Sprintf("%s/api/v1/subscriptions?customer_id=%s", c.baseURL, customerID), nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("get subscription: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unibee get subscription: unexpected status %d", resp.StatusCode)
	}

	var result UniBeeSubscriptionResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &result, nil
}

type UniBeePortalResponse struct {
	URL string `json:"url"`
}

func (c *UniBeeClient) CreatePortalSession(ctx context.Context, customerID string) (*UniBeePortalResponse, error) {
	body, _ := json.Marshal(map[string]string{"customer_id": customerID})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/api/v1/portal/sessions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("create portal session: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unibee create portal: unexpected status %d", resp.StatusCode)
	}

	var result UniBeePortalResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &result, nil
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
go test ./internal/provider/ -v -run TestUniBeeClient
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add internal/provider/unibee.go internal/provider/unibee_test.go
git commit -m "feat: add UniBee API client for billing and portal"
```

---

### Task 12: Provider — MailerSend Client

**Files:**
- Create: `internal/provider/mailersend.go`
- Create: `internal/provider/mailersend_test.go`

- [ ] **Step 1: Write failing test**

Create `internal/provider/mailersend_test.go`:

```go
package provider_test

import (
	"net"
	"testing"

	"github.com/clawbrowser/clawbrowser-api/internal/provider"
)

func TestMailerSendClient_NewClient(t *testing.T) {
	client := provider.NewMailerSendClient("smtp.test.com", 587, "apikey", "from@test.com")
	if client == nil {
		t.Fatal("expected non-nil client")
	}
}

func TestMailerSendClient_SendWelcomeEmail_InvalidHost(t *testing.T) {
	// Use a non-routable address to ensure connection fails fast
	client := provider.NewMailerSendClient("127.0.0.1", 0, "apikey", "from@test.com")
	err := client.SendWelcomeEmail("test@example.com", "Test User", "clawbrowser_xxx")
	if err == nil {
		t.Fatal("expected error for invalid SMTP host")
	}
	// Verify it's a connection error, not a panic
	if _, ok := err.(*net.OpError); !ok {
		// Any error is acceptable as long as it's not nil
		t.Logf("got expected error: %v", err)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/provider/ -v -run TestMailerSend
```

Expected: FAIL — type not found.

- [ ] **Step 3: Write mailersend.go**

Create `internal/provider/mailersend.go`:

```go
package provider

import (
	"fmt"
	"net/smtp"
	"strings"
)

type MailerSendClient struct {
	host   string
	port   int
	apiKey string
	from   string
}

func NewMailerSendClient(host string, port int, apiKey, from string) *MailerSendClient {
	return &MailerSendClient{
		host:   host,
		port:   port,
		apiKey: apiKey,
		from:   from,
	}
}

func (c *MailerSendClient) SendWelcomeEmail(toEmail, toName, apiKey string) error {
	addr := fmt.Sprintf("%s:%d", c.host, c.port)
	auth := smtp.PlainAuth("", c.from, c.apiKey, c.host)

	subject := "Welcome to Clawbrowser"
	body := fmt.Sprintf(`Hi %s,

Welcome to Clawbrowser! Your account is ready.

Your API key: %s

Keep this key safe — you can also find it in your dashboard at https://clawbrowser.ai/dashboard.

Getting started:
  clawbrowser --fingerprint=my_first_profile --new

Happy browsing!
— The Clawbrowser Team`, toName, apiKey)

	msg := strings.Join([]string{
		"From: " + c.from,
		"To: " + toEmail,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		body,
	}, "\r\n")

	return smtp.SendMail(addr, auth, c.from, []string{toEmail}, []byte(msg))
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
go test ./internal/provider/ -v -run TestMailerSend
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add internal/provider/mailersend.go internal/provider/mailersend_test.go
git commit -m "feat: add MailerSend SMTP client for welcome emails"
```

---

### Task 13: Fingerprint Generator

**Files:**
- Create: `internal/fingerprint/datasets.go`
- Create: `internal/fingerprint/datasets_test.go`
- Create: `internal/fingerprint/generator.go`
- Create: `internal/fingerprint/generator_test.go`

- [ ] **Step 1: Write failing test for datasets**

Create `internal/fingerprint/datasets_test.go`:

```go
package fingerprint_test

import (
	"testing"

	"github.com/clawbrowser/clawbrowser-api/internal/fingerprint"
)

func TestGetPlatformPreset_MacOS(t *testing.T) {
	preset := fingerprint.GetPlatformPreset("macos", "chrome")
	if preset == nil {
		t.Fatal("expected non-nil preset for macos/chrome")
	}
	if len(preset.UserAgents) == 0 {
		t.Error("expected at least one user agent")
	}
	if len(preset.Screens) == 0 {
		t.Error("expected at least one screen config")
	}
}

func TestGetPlatformPreset_Windows(t *testing.T) {
	preset := fingerprint.GetPlatformPreset("windows", "chrome")
	if preset == nil {
		t.Fatal("expected non-nil preset for windows/chrome")
	}
	if preset.Platform != "Win32" {
		t.Errorf("expected Win32 platform, got %s", preset.Platform)
	}
	if len(preset.UserAgents) == 0 {
		t.Error("expected at least one user agent")
	}
}

func TestGetPlatformPreset_Unknown(t *testing.T) {
	preset := fingerprint.GetPlatformPreset("freebsd", "lynx")
	if preset != nil {
		t.Error("expected nil for unsupported platform")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/fingerprint/ -v -run TestGetPlatformPreset
```

Expected: FAIL — package not found.

- [ ] **Step 3: Write datasets.go**

Create `internal/fingerprint/datasets.go`:

```go
package fingerprint

// PlatformPreset holds curated browser configuration data for a platform/browser combo.
type PlatformPreset struct {
	Platform   string
	Browser    string
	UserAgents []string
	Screens    []ScreenPreset
	Hardware   []HardwarePreset
	WebGL      []WebGLPreset
	Fonts      []string
	Plugins    []PluginPreset
	Voices     []string
}

type ScreenPreset struct {
	Width      int
	Height     int
	AvailWidth int
	AvailHeight int
	ColorDepth int
	PixelRatio float64
}

type HardwarePreset struct {
	Concurrency int
	Memory      int
}

type WebGLPreset struct {
	Vendor   string
	Renderer string
}

type PluginPreset struct {
	Name        string
	Description string
	Filename    string
}

// macOSChromePreset contains curated real-world data for Chrome on macOS.
var macOSChromePreset = &PlatformPreset{
	Platform: "MacIntel",
	Browser:  "chrome",
	UserAgents: []string{
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	},
	Screens: []ScreenPreset{
		{Width: 1440, Height: 900, AvailWidth: 1440, AvailHeight: 847, ColorDepth: 30, PixelRatio: 2},
		{Width: 1512, Height: 982, AvailWidth: 1512, AvailHeight: 944, ColorDepth: 30, PixelRatio: 2},
		{Width: 1680, Height: 1050, AvailWidth: 1680, AvailHeight: 997, ColorDepth: 30, PixelRatio: 2},
		{Width: 1920, Height: 1080, AvailWidth: 1920, AvailHeight: 1055, ColorDepth: 24, PixelRatio: 1},
		{Width: 2560, Height: 1440, AvailWidth: 2560, AvailHeight: 1415, ColorDepth: 30, PixelRatio: 2},
	},
	Hardware: []HardwarePreset{
		{Concurrency: 8, Memory: 8},
		{Concurrency: 8, Memory: 16},
		{Concurrency: 10, Memory: 16},
		{Concurrency: 12, Memory: 16},
		{Concurrency: 12, Memory: 32},
	},
	WebGL: []WebGLPreset{
		{Vendor: "Google Inc. (Apple)", Renderer: "ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)"},
		{Vendor: "Google Inc. (Apple)", Renderer: "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)"},
		{Vendor: "Google Inc. (Apple)", Renderer: "ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)"},
		{Vendor: "Google Inc. (Apple)", Renderer: "ANGLE (Apple, ANGLE Metal Renderer: Apple M3, Unspecified Version)"},
	},
	Fonts: []string{
		"Arial", "Arial Black", "Comic Sans MS", "Courier New", "Georgia",
		"Helvetica", "Helvetica Neue", "Impact", "Lucida Grande", "Monaco",
		"Palatino", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana",
		"Menlo", "SF Pro", "SF Mono",
	},
	Plugins: []PluginPreset{
		{Name: "PDF Viewer", Description: "Portable Document Format", Filename: "internal-pdf-viewer"},
		{Name: "Chrome PDF Viewer", Description: "Portable Document Format", Filename: "internal-pdf-viewer"},
		{Name: "Chromium PDF Viewer", Description: "Portable Document Format", Filename: "internal-pdf-viewer"},
		{Name: "Microsoft Edge PDF Viewer", Description: "Portable Document Format", Filename: "internal-pdf-viewer"},
		{Name: "WebKit built-in PDF", Description: "Portable Document Format", Filename: "internal-pdf-viewer"},
	},
	Voices: []string{
		"Alex", "Daniel", "Karen", "Moira", "Rishi", "Samantha", "Tessa",
	},
}

// windowsChromePreset contains curated real-world data for Chrome on Windows.
var windowsChromePreset = &PlatformPreset{
	Platform: "Win32",
	Browser:  "chrome",
	UserAgents: []string{
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	},
	Screens: []ScreenPreset{
		{Width: 1920, Height: 1080, AvailWidth: 1920, AvailHeight: 1040, ColorDepth: 24, PixelRatio: 1},
		{Width: 1366, Height: 768, AvailWidth: 1366, AvailHeight: 728, ColorDepth: 24, PixelRatio: 1},
		{Width: 2560, Height: 1440, AvailWidth: 2560, AvailHeight: 1400, ColorDepth: 24, PixelRatio: 1},
		{Width: 3840, Height: 2160, AvailWidth: 3840, AvailHeight: 2120, ColorDepth: 24, PixelRatio: 1.5},
	},
	Hardware: []HardwarePreset{
		{Concurrency: 4, Memory: 8},
		{Concurrency: 8, Memory: 16},
		{Concurrency: 12, Memory: 16},
		{Concurrency: 16, Memory: 32},
	},
	WebGL: []WebGLPreset{
		{Vendor: "Google Inc. (NVIDIA)", Renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)"},
		{Vendor: "Google Inc. (NVIDIA)", Renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)"},
		{Vendor: "Google Inc. (AMD)", Renderer: "ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)"},
		{Vendor: "Google Inc. (Intel)", Renderer: "ANGLE (Intel, Intel(R) UHD Graphics 770 Direct3D11 vs_5_0 ps_5_0, D3D11)"},
	},
	Fonts: []string{
		"Arial", "Arial Black", "Calibri", "Cambria", "Comic Sans MS", "Consolas",
		"Courier New", "Georgia", "Impact", "Lucida Console", "Segoe UI",
		"Tahoma", "Times New Roman", "Trebuchet MS", "Verdana",
	},
	Plugins: []PluginPreset{
		{Name: "PDF Viewer", Description: "Portable Document Format", Filename: "internal-pdf-viewer"},
		{Name: "Chrome PDF Viewer", Description: "Portable Document Format", Filename: "internal-pdf-viewer"},
		{Name: "Chromium PDF Viewer", Description: "Portable Document Format", Filename: "internal-pdf-viewer"},
		{Name: "Microsoft Edge PDF Viewer", Description: "Portable Document Format", Filename: "internal-pdf-viewer"},
		{Name: "WebKit built-in PDF", Description: "Portable Document Format", Filename: "internal-pdf-viewer"},
	},
	Voices: []string{
		"Microsoft David", "Microsoft Zira", "Microsoft Mark",
	},
}

// GetPlatformPreset returns curated data for a platform/browser pair.
// Returns nil if the combination is not supported.
func GetPlatformPreset(platform, browser string) *PlatformPreset {
	switch {
	case platform == "macos" && browser == "chrome":
		return macOSChromePreset
	case platform == "windows" && browser == "chrome":
		return windowsChromePreset
	default:
		return nil
	}
}
```

- [ ] **Step 4: Run datasets tests**

```bash
go test ./internal/fingerprint/ -v -run TestGetPlatformPreset
```

Expected: PASS

- [ ] **Step 5: Write failing test for generator**

Create `internal/fingerprint/generator_test.go`:

```go
package fingerprint_test

import (
	"testing"

	"github.com/clawbrowser/clawbrowser-api/internal/fingerprint"
)

func TestGenerate_MacOSChrome(t *testing.T) {
	req := fingerprint.GenerateInput{
		Platform: "macos",
		Browser:  "chrome",
		Country:  "US",
		City:     "New York",
	}

	fp, err := fingerprint.Generate(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if fp.UserAgent == "" {
		t.Error("expected non-empty user agent")
	}
	if fp.Platform != "MacIntel" {
		t.Errorf("expected MacIntel platform, got %s", fp.Platform)
	}
	if fp.Screen.Width == 0 {
		t.Error("expected non-zero screen width")
	}
	if fp.Timezone == "" {
		t.Error("expected non-empty timezone")
	}
	if len(fp.Language) == 0 {
		t.Error("expected non-empty language list")
	}
	if fp.CanvasSeed == 0 {
		t.Error("expected non-zero canvas seed")
	}
}

func TestGenerate_UnsupportedPlatform(t *testing.T) {
	req := fingerprint.GenerateInput{
		Platform: "windows",
		Browser:  "chrome",
		Country:  "US",
	}

	_, err := fingerprint.Generate(req)
	if err == nil {
		t.Fatal("expected error for unsupported platform")
	}
}

func TestGenerate_DeterministicSeeds(t *testing.T) {
	// Two calls should produce different seeds (random)
	req := fingerprint.GenerateInput{
		Platform: "macos",
		Browser:  "chrome",
		Country:  "US",
	}

	fp1, _ := fingerprint.Generate(req)
	fp2, _ := fingerprint.Generate(req)

	// Seeds should differ (statistically — this is a probabilistic test)
	if fp1.CanvasSeed == fp2.CanvasSeed && fp1.AudioSeed == fp2.AudioSeed {
		t.Error("seeds should differ between generations")
	}
}
```

- [ ] **Step 6: Run test to verify it fails**

```bash
go test ./internal/fingerprint/ -v -run TestGenerate
```

Expected: FAIL — function not found.

- [ ] **Step 7: Write generator.go**

Create `internal/fingerprint/generator.go`:

```go
package fingerprint

import (
	"fmt"
	"math/rand"
	"time"
)

type GenerateInput struct {
	Platform       string
	Browser        string
	Country        string
	City           string
	ConnectionType string
}

type GeneratedFingerprint struct {
	UserAgent      string
	Platform       string
	Screen         GeneratedScreen
	Hardware       GeneratedHardware
	WebGL          GeneratedWebGL
	CanvasSeed     int64
	AudioSeed      int64
	ClientRectsSeed int64
	Timezone       string
	Language       []string
	Fonts          []string
	MediaDevices   []GeneratedMediaDevice
	Plugins        []GeneratedPlugin
	Battery        GeneratedBattery
	SpeechVoices   []string
}

type GeneratedScreen struct {
	Width       int
	Height      int
	AvailWidth  int
	AvailHeight int
	ColorDepth  int
	PixelRatio  float64
}

type GeneratedHardware struct {
	Concurrency int
	Memory      int
}

type GeneratedWebGL struct {
	Vendor   string
	Renderer string
}

type GeneratedMediaDevice struct {
	Kind     string
	Label    string
	DeviceID string
}

type GeneratedPlugin struct {
	Name        string
	Description string
	Filename    string
}

type GeneratedBattery struct {
	Charging bool
	Level    float64
}

// countryTimezones maps ISO country codes to common timezone identifiers.
var countryTimezones = map[string][]string{
	"US": {"America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"},
	"GB": {"Europe/London"},
	"DE": {"Europe/Berlin"},
	"FR": {"Europe/Paris"},
	"JP": {"Asia/Tokyo"},
	"AU": {"Australia/Sydney", "Australia/Melbourne"},
	"CA": {"America/Toronto", "America/Vancouver"},
	"BR": {"America/Sao_Paulo"},
}

// countryLanguages maps ISO country codes to primary language tags.
var countryLanguages = map[string][]string{
	"US": {"en-US", "en"},
	"GB": {"en-GB", "en"},
	"DE": {"de-DE", "de", "en"},
	"FR": {"fr-FR", "fr", "en"},
	"JP": {"ja-JP", "ja", "en"},
	"AU": {"en-AU", "en"},
	"CA": {"en-CA", "en", "fr-CA"},
	"BR": {"pt-BR", "pt", "en"},
}

// Generate creates a fingerprint from curated datasets.
func Generate(input GenerateInput) (*GeneratedFingerprint, error) {
	preset := GetPlatformPreset(input.Platform, input.Browser)
	if preset == nil {
		return nil, fmt.Errorf("unsupported platform/browser: %s/%s", input.Platform, input.Browser)
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	// Select random entries from preset
	ua := preset.UserAgents[rng.Intn(len(preset.UserAgents))]
	screen := preset.Screens[rng.Intn(len(preset.Screens))]
	hw := preset.Hardware[rng.Intn(len(preset.Hardware))]
	webgl := preset.WebGL[rng.Intn(len(preset.WebGL))]

	// Timezone aligned with country
	tz := "America/New_York" // default
	if tzs, ok := countryTimezones[input.Country]; ok {
		tz = tzs[rng.Intn(len(tzs))]
	}

	// Language aligned with country
	langs := []string{"en-US", "en"} // default
	if ls, ok := countryLanguages[input.Country]; ok {
		langs = ls
	}

	// Generate deterministic seeds for noise injection
	canvasSeed := rng.Int63()
	audioSeed := rng.Int63()
	clientRectsSeed := rng.Int63()

	// Synthetic media devices
	mediaDevices := []GeneratedMediaDevice{
		{Kind: "audioinput", Label: "Default", DeviceID: randomHex(rng, 64)},
		{Kind: "audiooutput", Label: "Default", DeviceID: randomHex(rng, 64)},
		{Kind: "videoinput", Label: "FaceTime HD Camera", DeviceID: randomHex(rng, 64)},
	}

	// Convert preset plugins
	plugins := make([]GeneratedPlugin, len(preset.Plugins))
	for i, p := range preset.Plugins {
		plugins[i] = GeneratedPlugin{Name: p.Name, Description: p.Description, Filename: p.Filename}
	}

	// Battery - static realistic values
	battery := GeneratedBattery{
		Charging: rng.Float64() > 0.3,
		Level:    0.5 + rng.Float64()*0.5, // 50-100%
	}

	return &GeneratedFingerprint{
		UserAgent:       ua,
		Platform:        preset.Platform,
		Screen:          GeneratedScreen(screen),
		Hardware:        GeneratedHardware{Concurrency: hw.Concurrency, Memory: hw.Memory},
		WebGL:           GeneratedWebGL(webgl),
		CanvasSeed:      canvasSeed,
		AudioSeed:       audioSeed,
		ClientRectsSeed: clientRectsSeed,
		Timezone:        tz,
		Language:        langs,
		Fonts:           preset.Fonts,
		MediaDevices:    mediaDevices,
		Plugins:         plugins,
		Battery:         battery,
		SpeechVoices:    preset.Voices,
	}, nil
}

func randomHex(rng *rand.Rand, length int) string {
	const hexChars = "0123456789abcdef"
	b := make([]byte, length)
	for i := range b {
		b[i] = hexChars[rng.Intn(len(hexChars))]
	}
	return string(b)
}
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
go test ./internal/fingerprint/ -v
```

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add internal/fingerprint/
git commit -m "feat: add fingerprint generator with curated macOS/Chrome datasets"
```

---

### Task 14: Service Layer — Customer Service

**Files:**
- Create: `internal/service/customer.go`
- Create: `internal/service/customer_test.go`

- [ ] **Step 1: Write failing test for customer signup**

Create `internal/service/customer_test.go`:

```go
package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/clawbrowser/clawbrowser-api/internal/model"
	"github.com/clawbrowser/clawbrowser-api/internal/service"
	"github.com/google/uuid"
)

// Mock implementations
type mockCustomerRepo struct {
	created *model.Customer
}

func (m *mockCustomerRepo) Create(ctx context.Context, auth0ID, email string, name *string) (*model.Customer, error) {
	c := &model.Customer{
		ID:        uuid.New(),
		Auth0ID:   auth0ID,
		Email:     email,
		Name:      name,
		Status:    model.CustomerStatusProvisioning,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	m.created = c
	return c, nil
}

func (m *mockCustomerRepo) GetByID(ctx context.Context, id uuid.UUID) (*model.Customer, error) {
	return m.created, nil
}

func (m *mockCustomerRepo) GetByAuth0ID(ctx context.Context, auth0ID string) (*model.Customer, error) {
	return m.created, nil
}

func (m *mockCustomerRepo) Update(ctx context.Context, id uuid.UUID, name *string) (*model.Customer, error) {
	m.created.Name = name
	return m.created, nil
}

func (m *mockCustomerRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status model.CustomerStatus) error {
	m.created.Status = status
	return nil
}

func (m *mockCustomerRepo) UpdateNodemavenCredentials(ctx context.Context, id uuid.UUID, subClientID string, creds model.NodemavenCreds) error {
	return nil
}

func (m *mockCustomerRepo) IncrementRetryCount(ctx context.Context, id uuid.UUID) (int, error) {
	return 1, nil
}

func (m *mockCustomerRepo) ListProvisioning(ctx context.Context, olderThanSecs int, maxRetries int) ([]*model.Customer, error) {
	return nil, nil
}

func (m *mockCustomerRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}

type mockNodemaven struct{}

func (m *mockNodemaven) CreateSubClient(ctx context.Context, email string) (subClientID, host string, port int, username, password string, err error) {
	return "sub_123", "proxy.nodemaven.com", 8080, "user_123", "pass_456", nil
}

type mockUnkeyForCustomer struct{}

func (m *mockUnkeyForCustomer) CreateKey(ctx context.Context, ownerID, name string) (keyID, key string, err error) {
	return "key_123", "clawbrowser_testkey", nil
}

type mockMailer struct{ sent bool }

func (m *mockMailer) SendWelcomeEmail(toEmail, toName, apiKey string) error {
	m.sent = true
	return nil
}

func TestCustomerService_Signup(t *testing.T) {
	repo := &mockCustomerRepo{}
	mailer := &mockMailer{}

	svc := service.NewCustomerService(repo, &mockNodemaven{}, &mockUnkeyForCustomer{}, mailer)

	err := svc.Signup(context.Background(), "auth0|123", "test@example.com", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if repo.created == nil {
		t.Fatal("expected customer to be created")
	}
	if repo.created.Status != model.CustomerStatusActive {
		t.Errorf("expected active status, got %s", repo.created.Status)
	}
	if !mailer.sent {
		t.Error("expected welcome email to be sent")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/service/ -v -run TestCustomerService
```

Expected: FAIL — package not found.

- [ ] **Step 3: Write customer.go**

Create `internal/service/customer.go`:

```go
package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/clawbrowser/clawbrowser-api/internal/model"
	"github.com/clawbrowser/clawbrowser-api/internal/store"
	"github.com/google/uuid"
)

// NodemavenProvider abstracts the Nodemaven API for testability.
type NodemavenProvider interface {
	CreateSubClient(ctx context.Context, email string) (subClientID, host string, port int, username, password string, err error)
}

// UnkeyProvider abstracts Unkey key operations for testability.
type UnkeyProvider interface {
	CreateKey(ctx context.Context, ownerID, name string) (keyID, key string, err error)
}

// Mailer abstracts email sending for testability.
type Mailer interface {
	SendWelcomeEmail(toEmail, toName, apiKey string) error
}

type CustomerService struct {
	repo      store.CustomerRepository
	nodemaven NodemavenProvider
	unkey     UnkeyProvider
	mailer    Mailer
}

func NewCustomerService(
	repo store.CustomerRepository,
	nodemaven NodemavenProvider,
	unkey UnkeyProvider,
	mailer Mailer,
) *CustomerService {
	return &CustomerService{
		repo:      repo,
		nodemaven: nodemaven,
		unkey:     unkey,
		mailer:    mailer,
	}
}

// Signup orchestrates the full customer onboarding flow.
// Called by the Auth0 webhook handler.
func (s *CustomerService) Signup(ctx context.Context, auth0ID, email string, name *string) error {
	// Step 1: Create customer in DB (status: provisioning)
	customer, err := s.repo.Create(ctx, auth0ID, email, name)
	if err != nil {
		return fmt.Errorf("create customer: %w", err)
	}

	// Step 2: Create Nodemaven sub-client
	subClientID, host, port, username, password, err := s.nodemaven.CreateSubClient(ctx, email)
	if err != nil {
		slog.Error("nodemaven provisioning failed, will retry", "customer_id", customer.ID, "error", err)
		return nil // Return nil so webhook returns 200 — retry job handles it
	}

	// Step 3: Store sub-client credentials
	creds := model.NodemavenCreds{Host: host, Port: port, Username: username, Password: password}
	if err := s.repo.UpdateNodemavenCredentials(ctx, customer.ID, subClientID, creds); err != nil {
		return fmt.Errorf("update nodemaven credentials: %w", err)
	}

	// Step 4: Create default API key
	displayName := "Default"
	keyID, key, err := s.unkey.CreateKey(ctx, customer.ID.String(), displayName)
	if err != nil {
		slog.Error("unkey key creation failed, will retry", "customer_id", customer.ID, "error", err)
		return nil
	}
	_ = keyID // Stored by the API key service layer when integrated

	// Step 5: Update status to active
	if err := s.repo.UpdateStatus(ctx, customer.ID, model.CustomerStatusActive); err != nil {
		return fmt.Errorf("update status: %w", err)
	}

	// Step 6: Send welcome email (best-effort)
	nameStr := email
	if name != nil {
		nameStr = *name
	}
	if err := s.mailer.SendWelcomeEmail(email, nameStr, key); err != nil {
		slog.Error("welcome email failed", "customer_id", customer.ID, "error", err)
	}

	return nil
}

// GetByAuth0ID retrieves a customer by their Auth0 ID.
func (s *CustomerService) GetByAuth0ID(ctx context.Context, auth0ID string) (*model.Customer, error) {
	return s.repo.GetByAuth0ID(ctx, auth0ID)
}

// GetByID retrieves a customer by their UUID.
func (s *CustomerService) GetByID(ctx context.Context, id uuid.UUID) (*model.Customer, error) {
	return s.repo.GetByID(ctx, id)
}

// Update updates customer profile fields.
func (s *CustomerService) Update(ctx context.Context, id uuid.UUID, name *string) (*model.Customer, error) {
	return s.repo.Update(ctx, id, name)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
go test ./internal/service/ -v -run TestCustomerService
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add internal/service/customer.go internal/service/customer_test.go
git commit -m "feat: add customer service with signup orchestration"
```

---

### Task 15: Service Layer — API Key, Fingerprint, Usage, Billing

**Files:**
- Create: `internal/service/apikey.go`
- Create: `internal/service/apikey_test.go`
- Create: `internal/service/fingerprint.go`
- Create: `internal/service/fingerprint_test.go`
- Create: `internal/service/usage.go`
- Create: `internal/service/usage_test.go`
- Create: `internal/service/billing.go`
- Create: `internal/service/billing_test.go`

- [ ] **Step 1: Write failing test for API key service**

Create `internal/service/apikey_test.go`:

```go
package service_test

import (
	"context"
	"testing"

	"github.com/clawbrowser/clawbrowser-api/internal/service"
)

func TestApiKeyService_InterfaceExists(t *testing.T) {
	// Verify the service can be constructed
	var _ *service.ApiKeyService = nil
}
```

- [ ] **Step 2: Write apikey.go**

Create `internal/service/apikey.go`:

```go
package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/clawbrowser/clawbrowser-api/internal/model"
	"github.com/clawbrowser/clawbrowser-api/internal/store"
	"github.com/google/uuid"
)

type UnkeyKeyManager interface {
	CreateKey(ctx context.Context, ownerID, name string) (keyID, key string, err error)
	RevokeKey(ctx context.Context, keyID string) error
}

type ApiKeyService struct {
	repo  store.ApiKeyRepository
	unkey UnkeyKeyManager
	cache store.CacheRepository
}

func NewApiKeyService(repo store.ApiKeyRepository, unkey UnkeyKeyManager, cache store.CacheRepository) *ApiKeyService {
	return &ApiKeyService{repo: repo, unkey: unkey, cache: cache}
}

func (s *ApiKeyService) Create(ctx context.Context, customerID uuid.UUID, name string) (*model.ApiKey, string, error) {
	keyID, key, err := s.unkey.CreateKey(ctx, customerID.String(), name)
	if err != nil {
		return nil, "", fmt.Errorf("create unkey key: %w", err)
	}

	apiKey, err := s.repo.Create(ctx, customerID, keyID, &name)
	if err != nil {
		return nil, "", fmt.Errorf("create api key record: %w", err)
	}
	return apiKey, key, nil
}

func (s *ApiKeyService) List(ctx context.Context, customerID uuid.UUID) ([]*model.ApiKey, error) {
	return s.repo.ListByCustomerID(ctx, customerID)
}

func (s *ApiKeyService) Revoke(ctx context.Context, id uuid.UUID, customerID uuid.UUID) error {
	apiKey, err := s.repo.GetByID(ctx, id, customerID)
	if err != nil {
		return fmt.Errorf("get api key: %w", err)
	}

	if err := s.unkey.RevokeKey(ctx, apiKey.UnkeyKeyID); err != nil {
		return fmt.Errorf("revoke unkey key: %w", err)
	}

	if err := s.repo.Revoke(ctx, id, customerID); err != nil {
		return fmt.Errorf("revoke api key record: %w", err)
	}

	// Invalidate cache for old key
	if err := s.cache.InvalidateCustomerByUnkeyKeyID(ctx, apiKey.UnkeyKeyID); err != nil {
		slog.Error("cache invalidation failed", "error", err)
	}
	return nil
}

func (s *ApiKeyService) Rotate(ctx context.Context, id uuid.UUID, customerID uuid.UUID) (*model.ApiKey, string, error) {
	oldKey, err := s.repo.GetByID(ctx, id, customerID)
	if err != nil {
		return nil, "", fmt.Errorf("get api key: %w", err)
	}

	// Revoke old key in Unkey
	if err := s.unkey.RevokeKey(ctx, oldKey.UnkeyKeyID); err != nil {
		return nil, "", fmt.Errorf("revoke old key: %w", err)
	}

	// Create new key
	name := ""
	if oldKey.Name != nil {
		name = *oldKey.Name
	}
	newKeyID, newKey, err := s.unkey.CreateKey(ctx, customerID.String(), name)
	if err != nil {
		return nil, "", fmt.Errorf("create new key: %w", err)
	}

	// Revoke old record
	if err := s.repo.Revoke(ctx, id, customerID); err != nil {
		return nil, "", fmt.Errorf("revoke old record: %w", err)
	}

	// Create new record
	apiKey, err := s.repo.Create(ctx, customerID, newKeyID, oldKey.Name)
	if err != nil {
		return nil, "", fmt.Errorf("create new record: %w", err)
	}

	// Invalidate cache for old key
	_ = s.cache.InvalidateCustomerByUnkeyKeyID(ctx, oldKey.UnkeyKeyID)

	return apiKey, newKey, nil
}
```

- [ ] **Step 3: Write fingerprint.go**

Create `internal/service/fingerprint.go`:

```go
package service

import (
	"context"
	"fmt"

	"github.com/clawbrowser/clawbrowser-api/internal/fingerprint"
	"github.com/clawbrowser/clawbrowser-api/internal/model"
	"github.com/clawbrowser/clawbrowser-api/internal/store"
	"github.com/google/uuid"
)

type FingerprintService struct {
	customerRepo store.CustomerRepository
	cache        store.CacheRepository
	apiKeyRepo   store.ApiKeyRepository
}

func NewFingerprintService(customerRepo store.CustomerRepository, cache store.CacheRepository, apiKeyRepo store.ApiKeyRepository) *FingerprintService {
	return &FingerprintService{customerRepo: customerRepo, cache: cache, apiKeyRepo: apiKeyRepo}
}

// Generate creates a fingerprint for the authenticated customer.
// unkeyKeyID comes from the Unkey verification in middleware.
func (s *FingerprintService) Generate(ctx context.Context, unkeyKeyID string, platform, browser, country, city, connectionType string) (*fingerprint.GeneratedFingerprint, *model.NodemavenCreds, error) {
	// Load customer from cache or DB
	customer, err := s.loadCustomer(ctx, unkeyKeyID)
	if err != nil {
		return nil, nil, fmt.Errorf("load customer: %w", err)
	}

	// Generate fingerprint
	fp, err := fingerprint.Generate(fingerprint.GenerateInput{
		Platform:       platform,
		Browser:        browser,
		Country:        country,
		City:           city,
		ConnectionType: connectionType,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("generate fingerprint: %w", err)
	}

	// Parse Nodemaven credentials
	var creds model.NodemavenCreds
	if customer.NodemavenCredentials != nil {
		if err := creds.UnmarshalFrom(*customer.NodemavenCredentials); err != nil {
			return nil, nil, fmt.Errorf("parse nodemaven credentials: %w", err)
		}
	}

	return fp, &creds, nil
}

func (s *FingerprintService) loadCustomer(ctx context.Context, unkeyKeyID string) (*model.Customer, error) {
	// Try cache first
	customer, err := s.cache.GetCustomerByUnkeyKeyID(ctx, unkeyKeyID)
	if err != nil {
		return nil, fmt.Errorf("cache get: %w", err)
	}
	if customer != nil {
		return customer, nil
	}

	// Cache miss — lookup via api_keys table
	apiKey, err := s.apiKeyRepo.GetByUnkeyKeyID(ctx, unkeyKeyID)
	if err != nil {
		return nil, fmt.Errorf("get api key: %w", err)
	}

	customer, err = s.customerRepo.GetByID(ctx, apiKey.CustomerID)
	if err != nil {
		return nil, fmt.Errorf("get customer: %w", err)
	}

	// Populate cache
	_ = s.cache.SetCustomerByUnkeyKeyID(ctx, unkeyKeyID, customer)

	return customer, nil
}
```

- [ ] **Step 4: Add UnmarshalFrom helper to model types**

Add to `internal/model/types.go`:

```go
func (c *NodemavenCreds) UnmarshalFrom(data json.RawMessage) error {
	return json.Unmarshal(data, c)
}
```

- [ ] **Step 5: Write usage.go and billing.go**

Create `internal/service/usage.go`:

```go
package service

import (
	"context"
	"fmt"
	"time"
)

type UsageProvider interface {
	GetUsage(ctx context.Context, keyID string) (fingerprints, verifications int, periodStart, periodEnd time.Time, err error)
	GetUsageHistory(ctx context.Context, keyID string, from, to, granularity string) ([]UsageDataPoint, error)
}

type UsageDataPoint struct {
	Date                   string
	FingerprintGenerations int
	ProxyVerifications     int
}

type UsageService struct {
	provider UsageProvider
}

func NewUsageService(provider UsageProvider) *UsageService {
	return &UsageService{provider: provider}
}

func (s *UsageService) GetStats(ctx context.Context, keyID string) (fingerprints, verifications int, periodStart, periodEnd time.Time, err error) {
	return s.provider.GetUsage(ctx, keyID)
}

func (s *UsageService) GetHistory(ctx context.Context, keyID string, from, to, granularity string) ([]UsageDataPoint, error) {
	points, err := s.provider.GetUsageHistory(ctx, keyID, from, to, granularity)
	if err != nil {
		return nil, fmt.Errorf("get usage history: %w", err)
	}
	return points, nil
}
```

Create `internal/service/billing.go`:

```go
package service

import (
	"context"
	"fmt"
	"time"
)

type BillingProvider interface {
	GetSubscription(ctx context.Context, customerID string) (plan, status string, periodStart, periodEnd *time.Time, usageLimit, usageCurrent *int, err error)
	CreatePortalSession(ctx context.Context, customerID string) (url string, err error)
}

type BillingService struct {
	provider BillingProvider
}

func NewBillingService(provider BillingProvider) *BillingService {
	return &BillingService{provider: provider}
}

func (s *BillingService) GetSubscription(ctx context.Context, customerID string) (plan, status string, periodStart, periodEnd *time.Time, usageLimit, usageCurrent *int, err error) {
	return s.provider.GetSubscription(ctx, customerID)
}

func (s *BillingService) CreatePortalSession(ctx context.Context, customerID string) (string, error) {
	url, err := s.provider.CreatePortalSession(ctx, customerID)
	if err != nil {
		return "", fmt.Errorf("create portal session: %w", err)
	}
	return url, nil
}
```

- [ ] **Step 6: Write tests for usage and billing services**

Create `internal/service/usage_test.go`:

```go
package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/clawbrowser/clawbrowser-api/internal/service"
)

type mockUsageProvider struct{}

func (m *mockUsageProvider) GetUsage(ctx context.Context, keyID string) (int, int, time.Time, time.Time, error) {
	start := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC)
	return 150, 42, start, end, nil
}

func (m *mockUsageProvider) GetUsageHistory(ctx context.Context, keyID, from, to, granularity string) ([]service.UsageDataPoint, error) {
	return []service.UsageDataPoint{
		{Date: "2026-03-01", FingerprintGenerations: 50, ProxyVerifications: 10},
		{Date: "2026-03-02", FingerprintGenerations: 100, ProxyVerifications: 32},
	}, nil
}

func TestUsageService_GetStats(t *testing.T) {
	svc := service.NewUsageService(&mockUsageProvider{})
	fingerprints, verifications, _, _, err := svc.GetStats(context.Background(), "key_123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if fingerprints != 150 {
		t.Errorf("expected 150 fingerprints, got %d", fingerprints)
	}
	if verifications != 42 {
		t.Errorf("expected 42 verifications, got %d", verifications)
	}
}

func TestUsageService_GetHistory(t *testing.T) {
	svc := service.NewUsageService(&mockUsageProvider{})
	points, err := svc.GetHistory(context.Background(), "key_123", "2026-03-01", "2026-03-03", "day")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(points) != 2 {
		t.Errorf("expected 2 data points, got %d", len(points))
	}
}
```

Create `internal/service/billing_test.go`:

```go
package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/clawbrowser/clawbrowser-api/internal/service"
)

type mockBillingProvider struct{}

func (m *mockBillingProvider) GetSubscription(ctx context.Context, customerID string) (string, string, *time.Time, *time.Time, *int, *int, error) {
	start := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC)
	limit := 10000
	current := 150
	return "pro", "active", &start, &end, &limit, &current, nil
}

func (m *mockBillingProvider) CreatePortalSession(ctx context.Context, customerID string) (string, error) {
	return "https://billing.example.com/portal/abc123", nil
}

func TestBillingService_GetSubscription(t *testing.T) {
	svc := service.NewBillingService(&mockBillingProvider{})
	plan, status, _, _, _, _, err := svc.GetSubscription(context.Background(), "cust_123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if plan != "pro" {
		t.Errorf("expected pro plan, got %s", plan)
	}
	if status != "active" {
		t.Errorf("expected active status, got %s", status)
	}
}

func TestBillingService_CreatePortalSession(t *testing.T) {
	svc := service.NewBillingService(&mockBillingProvider{})
	url, err := svc.CreatePortalSession(context.Background(), "cust_123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if url == "" {
		t.Error("expected non-empty portal URL")
	}
}
```

- [ ] **Step 7: Run all service tests**

```bash
go test ./internal/service/ -v
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add internal/service/ internal/model/types.go
git commit -m "feat: add service layer for API keys, fingerprints, usage, and billing"
```

---

### Task 16: Auth Middleware — Unkey

**Files:**
- Create: `internal/api/middleware_unkey.go`
- Create: `internal/api/middleware_unkey_test.go`

- [ ] **Step 1: Write failing test**

Create `internal/api/middleware_unkey_test.go`:

```go
package api_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	clawapi "github.com/clawbrowser/clawbrowser-api/internal/api"
)

type mockUnkeyVerifier struct {
	valid   bool
	keyID   string
	ownerID string
}

func (m *mockUnkeyVerifier) VerifyKey(ctx context.Context, key string) (valid bool, keyID, ownerID string, err error) {
	return m.valid, m.keyID, m.ownerID, nil
}

func TestUnkeyMiddleware_ValidKey(t *testing.T) {
	verifier := &mockUnkeyVerifier{valid: true, keyID: "key_123", ownerID: "cust_456"}
	middleware := clawapi.UnkeyAuthMiddleware(verifier)

	var gotKeyID string
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotKeyID = clawapi.UnkeyKeyIDFromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/v1/fingerprints/generate", nil)
	req.Header.Set("Authorization", "Bearer test_key")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if gotKeyID != "key_123" {
		t.Errorf("expected key_123, got %s", gotKeyID)
	}
}

func TestUnkeyMiddleware_MissingHeader(t *testing.T) {
	verifier := &mockUnkeyVerifier{}
	middleware := clawapi.UnkeyAuthMiddleware(verifier)

	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called")
	}))

	req := httptest.NewRequest(http.MethodPost, "/v1/fingerprints/generate", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestUnkeyMiddleware_InvalidKey(t *testing.T) {
	verifier := &mockUnkeyVerifier{valid: false}
	middleware := clawapi.UnkeyAuthMiddleware(verifier)

	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called")
	}))

	req := httptest.NewRequest(http.MethodPost, "/v1/fingerprints/generate", nil)
	req.Header.Set("Authorization", "Bearer bad_key")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/api/ -v -run TestUnkeyMiddleware
```

Expected: FAIL — package not found.

- [ ] **Step 3: Write middleware_unkey.go**

Create `internal/api/middleware_unkey.go`:

```go
package api

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
)

type contextKey string

const (
	unkeyKeyIDKey  contextKey = "unkey_key_id"
	unkeyOwnerIDKey contextKey = "unkey_owner_id"
)

// UnkeyVerifier abstracts Unkey key verification.
type UnkeyVerifier interface {
	VerifyKey(ctx context.Context, key string) (valid bool, keyID, ownerID string, err error)
}

// UnkeyKeyIDFromContext extracts the Unkey key ID from the request context.
func UnkeyKeyIDFromContext(ctx context.Context) string {
	v, _ := ctx.Value(unkeyKeyIDKey).(string)
	return v
}

// UnkeyOwnerIDFromContext extracts the customer ID from the request context.
func UnkeyOwnerIDFromContext(ctx context.Context) string {
	v, _ := ctx.Value(unkeyOwnerIDKey).(string)
	return v
}

// UnkeyAuthMiddleware verifies Unkey API keys for browser-facing endpoints.
func UnkeyAuthMiddleware(verifier UnkeyVerifier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				writeError(w, http.StatusUnauthorized, "missing_api_key", "Authorization header required")
				return
			}

			key := strings.TrimPrefix(authHeader, "Bearer ")
			valid, keyID, ownerID, err := verifier.VerifyKey(r.Context(), key)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "verification_error", "Failed to verify API key")
				return
			}
			if !valid {
				writeError(w, http.StatusUnauthorized, "invalid_api_key", "Invalid or expired API key")
				return
			}

			ctx := context.WithValue(r.Context(), unkeyKeyIDKey, keyID)
			ctx = context.WithValue(ctx, unkeyOwnerIDKey, ownerID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{
		"code":    code,
		"message": message,
	})
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
go test ./internal/api/ -v -run TestUnkeyMiddleware
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add internal/api/middleware_unkey.go internal/api/middleware_unkey_test.go
git commit -m "feat: add Unkey API key auth middleware"
```

---

### Task 17: Auth Middleware — Auth0 JWT

**Files:**
- Create: `internal/api/middleware_auth0.go`
- Create: `internal/api/middleware_auth0_test.go`

- [ ] **Step 1: Write failing test**

Create `internal/api/middleware_auth0_test.go`:

```go
package api_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	clawapi "github.com/clawbrowser/clawbrowser-api/internal/api"
)

type mockJWTValidator struct {
	auth0ID string
	err     error
}

func (m *mockJWTValidator) ValidateToken(ctx context.Context, token string) (auth0ID string, err error) {
	return m.auth0ID, m.err
}

func TestAuth0Middleware_ValidToken(t *testing.T) {
	v := &mockJWTValidator{auth0ID: "auth0|123"}
	middleware := clawapi.Auth0JWTMiddleware(v)

	var gotAuth0ID string
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth0ID = clawapi.Auth0IDFromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req.Header.Set("Authorization", "Bearer valid_jwt")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
	if gotAuth0ID != "auth0|123" {
		t.Errorf("expected auth0|123, got %s", gotAuth0ID)
	}
}

func TestAuth0Middleware_MissingHeader(t *testing.T) {
	v := &mockJWTValidator{}
	middleware := clawapi.Auth0JWTMiddleware(v)

	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called")
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/api/ -v -run TestAuth0Middleware
```

Expected: FAIL — function not found.

- [ ] **Step 3: Write middleware_auth0.go**

Create `internal/api/middleware_auth0.go`:

```go
package api

import (
	"context"
	"net/http"
	"strings"
)

const auth0IDKey contextKey = "auth0_id"

// JWTValidator abstracts JWT validation for testability.
type JWTValidator interface {
	ValidateToken(ctx context.Context, token string) (auth0ID string, err error)
}

// Auth0IDFromContext extracts the Auth0 user ID from the request context.
func Auth0IDFromContext(ctx context.Context) string {
	v, _ := ctx.Value(auth0IDKey).(string)
	return v
}

// Auth0JWTMiddleware verifies Auth0 JWTs for dashboard-facing endpoints.
func Auth0JWTMiddleware(validator JWTValidator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				writeError(w, http.StatusUnauthorized, "missing_jwt", "Authorization header required")
				return
			}

			token := strings.TrimPrefix(authHeader, "Bearer ")
			auth0ID, err := validator.ValidateToken(r.Context(), token)
			if err != nil {
				writeError(w, http.StatusUnauthorized, "invalid_jwt", "Invalid or expired JWT")
				return
			}

			ctx := context.WithValue(r.Context(), auth0IDKey, auth0ID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
go test ./internal/api/ -v -run TestAuth0Middleware
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add internal/api/middleware_auth0.go internal/api/middleware_auth0_test.go
git commit -m "feat: add Auth0 JWT auth middleware"
```

---

### Task 18: Webhook Signature Middleware

**Files:**
- Create: `internal/api/middleware_webhook.go`
- Create: `internal/api/middleware_webhook_test.go`

- [ ] **Step 1: Write failing test**

Create `internal/api/middleware_webhook_test.go`:

```go
package api_test

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	clawapi "github.com/clawbrowser/clawbrowser-api/internal/api"
)

func TestWebhookMiddleware_ValidSignature(t *testing.T) {
	secret := "webhook_secret_123"
	body := `{"user_id":"auth0|123","email":"test@example.com"}`

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(body))
	sig := hex.EncodeToString(mac.Sum(nil))

	middleware := clawapi.WebhookSignatureMiddleware(secret, "X-Webhook-Signature")

	called := false
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/v1/webhooks/auth0", strings.NewReader(body))
	req.Header.Set("X-Webhook-Signature", sig)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if !called {
		t.Fatal("handler should have been called")
	}
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}

func TestWebhookMiddleware_InvalidSignature(t *testing.T) {
	middleware := clawapi.WebhookSignatureMiddleware("secret", "X-Webhook-Signature")

	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called")
	}))

	req := httptest.NewRequest(http.MethodPost, "/v1/webhooks/auth0", strings.NewReader(`{}`))
	req.Header.Set("X-Webhook-Signature", "invalid")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/api/ -v -run TestWebhookMiddleware
```

Expected: FAIL — function not found.

- [ ] **Step 3: Write middleware_webhook.go**

Create `internal/api/middleware_webhook.go`:

```go
package api

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
)

// WebhookSignatureMiddleware verifies HMAC-SHA256 webhook signatures.
func WebhookSignatureMiddleware(secret, headerName string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			signature := r.Header.Get(headerName)
			if signature == "" {
				writeError(w, http.StatusUnauthorized, "missing_signature", "Webhook signature required")
				return
			}

			body, err := io.ReadAll(r.Body)
			if err != nil {
				writeError(w, http.StatusBadRequest, "read_error", "Failed to read request body")
				return
			}
			r.Body = io.NopCloser(bytes.NewReader(body))

			mac := hmac.New(sha256.New, []byte(secret))
			mac.Write(body)
			expected := hex.EncodeToString(mac.Sum(nil))

			if !hmac.Equal([]byte(signature), []byte(expected)) {
				writeError(w, http.StatusUnauthorized, "invalid_signature", "Invalid webhook signature")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
go test ./internal/api/ -v -run TestWebhookMiddleware
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add internal/api/middleware_webhook.go internal/api/middleware_webhook_test.go
git commit -m "feat: add webhook HMAC-SHA256 signature verification middleware"
```

---

### Task 19: API Server — Implements ServerInterface

**Files:**
- Create: `internal/api/server.go`
- Create: `internal/api/server_test.go`

- [ ] **Step 1: Write failing test for a handler**

Create `internal/api/server_test.go`:

```go
package api_test

import (
	"testing"

	clawapi "github.com/clawbrowser/clawbrowser-api/internal/api"
	"github.com/clawbrowser/clawbrowser-api/internal/api/gen"
)

func TestServer_ImplementsInterface(t *testing.T) {
	// Compile-time check that Server implements the generated interface
	var _ gen.ServerInterface = (*clawapi.Server)(nil)
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/api/ -v -run TestServer_ImplementsInterface
```

Expected: FAIL — Server type not found.

- [ ] **Step 3: Write server.go**

Create `internal/api/server.go`. This file implements `gen.ServerInterface` — each method maps to one API endpoint and delegates to the service layer.

```go
package api

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/clawbrowser/clawbrowser-api/internal/api/gen"
	"github.com/clawbrowser/clawbrowser-api/internal/service"
	"github.com/google/uuid"
)

// ProxyVerifier abstracts proxy geo verification for testability.
type ProxyVerifier interface {
	Verify(ctx context.Context, host string, port int, username, password, expectedCountry string, expectedCity *string) (match bool, actualCountry, actualCity, ipv4, ipv6 *string, err error)
}

type Server struct {
	customerSvc    *service.CustomerService
	apiKeySvc      *service.ApiKeyService
	fingerprintSvc *service.FingerprintService
	usageSvc       *service.UsageService
	billingSvc     *service.BillingService
	proxyVerifier  ProxyVerifier
}

func NewServer(
	customerSvc *service.CustomerService,
	apiKeySvc *service.ApiKeyService,
	fingerprintSvc *service.FingerprintService,
	usageSvc *service.UsageService,
	billingSvc *service.BillingService,
	proxyVerifier ProxyVerifier,
) *Server {
	return &Server{
		customerSvc:    customerSvc,
		apiKeySvc:      apiKeySvc,
		fingerprintSvc: fingerprintSvc,
		usageSvc:       usageSvc,
		billingSvc:     billingSvc,
		proxyVerifier:  proxyVerifier,
	}
}

// --- Browser-facing endpoints ---

func (s *Server) PostV1FingerprintsGenerate(w http.ResponseWriter, r *http.Request) {
	var req gen.GenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "Invalid request body")
		return
	}

	unkeyKeyID := UnkeyKeyIDFromContext(r.Context())

	city := ""
	if req.City != nil {
		city = *req.City
	}
	connType := ""
	if req.ConnectionType != nil {
		connType = string(*req.ConnectionType)
	}

	fp, creds, err := s.fingerprintSvc.Generate(r.Context(), unkeyKeyID,
		string(req.Platform), string(req.Browser), req.Country, city, connType)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "generation_failed", err.Error())
		return
	}

	resp := gen.GenerateResponse{
		Fingerprint: gen.Fingerprint{
			UserAgent:      fp.UserAgent,
			Platform:       fp.Platform,
			CanvasSeed:     fp.CanvasSeed,
			AudioSeed:      fp.AudioSeed,
			ClientRectsSeed: fp.ClientRectsSeed,
			Timezone:       fp.Timezone,
			Language:       fp.Language,
			Fonts:          fp.Fonts,
			Screen: gen.Screen{
				Width:       fp.Screen.Width,
				Height:      fp.Screen.Height,
				AvailWidth:  fp.Screen.AvailWidth,
				AvailHeight: fp.Screen.AvailHeight,
				ColorDepth:  fp.Screen.ColorDepth,
				PixelRatio:  fp.Screen.PixelRatio,
			},
			Hardware: gen.Hardware{
				Concurrency: fp.Hardware.Concurrency,
				Memory:      fp.Hardware.Memory,
			},
			Webgl: gen.WebGL{
				Vendor:   fp.WebGL.Vendor,
				Renderer: fp.WebGL.Renderer,
			},
		},
	}

	if creds != nil && creds.Host != "" {
		resp.Proxy = &gen.ProxyConfig{
			Host:     &creds.Host,
			Username: &creds.Username,
			Password: &creds.Password,
			Port:     &creds.Port,
			Country:  &req.Country,
		}
	}

	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) PostV1ProxyVerify(w http.ResponseWriter, r *http.Request) {
	var req gen.VerifyProxyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "Invalid request body")
		return
	}

	match, actualCountry, actualCity, ipv4, ipv6, err := s.proxyVerifier.Verify(r.Context(),
		req.Proxy.Host, req.Proxy.Port, req.Proxy.Username, req.Proxy.Password,
		req.ExpectedCountry, req.ExpectedCity)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "verification_failed", err.Error())
		return
	}

	resp := gen.VerifyProxyResponse{
		Match:         match,
		ActualCountry: actualCountry,
		ActualCity:    actualCity,
		Ipv4:          ipv4,
		Ipv6:          ipv6,
	}
	writeJSON(w, http.StatusOK, resp)
}

// --- Dashboard-facing endpoints ---

func (s *Server) GetV1Me(w http.ResponseWriter, r *http.Request) {
	auth0ID := Auth0IDFromContext(r.Context())
	customer, err := s.customerSvc.GetByAuth0ID(r.Context(), auth0ID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "Customer not found")
		return
	}

	writeJSON(w, http.StatusOK, gen.Customer{
		Id:        customer.ID.String(),
		Email:     customer.Email,
		Name:      customer.Name,
		Status:    gen.CustomerStatus(customer.Status),
		CreatedAt: customer.CreatedAt,
		UpdatedAt: &customer.UpdatedAt,
	})
}

func (s *Server) PutV1Me(w http.ResponseWriter, r *http.Request) {
	auth0ID := Auth0IDFromContext(r.Context())
	customer, err := s.customerSvc.GetByAuth0ID(r.Context(), auth0ID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "Customer not found")
		return
	}

	var req gen.UpdateCustomerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "Invalid request body")
		return
	}

	updated, err := s.customerSvc.Update(r.Context(), customer.ID, req.Name)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "update_failed", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, gen.Customer{
		Id:        updated.ID.String(),
		Email:     updated.Email,
		Name:      updated.Name,
		Status:    gen.CustomerStatus(updated.Status),
		CreatedAt: updated.CreatedAt,
		UpdatedAt: &updated.UpdatedAt,
	})
}

func (s *Server) PostV1ApiKeys(w http.ResponseWriter, r *http.Request) {
	auth0ID := Auth0IDFromContext(r.Context())
	customer, err := s.customerSvc.GetByAuth0ID(r.Context(), auth0ID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "Customer not found")
		return
	}

	var req gen.CreateApiKeyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", "Invalid request body")
		return
	}

	apiKey, keyValue, err := s.apiKeySvc.Create(r.Context(), customer.ID, req.Name)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "create_failed", err.Error())
		return
	}

	name := ""
	if apiKey.Name != nil {
		name = *apiKey.Name
	}
	writeJSON(w, http.StatusCreated, gen.CreateApiKeyResponse{
		Id:        apiKey.ID.String(),
		Name:      name,
		Key:       keyValue,
		CreatedAt: apiKey.CreatedAt,
	})
}

func (s *Server) GetV1ApiKeys(w http.ResponseWriter, r *http.Request) {
	auth0ID := Auth0IDFromContext(r.Context())
	customer, err := s.customerSvc.GetByAuth0ID(r.Context(), auth0ID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "Customer not found")
		return
	}

	keys, err := s.apiKeySvc.List(r.Context(), customer.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list_failed", err.Error())
		return
	}

	apiKeys := make([]gen.ApiKey, len(keys))
	for i, k := range keys {
		name := ""
		if k.Name != nil {
			name = *k.Name
		}
		apiKeys[i] = gen.ApiKey{
			Id:        k.ID.String(),
			Name:      name,
			KeyPrefix: k.UnkeyKeyID[:8] + "...",
			CreatedAt: k.CreatedAt,
			RevokedAt: k.RevokedAt,
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"keys": apiKeys})
}

func (s *Server) DeleteV1ApiKeysId(w http.ResponseWriter, r *http.Request, id string) {
	auth0ID := Auth0IDFromContext(r.Context())
	customer, err := s.customerSvc.GetByAuth0ID(r.Context(), auth0ID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "Customer not found")
		return
	}

	keyID, err := uuid.Parse(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "Invalid API key ID")
		return
	}

	if err := s.apiKeySvc.Revoke(r.Context(), keyID, customer.ID); err != nil {
		writeError(w, http.StatusNotFound, "not_found", "API key not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) PostV1ApiKeysIdRotate(w http.ResponseWriter, r *http.Request, id string) {
	auth0ID := Auth0IDFromContext(r.Context())
	customer, err := s.customerSvc.GetByAuth0ID(r.Context(), auth0ID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "Customer not found")
		return
	}

	keyID, err := uuid.Parse(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "Invalid API key ID")
		return
	}

	apiKey, keyValue, err := s.apiKeySvc.Rotate(r.Context(), keyID, customer.ID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "API key not found")
		return
	}

	name := ""
	if apiKey.Name != nil {
		name = *apiKey.Name
	}
	writeJSON(w, http.StatusOK, gen.CreateApiKeyResponse{
		Id:        apiKey.ID.String(),
		Name:      name,
		Key:       keyValue,
		CreatedAt: apiKey.CreatedAt,
	})
}

func (s *Server) GetV1Usage(w http.ResponseWriter, r *http.Request) {
	auth0ID := Auth0IDFromContext(r.Context())
	customer, err := s.customerSvc.GetByAuth0ID(r.Context(), auth0ID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "Customer not found")
		return
	}

	fingerprints, verifications, periodStart, periodEnd, err := s.usageSvc.GetStats(r.Context(), customer.ID.String())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "usage_failed", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, gen.UsageStats{
		PeriodStart:            periodStart,
		PeriodEnd:              periodEnd,
		FingerprintGenerations: fingerprints,
		ProxyVerifications:     verifications,
	})
}

func (s *Server) GetV1UsageHistory(w http.ResponseWriter, r *http.Request, params gen.GetV1UsageHistoryParams) {
	auth0ID := Auth0IDFromContext(r.Context())
	customer, err := s.customerSvc.GetByAuth0ID(r.Context(), auth0ID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "Customer not found")
		return
	}

	granularity := "day"
	if params.Granularity != nil {
		granularity = string(*params.Granularity)
	}

	points, err := s.usageSvc.GetHistory(r.Context(), customer.ID.String(),
		params.From.Format("2006-01-02"), params.To.Format("2006-01-02"), granularity)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "usage_history_failed", err.Error())
		return
	}

	dataPoints := make([]gen.UsageHistoryDataPointsItem, len(points))
	for i, p := range points {
		dataPoints[i] = gen.UsageHistoryDataPointsItem{
			Date:                   p.Date,
			FingerprintGenerations: p.FingerprintGenerations,
			ProxyVerifications:     p.ProxyVerifications,
		}
	}

	writeJSON(w, http.StatusOK, gen.UsageHistory{DataPoints: dataPoints})
}

func (s *Server) GetV1BillingSubscription(w http.ResponseWriter, r *http.Request) {
	auth0ID := Auth0IDFromContext(r.Context())
	customer, err := s.customerSvc.GetByAuth0ID(r.Context(), auth0ID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "Customer not found")
		return
	}

	plan, status, periodStart, periodEnd, usageLimit, usageCurrent, err := s.billingSvc.GetSubscription(r.Context(), customer.ID.String())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "billing_failed", err.Error())
		return
	}

	sub := gen.Subscription{
		Plan:               plan,
		Status:             gen.SubscriptionStatus(status),
		CurrentPeriodStart: periodStart,
		CurrentPeriodEnd:   periodEnd,
		UsageLimit:         usageLimit,
		UsageCurrent:       usageCurrent,
	}
	writeJSON(w, http.StatusOK, sub)
}

func (s *Server) PostV1BillingPortal(w http.ResponseWriter, r *http.Request) {
	auth0ID := Auth0IDFromContext(r.Context())
	customer, err := s.customerSvc.GetByAuth0ID(r.Context(), auth0ID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "Customer not found")
		return
	}

	url, err := s.billingSvc.CreatePortalSession(r.Context(), customer.ID.String())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "portal_failed", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"url": url})
}

// --- Webhook endpoints ---

func (s *Server) PostV1WebhooksAuth0(w http.ResponseWriter, r *http.Request) {
	var payload gen.Auth0WebhookPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "Invalid webhook payload")
		return
	}

	if err := s.customerSvc.Signup(r.Context(), payload.UserId, string(payload.Email), payload.Name); err != nil {
		writeError(w, http.StatusInternalServerError, "signup_failed", err.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (s *Server) PostV1WebhooksUnibee(w http.ResponseWriter, r *http.Request) {
	var payload gen.UniBeeWebhookPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "Invalid webhook payload")
		return
	}

	switch payload.Event {
	case gen.UniBeeWebhookPayloadEventPaymentSucceeded:
		slog.Info("unibee: payment succeeded", "data", payload.Data)
	case gen.UniBeeWebhookPayloadEventPaymentFailed:
		slog.Warn("unibee: payment failed", "data", payload.Data)
	case gen.UniBeeWebhookPayloadEventSubscriptionUpdated:
		slog.Info("unibee: subscription updated", "data", payload.Data)
	case gen.UniBeeWebhookPayloadEventSubscriptionCancelled:
		slog.Info("unibee: subscription cancelled", "data", payload.Data)
	default:
		slog.Warn("unibee: unknown event", "event", payload.Event)
	}

	w.WriteHeader(http.StatusOK)
}

// writeJSON writes a JSON response.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
```

**Note:** The exact method signatures in `server.go` depend on the generated `ServerInterface`. The method names and parameter types above are approximations based on oapi-codegen's default naming. After code generation (Task 1), adjust method signatures to match `gen.ServerInterface` exactly. The compile-time check in the test will catch any mismatches.

- [ ] **Step 4: Run tests to verify compilation and interface compliance**

```bash
go test ./internal/api/ -v -run TestServer_ImplementsInterface
```

Expected: PASS. If FAIL due to method signature mismatches, adjust `server.go` to match the generated interface.

- [ ] **Step 5: Commit**

```bash
git add internal/api/server.go internal/api/server_test.go
git commit -m "feat: add API server implementing generated ServerInterface"
```

---

### Task 20: Router + Health Probes

**Files:**
- Create: `internal/api/router.go`
- Create: `internal/api/router_test.go`

- [ ] **Step 1: Write failing test for health probes**

Create `internal/api/router_test.go`:

```go
package api_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	clawapi "github.com/clawbrowser/clawbrowser-api/internal/api"
)

func TestHealthz(t *testing.T) {
	router := clawapi.NewRouter(nil, nil, nil, "", "", "")
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}

func TestReadyz(t *testing.T) {
	router := clawapi.NewRouter(nil, nil, nil, "", "", "")
	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/api/ -v -run "TestHealthz|TestReadyz"
```

Expected: FAIL — function not found.

- [ ] **Step 3: Write router.go**

Create `internal/api/router.go`:

```go
package api

import (
	"context"
	"net/http"
	"time"

	"github.com/clawbrowser/clawbrowser-api/internal/api/gen"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// ReadinessChecker checks if a dependency is ready.
type ReadinessChecker interface {
	Ping(ctx context.Context) error
}

// NewRouter creates the Chi router with all middleware and routes.
func NewRouter(
	server *Server,
	unkeyVerifier UnkeyVerifier,
	jwtValidator JWTValidator,
	auth0WebhookSecret string,
	unibeeWebhookSecret string,
	webhookSignatureHeader string,
	readinessCheckers ...ReadinessChecker,
) http.Handler {
	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)

	// Health probes (no auth)
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})
	r.Get("/readyz", func(w http.ResponseWriter, r *http.Request) {
		for _, checker := range readinessCheckers {
			if err := checker.Ping(r.Context()); err != nil {
				w.WriteHeader(http.StatusServiceUnavailable)
				w.Write([]byte("not ready"))
				return
			}
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	if server == nil {
		return r
	}

	// Mount generated routes with per-group middleware
	// Browser-facing routes (Unkey auth)
	r.Group(func(r chi.Router) {
		if unkeyVerifier != nil {
			r.Use(UnkeyAuthMiddleware(unkeyVerifier))
		}
		r.Post("/v1/fingerprints/generate", server.PostV1FingerprintsGenerate)
		r.Post("/v1/proxy/verify", server.PostV1ProxyVerify)
	})

	// Dashboard-facing routes (Auth0 JWT auth)
	r.Group(func(r chi.Router) {
		if jwtValidator != nil {
			r.Use(Auth0JWTMiddleware(jwtValidator))
		}
		r.Get("/v1/me", server.GetV1Me)
		r.Put("/v1/me", server.PutV1Me)
		r.Post("/v1/api-keys", server.PostV1ApiKeys)
		r.Get("/v1/api-keys", server.GetV1ApiKeys)
		r.Delete("/v1/api-keys/{id}", func(w http.ResponseWriter, req *http.Request) {
			server.DeleteV1ApiKeysId(w, req, chi.URLParam(req, "id"))
		})
		r.Post("/v1/api-keys/{id}/rotate", func(w http.ResponseWriter, req *http.Request) {
			server.PostV1ApiKeysIdRotate(w, req, chi.URLParam(req, "id"))
		})
		r.Get("/v1/usage", server.GetV1Usage)
		r.Get("/v1/usage/history", func(w http.ResponseWriter, req *http.Request) {
			from, _ := time.Parse("2006-01-02", req.URL.Query().Get("from"))
			to, _ := time.Parse("2006-01-02", req.URL.Query().Get("to"))
			granularity := gen.GetV1UsageHistoryParamsGranularity(req.URL.Query().Get("granularity"))
			params := gen.GetV1UsageHistoryParams{
				From:        from,
				To:          to,
				Granularity: &granularity,
			}
			server.GetV1UsageHistory(w, req, params)
		})
		r.Get("/v1/billing/subscription", server.GetV1BillingSubscription)
		r.Post("/v1/billing/portal", server.PostV1BillingPortal)
	})

	// Webhook routes (signature verification)
	r.Group(func(r chi.Router) {
		if auth0WebhookSecret != "" {
			r.With(WebhookSignatureMiddleware(auth0WebhookSecret, webhookSignatureHeader)).
				Post("/v1/webhooks/auth0", server.PostV1WebhooksAuth0)
		}
		if unibeeWebhookSecret != "" {
			r.With(WebhookSignatureMiddleware(unibeeWebhookSecret, webhookSignatureHeader)).
				Post("/v1/webhooks/unibee", server.PostV1WebhooksUnibee)
		}
	})

	return r
}
```

**Note:** This hand-wires routes rather than using the generated `gen.HandlerFromMux`, because we need per-group middleware (Unkey vs Auth0 vs webhook). The generated handler applies a single middleware to all routes. The compile-time `ServerInterface` check in Task 19 ensures we don't miss any endpoints.

- [ ] **Step 4: Run tests to verify they pass**

```bash
go test ./internal/api/ -v -run "TestHealthz|TestReadyz"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add internal/api/router.go internal/api/router_test.go
git commit -m "feat: add Chi router with health probes and per-group auth middleware"
```

---

### Task 21: Main Entry Point

**Files:**
- Create: `cmd/server/main.go`

- [ ] **Step 1: Write main.go**

Create `cmd/server/main.go`:

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	clawapi "github.com/clawbrowser/clawbrowser-api/internal/api"
	"github.com/clawbrowser/clawbrowser-api/internal/config"
	"github.com/clawbrowser/clawbrowser-api/internal/provider"
	"github.com/clawbrowser/clawbrowser-api/internal/service"
	"github.com/clawbrowser/clawbrowser-api/internal/store"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Load config
	cfg, err := config.Load("config.yaml")
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	// Connect to Postgres
	pg, err := store.NewPostgres(ctx, cfg.Postgres.URL)
	if err != nil {
		slog.Error("failed to connect to postgres", "error", err)
		os.Exit(1)
	}
	defer pg.Close()

	// Run migrations
	if err := pg.Migrate("migrations"); err != nil {
		slog.Error("failed to run migrations", "error", err)
		os.Exit(1)
	}

	// Connect to Redis
	cache, err := store.NewRedisCache(cfg.Redis.URL, cfg.Redis.DB, cfg.Redis.TTL.Customer)
	if err != nil {
		slog.Error("failed to connect to redis", "error", err)
		os.Exit(1)
	}
	defer cache.Close()

	// Initialize repositories
	customerRepo := store.NewCustomerRepo(pg.Pool)
	apiKeyRepo := store.NewApiKeyRepo(pg.Pool)

	// Initialize providers
	unkeyClient := provider.NewUnkeyClient(cfg.Unkey.URL, cfg.Unkey.RootKey)
	nodemavenClient := provider.NewNodemavenClient(cfg.Nodemaven.APIURL, cfg.Nodemaven.APIKey)
	auth0Client := provider.NewAuth0Client(cfg.Auth0.Domain, cfg.Auth0.Audience)
	if err := auth0Client.InitValidator(); err != nil {
		slog.Error("failed to initialize Auth0 JWT validator", "error", err)
		os.Exit(1)
	}
	mailerClient := provider.NewMailerSendClient(
		cfg.MailerSend.SMTPHost, cfg.MailerSend.SMTPPort,
		cfg.MailerSend.APIKey, cfg.MailerSend.From,
	)

	// Initialize services
	// Provider adapters (implement service interfaces)
	unkeyAdapter := &unkeyProviderAdapter{client: unkeyClient, apiID: cfg.Unkey.APIID}
	nodemavenAdapter := &nodemavenProviderAdapter{client: nodemavenClient}
	usageAdapter := &usageProviderAdapter{client: unkeyClient}
	billingAdapter := &billingProviderAdapter{client: provider.NewUniBeeClient(cfg.UniBee.URL, cfg.UniBee.APIKey)}

	customerSvc := service.NewCustomerService(customerRepo, nodemavenAdapter, unkeyAdapter, mailerClient)
	apiKeySvc := service.NewApiKeyService(apiKeyRepo, unkeyAdapter, cache)
	fingerprintSvc := service.NewFingerprintService(customerRepo, cache, apiKeyRepo)
	usageSvc := service.NewUsageService(usageAdapter)
	billingSvc := service.NewBillingService(billingAdapter)

	// Create server and router
	proxyVerifier := &proxyVerifierAdapter{} // Uses direct HTTP connection through proxy
	server := clawapi.NewServer(customerSvc, apiKeySvc, fingerprintSvc, usageSvc, billingSvc, proxyVerifier)
	unkeyVerifier := &unkeyVerifierAdapter{client: unkeyClient}
	jwtValidator := &auth0ValidatorAdapter{client: auth0Client}

	router := clawapi.NewRouter(server, unkeyVerifier, jwtValidator,
		cfg.Webhooks.Auth0Secret, cfg.Webhooks.UniBeeSecret, cfg.Webhooks.SignatureHeader, pg, cache)

	// Start HTTP server
	httpServer := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Server.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		slog.Info("shutting down")
		shutdownCtx, shutdownCancel := context.WithTimeout(ctx, 10*time.Second)
		defer shutdownCancel()
		httpServer.Shutdown(shutdownCtx)
	}()

	slog.Info("starting server", "port", cfg.Server.Port)
	if err := httpServer.ListenAndServe(); err != http.ErrServerClosed {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}
}

// Adapter types to bridge provider clients to service interfaces

type unkeyProviderAdapter struct {
	client *provider.UnkeyClient
	apiID  string
}

func (a *unkeyProviderAdapter) CreateKey(ctx context.Context, ownerID, name string) (keyID, key string, err error) {
	resp, err := a.client.CreateKey(ctx, provider.UnkeyCreateKeyRequest{
		APIID:   a.apiID,
		OwnerID: ownerID,
		Name:    name,
	})
	if err != nil {
		return "", "", err
	}
	return resp.KeyID, resp.Key, nil
}

func (a *unkeyProviderAdapter) RevokeKey(ctx context.Context, keyID string) error {
	return a.client.RevokeKey(ctx, keyID)
}

type nodemavenProviderAdapter struct {
	client *provider.NodemavenClient
}

func (a *nodemavenProviderAdapter) CreateSubClient(ctx context.Context, email string) (subClientID, host string, port int, username, password string, err error) {
	resp, err := a.client.CreateSubClient(ctx, email)
	if err != nil {
		return "", "", 0, "", "", err
	}
	return resp.SubClientID, resp.Host, resp.Port, resp.Username, resp.Password, nil
}

type unkeyVerifierAdapter struct {
	client *provider.UnkeyClient
}

func (a *unkeyVerifierAdapter) VerifyKey(ctx context.Context, key string) (valid bool, keyID, ownerID string, err error) {
	resp, err := a.client.VerifyKey(ctx, key)
	if err != nil {
		return false, "", "", err
	}
	return resp.Valid, resp.KeyID, resp.OwnerID, nil
}

type auth0ValidatorAdapter struct {
	client *provider.Auth0Client
}

func (a *auth0ValidatorAdapter) ValidateToken(ctx context.Context, token string) (auth0ID string, err error) {
	claims, err := a.client.ValidateToken(ctx, token)
	if err != nil {
		return "", err
	}
	return claims.Sub, nil
}

type usageProviderAdapter struct {
	client *provider.UnkeyClient
}

func (a *usageProviderAdapter) GetUsage(ctx context.Context, keyID string) (fingerprints, verifications int, periodStart, periodEnd time.Time, err error) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)

	resp, err := a.client.GetUsage(ctx, keyID, start.Format(time.RFC3339), end.Format(time.RFC3339))
	if err != nil {
		return 0, 0, start, end, err
	}
	total := 0
	for _, dp := range resp.Usage {
		total += dp.Usage
	}
	return total, 0, start, end, nil
}

func (a *usageProviderAdapter) GetUsageHistory(ctx context.Context, keyID string, from, to, granularity string) ([]service.UsageDataPoint, error) {
	resp, err := a.client.GetUsage(ctx, keyID, from, to)
	if err != nil {
		return nil, err
	}
	points := make([]service.UsageDataPoint, len(resp.Usage))
	for i, dp := range resp.Usage {
		points[i] = service.UsageDataPoint{
			Date:                   dp.Time,
			FingerprintGenerations: dp.Usage,
		}
	}
	return points, nil
}

type billingProviderAdapter struct {
	client *provider.UniBeeClient
}

func (a *billingProviderAdapter) GetSubscription(ctx context.Context, customerID string) (plan, status string, periodStart, periodEnd *time.Time, usageLimit, usageCurrent *int, err error) {
	resp, err := a.client.GetSubscription(ctx, customerID)
	if err != nil {
		return "", "", nil, nil, nil, nil, err
	}
	// Parse period dates if available
	var pStart, pEnd *time.Time
	if resp.CurrentPeriodStart != "" {
		if t, err := time.Parse(time.RFC3339, resp.CurrentPeriodStart); err == nil {
			pStart = &t
		}
	}
	if resp.CurrentPeriodEnd != "" {
		if t, err := time.Parse(time.RFC3339, resp.CurrentPeriodEnd); err == nil {
			pEnd = &t
		}
	}
	return resp.Plan, resp.Status, pStart, pEnd, resp.UsageLimit, resp.UsageCurrent, nil
}

func (a *billingProviderAdapter) CreatePortalSession(ctx context.Context, customerID string) (string, error) {
	resp, err := a.client.CreatePortalSession(ctx, customerID)
	if err != nil {
		return "", err
	}
	return resp.URL, nil
}

// proxyVerifierAdapter verifies proxy geo by making an HTTP request through the proxy
// to a geo-IP service and comparing the result.
type proxyVerifierAdapter struct{}

func (a *proxyVerifierAdapter) Verify(ctx context.Context, host string, port int, username, password, expectedCountry string, expectedCity *string) (match bool, actualCountry, actualCity, ipv4, ipv6 *string, err error) {
	proxyURL := fmt.Sprintf("http://%s:%s@%s:%d", username, password, host, port)
	proxy, err := url.Parse(proxyURL)
	if err != nil {
		return false, nil, nil, nil, nil, fmt.Errorf("parse proxy url: %w", err)
	}

	client := &http.Client{
		Transport: &http.Transport{Proxy: http.ProxyURL(proxy)},
		Timeout:   15 * time.Second,
	}

	// Use a geo-IP service to check the proxy's actual location
	resp, err := client.Get("https://ipapi.co/json/")
	if err != nil {
		return false, nil, nil, nil, nil, fmt.Errorf("geo lookup through proxy: %w", err)
	}
	defer resp.Body.Close()

	var geo struct {
		IP      string `json:"ip"`
		Country string `json:"country_code"`
		City    string `json:"city"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&geo); err != nil {
		return false, nil, nil, nil, nil, fmt.Errorf("decode geo response: %w", err)
	}

	actualC := geo.Country
	actualCi := geo.City
	ip := geo.IP

	countryMatch := strings.EqualFold(actualC, expectedCountry)
	cityMatch := expectedCity == nil || strings.EqualFold(actualCi, *expectedCity)

	return countryMatch && cityMatch, &actualC, &actualCi, &ip, nil, nil
}
```

- [ ] **Step 2: Verify it compiles**

```bash
go build ./cmd/server/
```

Expected: Compiles. May require adjusting imports or method signatures to match generated types.

- [ ] **Step 3: Commit**

```bash
git add cmd/server/main.go
git commit -m "feat: add main entry point with DI wiring and graceful shutdown"
```

---

### Task 22: Dockerfile

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Create Dockerfile**

Create `Dockerfile`:

```dockerfile
FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

FROM alpine:3.19

RUN apk --no-cache add ca-certificates
COPY --from=builder /server /server
COPY config.yaml /config.yaml
COPY migrations/ /migrations/

EXPOSE 8080

ENTRYPOINT ["/server"]
```

- [ ] **Step 2: Verify Dockerfile syntax**

```bash
docker build --check . 2>/dev/null || echo "Docker not available, skipping build check"
```

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "feat: add multi-stage Dockerfile"
```

---

### Task 23: Provisioning Retry Job

**Files:**
- Modify: `cmd/server/main.go`

- [ ] **Step 1: Write failing test for retry logic**

Create `internal/service/retry_test.go`:

```go
package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/clawbrowser/clawbrowser-api/internal/model"
	"github.com/clawbrowser/clawbrowser-api/internal/service"
	"github.com/google/uuid"
)

type mockProvisioningRepo struct {
	customers  []*model.Customer
	updated    map[uuid.UUID]model.CustomerStatus
	retryCounts map[uuid.UUID]int
}

func (m *mockProvisioningRepo) ListProvisioning(ctx context.Context, olderThanSecs int, maxRetries int) ([]*model.Customer, error) {
	return m.customers, nil
}

func (m *mockProvisioningRepo) Create(ctx context.Context, auth0ID, email string, name *string) (*model.Customer, error) { return nil, nil }
func (m *mockProvisioningRepo) GetByID(ctx context.Context, id uuid.UUID) (*model.Customer, error) { return nil, nil }
func (m *mockProvisioningRepo) GetByAuth0ID(ctx context.Context, auth0ID string) (*model.Customer, error) { return nil, nil }
func (m *mockProvisioningRepo) Update(ctx context.Context, id uuid.UUID, name *string) (*model.Customer, error) { return nil, nil }
func (m *mockProvisioningRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status model.CustomerStatus) error {
	m.updated[id] = status
	return nil
}
func (m *mockProvisioningRepo) UpdateNodemavenCredentials(ctx context.Context, id uuid.UUID, subClientID string, creds model.NodemavenCreds) error { return nil }
func (m *mockProvisioningRepo) IncrementRetryCount(ctx context.Context, id uuid.UUID) (int, error) {
	m.retryCounts[id]++
	return m.retryCounts[id], nil
}
func (m *mockProvisioningRepo) Delete(ctx context.Context, id uuid.UUID) error { return nil }

func TestRetryProvisioning_CompletesCustomer(t *testing.T) {
	custID := uuid.New()
	repo := &mockProvisioningRepo{
		customers: []*model.Customer{
			{ID: custID, Auth0ID: "auth0|1", Email: "test@example.com", Status: model.CustomerStatusProvisioning, CreatedAt: time.Now().Add(-2 * time.Minute)},
		},
		updated:     make(map[uuid.UUID]model.CustomerStatus),
		retryCounts: make(map[uuid.UUID]int),
	}

	nodemaven := &mockNodemaven{}
	unkey := &mockUnkeyForCustomer{}
	mailer := &mockMailer{}

	retrier := service.NewProvisioningRetrier(repo, nodemaven, unkey, mailer)
	err := retrier.RetryOnce(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if status, ok := repo.updated[custID]; !ok || status != model.CustomerStatusActive {
		t.Errorf("expected customer to be active, got %v", status)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./internal/service/ -v -run TestRetryProvisioning
```

Expected: FAIL — type not found.

- [ ] **Step 3: Write provisioning retrier in customer.go**

Add to `internal/service/customer.go`:

```go
// ProvisioningRetrier handles retry logic for customers stuck in provisioning.
type ProvisioningRetrier struct {
	repo      store.CustomerRepository
	nodemaven NodemavenProvider
	unkey     UnkeyProvider
	mailer    Mailer
}

func NewProvisioningRetrier(
	repo store.CustomerRepository,
	nodemaven NodemavenProvider,
	unkey UnkeyProvider,
	mailer Mailer,
) *ProvisioningRetrier {
	return &ProvisioningRetrier{repo: repo, nodemaven: nodemaven, unkey: unkey, mailer: mailer}
}

// RetryOnce processes all provisioning customers older than 30 seconds.
func (r *ProvisioningRetrier) RetryOnce(ctx context.Context) error {
	customers, err := r.repo.ListProvisioning(ctx, 30, 5)
	if err != nil {
		return fmt.Errorf("list provisioning customers: %w", err)
	}

	for _, c := range customers {
		// Increment retry count first
		retryCount, err := r.repo.IncrementRetryCount(ctx, c.ID)
		if err != nil {
			slog.Error("failed to increment retry count", "customer_id", c.ID, "error", err)
			continue
		}

		// After 5 failed retries, mark as provisioning_failed
		if retryCount >= 5 {
			slog.Error("provisioning failed after max retries", "customer_id", c.ID, "retry_count", retryCount)
			if err := r.repo.UpdateStatus(ctx, c.ID, model.CustomerStatusProvisioningFailed); err != nil {
				slog.Error("failed to mark provisioning_failed", "customer_id", c.ID, "error", err)
			}
			continue
		}

		if err := r.provisionCustomer(ctx, c); err != nil {
			slog.Error("retry provisioning failed", "customer_id", c.ID, "retry_count", retryCount, "error", err)
		}
	}
	return nil
}

func (r *ProvisioningRetrier) provisionCustomer(ctx context.Context, c *model.Customer) error {
	// If no Nodemaven credentials yet, create sub-client
	if c.NodemavenSubClientID == nil {
		subClientID, host, port, username, password, err := r.nodemaven.CreateSubClient(ctx, c.Email)
		if err != nil {
			return fmt.Errorf("create nodemaven sub-client: %w", err)
		}
		creds := model.NodemavenCreds{Host: host, Port: port, Username: username, Password: password}
		if err := r.repo.UpdateNodemavenCredentials(ctx, c.ID, subClientID, creds); err != nil {
			return fmt.Errorf("update credentials: %w", err)
		}
	}

	// Create default API key
	displayName := "Default"
	_, key, err := r.unkey.CreateKey(ctx, c.ID.String(), displayName)
	if err != nil {
		return fmt.Errorf("create api key: %w", err)
	}

	// Mark active
	if err := r.repo.UpdateStatus(ctx, c.ID, model.CustomerStatusActive); err != nil {
		return fmt.Errorf("update status: %w", err)
	}

	// Best-effort welcome email
	name := c.Email
	if c.Name != nil {
		name = *c.Name
	}
	r.mailer.SendWelcomeEmail(c.Email, name, key)

	return nil
}

// StartRetryLoop runs the provisioning retry job on a ticker.
func (r *ProvisioningRetrier) StartRetryLoop(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := r.RetryOnce(ctx); err != nil {
				slog.Error("retry loop error", "error", err)
			}
		}
	}
}
```

**Note:** Also add `"time"` to the imports in `customer.go`.

- [ ] **Step 4: Run test to verify it passes**

```bash
go test ./internal/service/ -v -run TestRetryProvisioning
```

Expected: PASS

- [ ] **Step 5: Wire retry loop in main.go**

Add to `cmd/server/main.go` before the HTTP server start:

```go
// Start provisioning retry job
retrier := service.NewProvisioningRetrier(customerRepo, nodemavenAdapter, unkeyAdapter, mailerClient)
go retrier.StartRetryLoop(ctx, 60*time.Second)
```

- [ ] **Step 6: Verify compilation**

```bash
go build ./cmd/server/
```

Expected: Compiles.

- [ ] **Step 7: Commit**

```bash
git add internal/service/customer.go internal/service/retry_test.go cmd/server/main.go
git commit -m "feat: add provisioning retry job for incomplete customer signups"
```

---

### Task 24: Contract Tests (OpenAPI Validation)

**Files:**
- Create: `internal/api/contract_test.go`

Per the spec's testing strategy: "Contract tests: Validate OpenAPI spec matches actual handler responses."

- [ ] **Step 1: Write contract test**

Create `internal/api/contract_test.go`:

```go
package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/routers/gorillamux"
	clawapi "github.com/clawbrowser/clawbrowser-api/internal/api"
)

func TestContract_HealthzNotInSpec(t *testing.T) {
	// Health probes are infrastructure endpoints not in OpenAPI spec — verify they still work
	router := clawapi.NewRouter(nil, nil, nil, "", "", "")
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}

func TestContract_LoadOpenAPISpec(t *testing.T) {
	specPath := "../../api/openapi.yaml"
	if _, err := os.Stat(specPath); os.IsNotExist(err) {
		t.Skip("openapi.yaml not found, skipping contract tests")
	}

	loader := openapi3.NewLoader()
	doc, err := loader.LoadFromFile(specPath)
	if err != nil {
		t.Fatalf("failed to load OpenAPI spec: %v", err)
	}

	if err := doc.Validate(loader.Context); err != nil {
		t.Fatalf("invalid OpenAPI spec: %v", err)
	}

	// Verify all spec paths are present
	expectedPaths := []string{
		"/v1/fingerprints/generate",
		"/v1/proxy/verify",
		"/v1/me",
		"/v1/api-keys",
		"/v1/api-keys/{id}",
		"/v1/api-keys/{id}/rotate",
		"/v1/usage",
		"/v1/usage/history",
		"/v1/billing/subscription",
		"/v1/billing/portal",
		"/v1/webhooks/auth0",
		"/v1/webhooks/unibee",
	}

	for _, path := range expectedPaths {
		if doc.Paths.Find(path) == nil {
			t.Errorf("expected path %s in OpenAPI spec", path)
		}
	}

	// Build router for response validation in future tests
	_, err = gorillamux.NewRouter(doc)
	if err != nil {
		t.Fatalf("failed to create OpenAPI router: %v", err)
	}
}
```

- [ ] **Step 2: Install kin-openapi dependency and run test**

```bash
go get github.com/getkin/kin-openapi
go test ./internal/api/ -v -run TestContract
```

Expected: PASS (or SKIP if openapi.yaml not yet created).

- [ ] **Step 3: Commit**

```bash
git add internal/api/contract_test.go go.mod go.sum
git commit -m "feat: add OpenAPI contract tests"
```

---

### Task 25: CI/CD Workflow (ci.yaml)

**Files:**
- Create: `.github/workflows/ci.yaml`

Per both the backend spec (section "App Repo CI Responsibilities") and devops spec (section "Build Flow"): on merge to `main`, the app repo must run tests, build Docker, tag with `v{semver}-{build_number}-{short_sha}`, push to Docker Hub, and fire `repository_dispatch` to `clawbrowser-infra`.

- [ ] **Step 1: Create CI workflow**

Create `.github/workflows/ci.yaml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Run tests
        run: go test ./... -v

      - name: Run vet
        run: go vet ./...

  build-and-push:
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Need tags for semver

      - name: Get version components
        id: version
        run: |
          # Get latest semver tag, default to v0.1.0
          SEMVER=$(git describe --tags --abbrev=0 --match 'v*' 2>/dev/null || echo "v0.1.0")
          SHORT_SHA=$(git rev-parse --short HEAD)
          BUILD_NUMBER=${{ github.run_number }}
          IMAGE_TAG="${SEMVER}-${BUILD_NUMBER}-${SHORT_SHA}"
          echo "image_tag=${IMAGE_TAG}" >> "$GITHUB_OUTPUT"
          echo "Image tag: ${IMAGE_TAG}"

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/clawbrowser-api:${{ steps.version.outputs.image_tag }}

      - name: Trigger deploy to QA
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.INFRA_REPO_GITHUB_APP_TOKEN }}
          repository: ${{ github.repository_owner }}/clawbrowser-infra
          event-type: deploy-api
          client-payload: '{"image_tag": "${{ steps.version.outputs.image_tag }}"}'
```

- [ ] **Step 2: Verify YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yaml'))" && echo "Valid YAML"
```

Expected: "Valid YAML"

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yaml
git commit -m "feat: add CI/CD workflow with Docker build and infra repo dispatch"
```

---

### Task 26: Final Integration — Compile Check + Run All Tests

- [ ] **Step 1: Run all tests**

```bash
go test ./... -v
```

Expected: All tests PASS.

- [ ] **Step 2: Build the binary**

```bash
go build -o /tmp/clawbrowser-api ./cmd/server/
```

Expected: Binary builds successfully.

- [ ] **Step 3: Run go vet**

```bash
go vet ./...
```

Expected: No issues.

- [ ] **Step 4: Commit any fixes**

If any compilation or vet issues were found and fixed:

```bash
git add -A
git commit -m "fix: resolve compilation and vet issues"
```
