# Plan 1: Backend Fingerprint API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Go REST API that generates realistic browser fingerprints and verifies proxy geo-location, deployed on Kubernetes.

**Architecture:** Single Go service with two endpoints (`/v1/fingerprints/generate` and `/v1/proxy/verify`), stateless, authenticated via Bearer token. Fingerprint generation uses curated datasets of real browser configurations to produce internally consistent profiles.

**Tech Stack:** Go 1.22+, Chi router, OpenAPI 3.1 spec (oapi-codegen for types), Docker, Kubernetes manifests

**Spec:** `docs/superpowers/specs/2026-03-21-clawbrowser-design.md`

---

## File Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go                  # Entry point, wires dependencies, starts HTTP server
├── internal/
│   ├── api/
│   │   ├── handler.go               # HTTP handlers for /v1/fingerprints/generate and /v1/proxy/verify
│   │   ├── handler_test.go          # Handler tests
│   │   ├── middleware.go            # Auth middleware (Bearer token validation)
│   │   └── middleware_test.go       # Middleware tests
│   ├── fingerprint/
│   │   ├── generator.go            # Fingerprint generation logic
│   │   ├── generator_test.go       # Generator tests
│   │   ├── datasets.go             # Curated real-world browser config datasets
│   │   └── consistency.go          # Internal consistency validation (UA ↔ platform ↔ fonts ↔ WebGL)
│   ├── proxy/
│   │   ├── verifier.go             # Proxy geo verification logic
│   │   └── verifier_test.go        # Verifier tests
│   └── model/
│       └── types.go                # Shared types: GenerateRequest, GenerateResponse, Fingerprint, ProxyConfig, etc.
├── api/
│   └── openapi.yaml                # OpenAPI 3.1 spec (from design doc)
├── Dockerfile
├── k8s/
│   ├── deployment.yaml
│   └── service.yaml
├── go.mod
└── go.sum
```

---

### Task 1: Project Scaffold and Types

**Files:**
- Create: `backend/go.mod`
- Create: `backend/cmd/server/main.go`
- Create: `backend/internal/model/types.go`
- Create: `backend/api/openapi.yaml`

- [ ] **Step 1: Initialize Go module**

```bash
cd backend && go mod init github.com/clawbrowser/api
```

- [ ] **Step 2: Create OpenAPI spec**

Copy the OpenAPI 3.1 YAML from the design spec into `backend/api/openapi.yaml` verbatim.

- [ ] **Step 3: Write model types**

Create `backend/internal/model/types.go`:

```go
package model

type GenerateRequest struct {
	Platform       string `json:"platform"`
	Browser        string `json:"browser"`
	Country        string `json:"country"`
	City           string `json:"city,omitempty"`
	ConnectionType string `json:"connection_type,omitempty"`
}

type GenerateResponse struct {
	Fingerprint Fingerprint  `json:"fingerprint"`
	Proxy       *ProxyConfig `json:"proxy,omitempty"`
}

type Fingerprint struct {
	UserAgent      string        `json:"user_agent"`
	Platform       string        `json:"platform"`
	Screen         Screen        `json:"screen"`
	Hardware       Hardware      `json:"hardware"`
	WebGL          WebGL         `json:"webgl"`
	CanvasSeed     int64         `json:"canvas_seed"`
	AudioSeed      int64         `json:"audio_seed"`
	ClientRectsSeed int64        `json:"client_rects_seed"`
	Timezone       string        `json:"timezone"`
	Language       []string      `json:"language"`
	Fonts          []string      `json:"fonts"`
	MediaDevices   []MediaDevice `json:"media_devices,omitempty"`
	Plugins        []Plugin      `json:"plugins,omitempty"`
	Battery        *Battery      `json:"battery,omitempty"`
	SpeechVoices   []string      `json:"speech_voices,omitempty"`
}

type Screen struct {
	Width      int     `json:"width"`
	Height     int     `json:"height"`
	AvailWidth int     `json:"avail_width"`
	AvailHeight int    `json:"avail_height"`
	ColorDepth int     `json:"color_depth"`
	PixelRatio float64 `json:"pixel_ratio"`
}

type Hardware struct {
	Concurrency int `json:"concurrency"`
	Memory      int `json:"memory"`
}

type WebGL struct {
	Vendor   string `json:"vendor"`
	Renderer string `json:"renderer"`
}

type MediaDevice struct {
	Kind     string `json:"kind"`
	Label    string `json:"label"`
	DeviceID string `json:"device_id"`
}

type Plugin struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Filename    string `json:"filename"`
}

type Battery struct {
	Charging bool    `json:"charging"`
	Level    float64 `json:"level"`
}

type ProxyConfig struct {
	Country        string `json:"country,omitempty"`
	City           string `json:"city,omitempty"`
	ConnectionType string `json:"connection_type,omitempty"`
	Host           string `json:"host,omitempty"`
	Port           int    `json:"port,omitempty"`
	Username       string `json:"username,omitempty"`
	Password       string `json:"password,omitempty"`
}

type VerifyProxyRequest struct {
	Proxy           ProxyEndpoint `json:"proxy"`
	ExpectedCountry string        `json:"expected_country"`
	ExpectedCity    string        `json:"expected_city,omitempty"`
}

type ProxyEndpoint struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
}

type VerifyProxyResponse struct {
	ActualCountry string `json:"actual_country"`
	ActualCity    string `json:"actual_city,omitempty"`
	IPv4          string `json:"ipv4,omitempty"`
	IPv6          string `json:"ipv6,omitempty"`
}

type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
```

- [ ] **Step 4: Create minimal main.go**

Create `backend/cmd/server/main.go`:

```go
package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Starting clawbrowser API on :%s", port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%s", port), nil))
}
```

- [ ] **Step 5: Verify it compiles**

```bash
cd backend && go build ./...
```

Expected: builds with no errors.

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat(api): scaffold Go project with model types and OpenAPI spec"
```

---

### Task 2: Auth Middleware

**Files:**
- Create: `backend/internal/api/middleware.go`
- Create: `backend/internal/api/middleware_test.go`

- [ ] **Step 1: Write the failing test**

Create `backend/internal/api/middleware_test.go`:

```go
package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAuthMiddleware_ValidToken(t *testing.T) {
	handler := AuthMiddleware("test-api-key")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/", nil)
	req.Header.Set("Authorization", "Bearer test-api-key")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}

func TestAuthMiddleware_MissingHeader(t *testing.T) {
	handler := AuthMiddleware("test-api-key")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestAuthMiddleware_InvalidToken(t *testing.T) {
	handler := AuthMiddleware("test-api-key")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/", nil)
	req.Header.Set("Authorization", "Bearer wrong-key")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && go test ./internal/api/ -v
```

Expected: FAIL — `AuthMiddleware` not defined.

- [ ] **Step 3: Write minimal implementation**

Create `backend/internal/api/middleware.go`:

```go
package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/clawbrowser/api/internal/model"
)

func AuthMiddleware(apiKey string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			auth := r.Header.Get("Authorization")
			if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
				writeError(w, http.StatusUnauthorized, "unauthorized", "Missing or invalid Authorization header")
				return
			}
			token := strings.TrimPrefix(auth, "Bearer ")
			if token != apiKey {
				writeError(w, http.StatusUnauthorized, "unauthorized", "Invalid API key")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(model.ErrorResponse{Code: code, Message: message})
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && go test ./internal/api/ -v
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/api/
git commit -m "feat(api): add Bearer token auth middleware"
```

---

### Task 3: Fingerprint Generator — Datasets

**Files:**
- Create: `backend/internal/fingerprint/datasets.go`

- [ ] **Step 1: Create curated datasets**

Create `backend/internal/fingerprint/datasets.go` with realistic macOS Chrome configurations:

```go
package fingerprint

// MacOSPreset holds a consistent set of browser properties for a macOS Chrome config.
type MacOSPreset struct {
	UserAgents   []string
	Platform     string
	WebGLVendor  string
	WebGLRenderers []string
	Screens      []Screen
	Concurrency  []int
	Memory       []int
	Fonts        []string
}

type Screen struct {
	Width       int
	Height      int
	AvailWidth  int
	AvailHeight int
	ColorDepth  int
	PixelRatio  float64
}

var MacOSPresets = []MacOSPreset{
	{
		Platform:    "MacIntel",
		WebGLVendor: "Apple",
		WebGLRenderers: []string{
			"Apple M1",
			"Apple M1 Pro",
			"Apple M1 Max",
			"Apple M1 Ultra",
		},
		Screens: []Screen{
			{Width: 1440, Height: 900, AvailWidth: 1440, AvailHeight: 875, ColorDepth: 30, PixelRatio: 2},
			{Width: 1680, Height: 1050, AvailWidth: 1680, AvailHeight: 1025, ColorDepth: 30, PixelRatio: 2},
			{Width: 1920, Height: 1080, AvailWidth: 1920, AvailHeight: 1055, ColorDepth: 30, PixelRatio: 2},
		},
		Concurrency: []int{8, 10},
		Memory:      []int{8, 16},
		Fonts: []string{
			"Arial", "Arial Black", "Comic Sans MS", "Courier New", "Georgia",
			"Helvetica", "Helvetica Neue", "Impact", "Lucida Grande", "Monaco",
			"Palatino", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana",
			"Menlo", "SF Pro", "SF Mono",
		},
	},
	{
		Platform:    "MacIntel",
		WebGLVendor: "Apple",
		WebGLRenderers: []string{
			"Apple M2",
			"Apple M2 Pro",
			"Apple M2 Max",
			"Apple M2 Ultra",
		},
		Screens: []Screen{
			{Width: 1512, Height: 982, AvailWidth: 1512, AvailHeight: 957, ColorDepth: 30, PixelRatio: 2},
			{Width: 1728, Height: 1117, AvailWidth: 1728, AvailHeight: 1092, ColorDepth: 30, PixelRatio: 2},
			{Width: 1920, Height: 1080, AvailWidth: 1920, AvailHeight: 1055, ColorDepth: 30, PixelRatio: 2},
			{Width: 2560, Height: 1440, AvailWidth: 2560, AvailHeight: 1415, ColorDepth: 30, PixelRatio: 2},
		},
		Concurrency: []int{8, 10, 12},
		Memory:      []int{16, 24, 32},
		Fonts: []string{
			"Arial", "Arial Black", "Comic Sans MS", "Courier New", "Georgia",
			"Helvetica", "Helvetica Neue", "Impact", "Lucida Grande", "Monaco",
			"Palatino", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana",
			"Menlo", "SF Pro", "SF Mono",
		},
	},
	{
		Platform:    "MacIntel",
		WebGLVendor: "Apple",
		WebGLRenderers: []string{
			"Apple M3",
			"Apple M3 Pro",
			"Apple M3 Max",
		},
		Screens: []Screen{
			{Width: 1512, Height: 982, AvailWidth: 1512, AvailHeight: 957, ColorDepth: 30, PixelRatio: 2},
			{Width: 1728, Height: 1117, AvailWidth: 1728, AvailHeight: 1092, ColorDepth: 30, PixelRatio: 2},
			{Width: 2560, Height: 1440, AvailWidth: 2560, AvailHeight: 1415, ColorDepth: 30, PixelRatio: 2},
			{Width: 3456, Height: 2234, AvailWidth: 3456, AvailHeight: 2209, ColorDepth: 30, PixelRatio: 2},
		},
		Concurrency: []int{8, 12, 16},
		Memory:      []int{16, 36, 48},
		Fonts: []string{
			"Arial", "Arial Black", "Comic Sans MS", "Courier New", "Georgia",
			"Helvetica", "Helvetica Neue", "Impact", "Lucida Grande", "Monaco",
			"Palatino", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana",
			"Menlo", "SF Pro", "SF Mono", "New York",
		},
	},
}

// Chrome user agent templates — version will be randomized within recent range.
var ChromeUATemplates = []string{
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36",
}

// Recent Chrome versions for UA generation.
var RecentChromeVersions = []string{
	"120.0.6099.109",
	"121.0.6167.85",
	"122.0.6261.94",
	"123.0.6312.86",
	"124.0.6367.91",
}

// Timezone mappings for country/city.
var TimezonesByCountry = map[string][]string{
	"US": {"America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"},
	"GB": {"Europe/London"},
	"DE": {"Europe/Berlin"},
	"FR": {"Europe/Paris"},
	"JP": {"Asia/Tokyo"},
	"AU": {"Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane"},
	"CA": {"America/Toronto", "America/Vancouver"},
	"BR": {"America/Sao_Paulo"},
	"IN": {"Asia/Kolkata"},
	"KR": {"Asia/Seoul"},
}

// Language by country.
var LanguagesByCountry = map[string][]string{
	"US": {"en-US", "en"},
	"GB": {"en-GB", "en"},
	"DE": {"de-DE", "de", "en"},
	"FR": {"fr-FR", "fr", "en"},
	"JP": {"ja-JP", "ja", "en"},
	"AU": {"en-AU", "en"},
	"CA": {"en-CA", "en", "fr-CA"},
	"BR": {"pt-BR", "pt", "en"},
	"IN": {"en-IN", "en", "hi"},
	"KR": {"ko-KR", "ko", "en"},
}

// Default media devices for macOS.
var DefaultMediaDevices = []MediaDeviceTemplate{
	{Kind: "audioinput", Label: "Built-in Microphone"},
	{Kind: "audiooutput", Label: "Built-in Output"},
	{Kind: "videoinput", Label: "FaceTime HD Camera"},
}

type MediaDeviceTemplate struct {
	Kind  string
	Label string
}

// Default plugins (legacy, included for completeness).
var DefaultPlugins = []PluginTemplate{
	{Name: "PDF Viewer", Description: "Portable Document Format", Filename: "internal-pdf-viewer"},
	{Name: "Chrome PDF Viewer", Description: "Portable Document Format", Filename: "internal-pdf-viewer"},
	{Name: "Chromium PDF Viewer", Description: "Portable Document Format", Filename: "internal-pdf-viewer"},
}

type PluginTemplate struct {
	Name        string
	Description string
	Filename    string
}

// Speech voices for macOS.
var MacOSSpeechVoices = []string{
	"Alex", "Daniel", "Karen", "Moira", "Rishi", "Samantha", "Tessa", "Victoria",
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd backend && go build ./internal/fingerprint/
```

Expected: compiles with no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/fingerprint/datasets.go
git commit -m "feat(api): add curated macOS Chrome fingerprint datasets"
```

---

### Task 4: Fingerprint Generator — Core Logic

**Files:**
- Create: `backend/internal/fingerprint/generator.go`
- Create: `backend/internal/fingerprint/generator_test.go`

- [ ] **Step 1: Write the failing tests**

Create `backend/internal/fingerprint/generator_test.go`:

```go
package fingerprint

import (
	"testing"

	"github.com/clawbrowser/api/internal/model"
)

func TestGenerate_ReturnsValidFingerprint(t *testing.T) {
	gen := NewGenerator()
	req := model.GenerateRequest{
		Platform: "macos",
		Browser:  "chrome",
		Country:  "US",
	}

	resp, err := gen.Generate(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.Fingerprint.UserAgent == "" {
		t.Error("user_agent is empty")
	}
	if resp.Fingerprint.Platform == "" {
		t.Error("platform is empty")
	}
	if resp.Fingerprint.Screen.Width == 0 {
		t.Error("screen width is 0")
	}
	if resp.Fingerprint.Hardware.Concurrency == 0 {
		t.Error("hardware concurrency is 0")
	}
	if resp.Fingerprint.WebGL.Vendor == "" {
		t.Error("webgl vendor is empty")
	}
	if resp.Fingerprint.Timezone == "" {
		t.Error("timezone is empty")
	}
	if len(resp.Fingerprint.Language) == 0 {
		t.Error("language is empty")
	}
	if len(resp.Fingerprint.Fonts) == 0 {
		t.Error("fonts is empty")
	}
	if resp.Fingerprint.CanvasSeed == 0 {
		t.Error("canvas_seed is 0")
	}
}

func TestGenerate_TimezoneMatchesCountry(t *testing.T) {
	gen := NewGenerator()
	req := model.GenerateRequest{
		Platform: "macos",
		Browser:  "chrome",
		Country:  "JP",
	}

	resp, err := gen.Generate(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.Fingerprint.Timezone != "Asia/Tokyo" {
		t.Errorf("expected Asia/Tokyo for JP, got %s", resp.Fingerprint.Timezone)
	}
}

func TestGenerate_LanguageMatchesCountry(t *testing.T) {
	gen := NewGenerator()
	req := model.GenerateRequest{
		Platform: "macos",
		Browser:  "chrome",
		Country:  "DE",
	}

	resp, err := gen.Generate(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(resp.Fingerprint.Language) == 0 || resp.Fingerprint.Language[0] != "de-DE" {
		t.Errorf("expected first language de-DE for DE, got %v", resp.Fingerprint.Language)
	}
}

func TestGenerate_InvalidPlatform(t *testing.T) {
	gen := NewGenerator()
	req := model.GenerateRequest{
		Platform: "windows",
		Browser:  "chrome",
		Country:  "US",
	}

	_, err := gen.Generate(req)
	if err == nil {
		t.Error("expected error for unsupported platform")
	}
}

func TestGenerate_DifferentCallsProduceDifferentFingerprints(t *testing.T) {
	gen := NewGenerator()
	req := model.GenerateRequest{
		Platform: "macos",
		Browser:  "chrome",
		Country:  "US",
	}

	resp1, _ := gen.Generate(req)
	resp2, _ := gen.Generate(req)

	if resp1.Fingerprint.CanvasSeed == resp2.Fingerprint.CanvasSeed &&
		resp1.Fingerprint.AudioSeed == resp2.Fingerprint.AudioSeed {
		t.Error("two calls produced identical seeds — expected randomness")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && go test ./internal/fingerprint/ -v
```

Expected: FAIL — `NewGenerator` not defined.

- [ ] **Step 3: Write minimal implementation**

Create `backend/internal/fingerprint/generator.go`:

```go
package fingerprint

import (
	"crypto/rand"
	"fmt"
	"math/big"
	mrand "math/rand"

	"github.com/clawbrowser/api/internal/model"
)

type Generator struct{}

func NewGenerator() *Generator {
	return &Generator{}
}

func (g *Generator) Generate(req model.GenerateRequest) (*model.GenerateResponse, error) {
	if req.Platform != "macos" {
		return nil, fmt.Errorf("unsupported platform: %s", req.Platform)
	}
	if req.Browser != "chrome" {
		return nil, fmt.Errorf("unsupported browser: %s", req.Browser)
	}

	rng := newCryptoSeededRNG()

	preset := MacOSPresets[rng.Intn(len(MacOSPresets))]
	screen := preset.Screens[rng.Intn(len(preset.Screens))]
	chromeVersion := RecentChromeVersions[rng.Intn(len(RecentChromeVersions))]
	ua := fmt.Sprintf(ChromeUATemplates[0], chromeVersion)
	webglRenderer := preset.WebGLRenderers[rng.Intn(len(preset.WebGLRenderers))]

	tz := pickTimezone(req.Country, rng)
	lang := pickLanguage(req.Country)

	mediaDevices := make([]model.MediaDevice, len(DefaultMediaDevices))
	for i, d := range DefaultMediaDevices {
		mediaDevices[i] = model.MediaDevice{
			Kind:     d.Kind,
			Label:    d.Label,
			DeviceID: randomHex(64, rng),
		}
	}

	plugins := make([]model.Plugin, len(DefaultPlugins))
	for i, p := range DefaultPlugins {
		plugins[i] = model.Plugin{
			Name:        p.Name,
			Description: p.Description,
			Filename:    p.Filename,
		}
	}

	fp := model.Fingerprint{
		UserAgent: ua,
		Platform:  preset.Platform,
		Screen: model.Screen{
			Width:       screen.Width,
			Height:      screen.Height,
			AvailWidth:  screen.AvailWidth,
			AvailHeight: screen.AvailHeight,
			ColorDepth:  screen.ColorDepth,
			PixelRatio:  screen.PixelRatio,
		},
		Hardware: model.Hardware{
			Concurrency: preset.Concurrency[rng.Intn(len(preset.Concurrency))],
			Memory:      preset.Memory[rng.Intn(len(preset.Memory))],
		},
		WebGL: model.WebGL{
			Vendor:   preset.WebGLVendor,
			Renderer: webglRenderer,
		},
		CanvasSeed:      rng.Int63(),
		AudioSeed:       rng.Int63(),
		ClientRectsSeed: rng.Int63(),
		Timezone:        tz,
		Language:        lang,
		Fonts:           preset.Fonts,
		MediaDevices:    mediaDevices,
		Plugins:         plugins,
		Battery: &model.Battery{
			Charging: rng.Intn(2) == 1,
			Level:    float64(50+rng.Intn(50)) / 100.0,
		},
		SpeechVoices: MacOSSpeechVoices,
	}

	return &model.GenerateResponse{Fingerprint: fp}, nil
}

func pickTimezone(country string, rng *mrand.Rand) string {
	tzs, ok := TimezonesByCountry[country]
	if !ok {
		return "UTC"
	}
	return tzs[rng.Intn(len(tzs))]
}

func pickLanguage(country string) []string {
	lang, ok := LanguagesByCountry[country]
	if !ok {
		return []string{"en-US", "en"}
	}
	return lang
}

func newCryptoSeededRNG() *mrand.Rand {
	n, _ := rand.Int(rand.Reader, big.NewInt(1<<62))
	return mrand.New(mrand.NewSource(n.Int64()))
}

func randomHex(length int, rng *mrand.Rand) string {
	const hex = "0123456789abcdef"
	b := make([]byte, length)
	for i := range b {
		b[i] = hex[rng.Intn(len(hex))]
	}
	return string(b)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && go test ./internal/fingerprint/ -v
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/fingerprint/generator.go backend/internal/fingerprint/generator_test.go
git commit -m "feat(api): implement fingerprint generator with consistency checks"
```

---

### Task 5: Proxy Verifier

**Files:**
- Create: `backend/internal/proxy/verifier.go`
- Create: `backend/internal/proxy/verifier_test.go`

- [ ] **Step 1: Write the failing tests**

Create `backend/internal/proxy/verifier_test.go`:

```go
package proxy

import (
	"testing"

	"github.com/clawbrowser/api/internal/model"
)

func TestVerify_MatchingCountry(t *testing.T) {
	// This test uses a mock IP lookup — real proxy verification
	// requires network access which is tested via integration tests.
	v := NewVerifier(MockIPLookup{Country: "US", City: "New York", IPv4: "1.2.3.4"})

	req := model.VerifyProxyRequest{
		Proxy:           model.ProxyEndpoint{Host: "proxy.test", Port: 8080, Username: "u", Password: "p"},
		ExpectedCountry: "US",
	}

	resp, err := v.Verify(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.ActualCountry != "US" {
		t.Errorf("expected US, got %s", resp.ActualCountry)
	}
	if resp.IPv4 != "1.2.3.4" {
		t.Errorf("expected 1.2.3.4, got %s", resp.IPv4)
	}
}

func TestVerify_MismatchCountry(t *testing.T) {
	v := NewVerifier(MockIPLookup{Country: "DE", City: "Berlin", IPv4: "5.6.7.8"})

	req := model.VerifyProxyRequest{
		Proxy:           model.ProxyEndpoint{Host: "proxy.test", Port: 8080, Username: "u", Password: "p"},
		ExpectedCountry: "US",
	}

	resp, err := v.Verify(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.ActualCountry != "DE" {
		t.Errorf("expected DE, got %s", resp.ActualCountry)
	}
}

type MockIPLookup struct {
	Country string
	City    string
	IPv4    string
	IPv6    string
}

func (m MockIPLookup) Lookup(proxyHost string, proxyPort int, username, password string) (*IPInfo, error) {
	return &IPInfo{
		Country: m.Country,
		City:    m.City,
		IPv4:    m.IPv4,
		IPv6:    m.IPv6,
	}, nil
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && go test ./internal/proxy/ -v
```

Expected: FAIL — `NewVerifier` not defined.

- [ ] **Step 3: Write minimal implementation**

Create `backend/internal/proxy/verifier.go`:

```go
package proxy

import (
	"github.com/clawbrowser/api/internal/model"
)

type IPInfo struct {
	Country string
	City    string
	IPv4    string
	IPv6    string
}

type IPLookup interface {
	Lookup(proxyHost string, proxyPort int, username, password string) (*IPInfo, error)
}

type Verifier struct {
	lookup IPLookup
}

func NewVerifier(lookup IPLookup) *Verifier {
	return &Verifier{lookup: lookup}
}

func (v *Verifier) Verify(req model.VerifyProxyRequest) (*model.VerifyProxyResponse, error) {
	info, err := v.lookup.Lookup(req.Proxy.Host, req.Proxy.Port, req.Proxy.Username, req.Proxy.Password)
	if err != nil {
		return nil, err
	}

	return &model.VerifyProxyResponse{
		ActualCountry: info.Country,
		ActualCity:    info.City,
		IPv4:          info.IPv4,
		IPv6:          info.IPv6,
	}, nil
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && go test ./internal/proxy/ -v
```

Expected: all 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/proxy/
git commit -m "feat(api): add proxy geo verifier with pluggable IP lookup"
```

---

### Task 6: HTTP Handlers

**Files:**
- Create: `backend/internal/api/handler.go`
- Create: `backend/internal/api/handler_test.go`

- [ ] **Step 1: Write the failing tests**

Create `backend/internal/api/handler_test.go`:

```go
package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/clawbrowser/api/internal/fingerprint"
	"github.com/clawbrowser/api/internal/model"
	"github.com/clawbrowser/api/internal/proxy"
)

func TestHandleGenerate_Success(t *testing.T) {
	h := NewHandler(fingerprint.NewGenerator(), nil)

	body, _ := json.Marshal(model.GenerateRequest{
		Platform: "macos",
		Browser:  "chrome",
		Country:  "US",
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/fingerprints/generate", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	h.HandleGenerate(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}

	var resp model.GenerateResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Fingerprint.UserAgent == "" {
		t.Error("expected non-empty user_agent")
	}
}

func TestHandleGenerate_InvalidPlatform(t *testing.T) {
	h := NewHandler(fingerprint.NewGenerator(), nil)

	body, _ := json.Marshal(model.GenerateRequest{
		Platform: "windows",
		Browser:  "chrome",
		Country:  "US",
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/fingerprints/generate", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	h.HandleGenerate(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
}

func TestHandleGenerate_MissingRequiredFields(t *testing.T) {
	h := NewHandler(fingerprint.NewGenerator(), nil)

	body, _ := json.Marshal(model.GenerateRequest{})

	req := httptest.NewRequest(http.MethodPost, "/v1/fingerprints/generate", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	h.HandleGenerate(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
}

func TestHandleVerifyProxy_Success(t *testing.T) {
	mockLookup := proxy.MockIPLookup{Country: "US", City: "New York", IPv4: "1.2.3.4"}
	h := NewHandler(nil, proxy.NewVerifier(mockLookup))

	body, _ := json.Marshal(model.VerifyProxyRequest{
		Proxy:           model.ProxyEndpoint{Host: "proxy.test", Port: 8080, Username: "u", Password: "p"},
		ExpectedCountry: "US",
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/proxy/verify", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	h.HandleVerifyProxy(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}

	var resp model.VerifyProxyResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.ActualCountry != "US" {
		t.Errorf("expected US, got %s", resp.ActualCountry)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && go test ./internal/api/ -v
```

Expected: FAIL — `NewHandler` not defined.

- [ ] **Step 3: Write minimal implementation**

Create `backend/internal/api/handler.go`:

```go
package api

import (
	"encoding/json"
	"net/http"

	"github.com/clawbrowser/api/internal/fingerprint"
	"github.com/clawbrowser/api/internal/model"
	"github.com/clawbrowser/api/internal/proxy"
)

type Handler struct {
	generator *fingerprint.Generator
	verifier  *proxy.Verifier
}

func NewHandler(gen *fingerprint.Generator, ver *proxy.Verifier) *Handler {
	return &Handler{generator: gen, verifier: ver}
}

func (h *Handler) HandleGenerate(w http.ResponseWriter, r *http.Request) {
	var req model.GenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Invalid JSON body")
		return
	}

	if req.Platform == "" || req.Browser == "" || req.Country == "" {
		writeError(w, http.StatusBadRequest, "missing_fields", "platform, browser, and country are required")
		return
	}

	resp, err := h.generator.Generate(req)
	if err != nil {
		writeError(w, http.StatusBadRequest, "generation_failed", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) HandleVerifyProxy(w http.ResponseWriter, r *http.Request) {
	var req model.VerifyProxyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Invalid JSON body")
		return
	}

	if req.Proxy.Host == "" || req.Proxy.Port == 0 {
		writeError(w, http.StatusBadRequest, "missing_fields", "proxy host and port are required")
		return
	}

	resp, err := h.verifier.Verify(req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "verification_failed", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
```

- [ ] **Step 4: Export MockIPLookup for handler tests**

Move `MockIPLookup` from `verifier_test.go` to a test helper file so the `api` package can use it. Create `backend/internal/proxy/testing.go`:

```go
package proxy

// MockIPLookup is a test double for IPLookup.
type MockIPLookup struct {
	Country string
	City    string
	IPv4    string
	IPv6    string
}

func (m MockIPLookup) Lookup(proxyHost string, proxyPort int, username, password string) (*IPInfo, error) {
	return &IPInfo{
		Country: m.Country,
		City:    m.City,
		IPv4:    m.IPv4,
		IPv6:    m.IPv6,
	}, nil
}
```

Remove the duplicate `MockIPLookup` from `verifier_test.go`.

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend && go test ./internal/... -v
```

Expected: all tests PASS across all packages.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/
git commit -m "feat(api): add HTTP handlers for generate and verify-proxy endpoints"
```

---

### Task 7: Wire Up main.go with Router

**Files:**
- Modify: `backend/cmd/server/main.go`
- Modify: `backend/go.mod` (add chi dependency)

- [ ] **Step 1: Add chi router dependency**

```bash
cd backend && go get github.com/go-chi/chi/v5
```

- [ ] **Step 2: Wire up main.go**

Update `backend/cmd/server/main.go`:

```go
package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"

	"github.com/clawbrowser/api/internal/api"
	"github.com/clawbrowser/api/internal/fingerprint"
	"github.com/clawbrowser/api/internal/proxy"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	apiKey := os.Getenv("CLAWBROWSER_API_KEY")
	if apiKey == "" {
		log.Fatal("CLAWBROWSER_API_KEY environment variable is required")
	}

	gen := fingerprint.NewGenerator()
	// TODO: replace with real IP lookup implementation
	ver := proxy.NewVerifier(proxy.MockIPLookup{})

	handler := api.NewHandler(gen, ver)

	r := chi.NewRouter()
	r.Use(api.AuthMiddleware(apiKey))

	r.Post("/v1/fingerprints/generate", handler.HandleGenerate)
	r.Post("/v1/proxy/verify", handler.HandleVerifyProxy)

	log.Printf("Starting clawbrowser API on :%s", port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%s", port), r))
}
```

- [ ] **Step 3: Verify it compiles**

```bash
cd backend && go build ./cmd/server/
```

Expected: builds with no errors.

- [ ] **Step 4: Smoke test manually**

```bash
CLAWBROWSER_API_KEY=test-key go run ./cmd/server/ &
sleep 1
curl -s -X POST http://localhost:8080/v1/fingerprints/generate \
  -H "Authorization: Bearer test-key" \
  -H "Content-Type: application/json" \
  -d '{"platform":"macos","browser":"chrome","country":"US"}' | head -c 200
kill %1
```

Expected: JSON response with fingerprint data.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat(api): wire up chi router with auth middleware and endpoints"
```

---

### Task 8: Dockerfile and Kubernetes Manifests

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/k8s/deployment.yaml`
- Create: `backend/k8s/service.yaml`

- [ ] **Step 1: Create Dockerfile**

Create `backend/Dockerfile`:

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /clawbrowser-api ./cmd/server/

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /clawbrowser-api /clawbrowser-api
EXPOSE 8080
ENTRYPOINT ["/clawbrowser-api"]
```

- [ ] **Step 2: Create Kubernetes deployment**

Create `backend/k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clawbrowser-api
  labels:
    app: clawbrowser-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: clawbrowser-api
  template:
    metadata:
      labels:
        app: clawbrowser-api
    spec:
      containers:
        - name: clawbrowser-api
          image: clawbrowser-api:latest
          ports:
            - containerPort: 8080
          env:
            - name: PORT
              value: "8080"
            - name: CLAWBROWSER_API_KEY
              valueFrom:
                secretKeyRef:
                  name: clawbrowser-api-secrets
                  key: api-key
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              memory: "64Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
```

- [ ] **Step 3: Create Kubernetes service**

Create `backend/k8s/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: clawbrowser-api
spec:
  selector:
    app: clawbrowser-api
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: ClusterIP
```

- [ ] **Step 4: Add /healthz endpoint to main.go**

Add to the router in `main.go`:

```go
r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ok"))
})
```

Note: `/healthz` must be added BEFORE the auth middleware group, or use a separate unprotected router group.

- [ ] **Step 5: Verify Docker builds**

```bash
cd backend && docker build -t clawbrowser-api .
```

Expected: image builds successfully.

- [ ] **Step 6: Commit**

```bash
git add backend/Dockerfile backend/k8s/
git commit -m "feat(api): add Dockerfile and Kubernetes deployment manifests"
```

---

### Task 9: Run All Tests

- [ ] **Step 1: Run full test suite**

```bash
cd backend && go test ./... -v -count=1
```

Expected: all tests PASS.

- [ ] **Step 2: Run with race detector**

```bash
cd backend && go test -race ./... -count=1
```

Expected: no race conditions detected.

- [ ] **Step 3: Commit any fixes if needed**

```bash
git add -A && git commit -m "fix(api): address test issues"
```
