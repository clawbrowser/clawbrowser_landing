# Clawbrowser Browser Component Design Spec

> **Supersedes** sections of the [original clawbrowser design spec](2026-03-21-clawbrowser-design.md) related to the browser binary implementation. Specifically, this spec replaces the Rust/libclaw FFI approach with pure C++, replaces POSIX shared memory IPC with file-path IPC, and updates the verification failure behavior. The original spec remains authoritative for high-level product vision and feature scope.

## Overview

The clawbrowser browser component is a patched Chromium browser (latest stable at time of implementation, macOS MVP) with built-in fingerprint spoofing, proxy routing, and a CLI for profile management. All custom logic lives in a `clawbrowser/` shim library compiled as a static library and linked into the Chromium browser target. Chromium subsystem patches are minimal hooks (1–5 lines each) calling into the shim.

**Key architectural decisions:**

- **Pure C++** — all fingerprint injection logic lives in Chromium patches and the shim library. No Rust, no FFI, no JS injection.
- **Thin shim + minimal patches** — `clawbrowser/` shim is a static library with CLI, API client, fingerprint loading, proxy config, verification, and noise generation. Each Chromium subsystem patch is a 1–5 line hook into the shim.
- **File-path IPC** — fingerprint data is passed to child processes via `--clawbrowser-fp-path=<path>` flag. Each process reads the file during pre-sandbox init. No shared memory, no Mojo IPC, no sandbox modifications.
- **Code-generated types** — API response structs and JSON parsers are auto-generated from `api/openapi.yaml` using quicktype, keeping the browser in lockstep with the backend API.
- **macOS MVP** — Linux and Android support deferred.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ clawbrowser binary (patched Chromium)                │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ clawbrowser/ shim (static library)           │   │
│  │                                               │   │
│  │  CLI & Args ──→ API Client ──→ Profile Mgmt  │   │
│  │       │                            │          │   │
│  │       ▼                            ▼          │   │
│  │  Fingerprint Loader ──→ Fingerprint Accessor  │   │
│  │                              │                │   │
│  │  Proxy Config    Verify Page │                │   │
│  └──────────────────────────────┼────────────────┘   │
│                                 │                     │
│  ┌──────────────────────────────┼────────────────┐   │
│  │ Chromium subsystem patches   │ (1-5 lines ea) │   │
│  │                              ▼                │   │
│  │  Blink: Canvas, WebGL, Audio, ClientRects,    │   │
│  │         Navigator, Fonts, MediaDevices,       │   │
│  │         Plugins, Battery, SpeechSynthesis     │   │
│  │  Content: Screen, Timezone, Language          │   │
│  │  Net: Proxy routing, WebRTC leak prevention   │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
         │
         │ HTTPS (pre-launch)
         ▼
   clawbrowser-api
   POST /v1/fingerprints/generate
   POST /v1/proxy/verify
```

**Process model:**

- **Browser process** (unsandboxed): CLI parsing, API calls, profile I/O, fingerprint loading, proxy setup, verification page hosting.
- **Renderer processes** (sandboxed): Load fingerprint from file during pre-sandbox init, override Blink surfaces via in-memory accessor.
- **GPU process** (sandboxed): Load fingerprint during pre-sandbox init, override WebGL vendor/renderer strings.

## CLI & Profile Management

### CLI Commands

```
clawbrowser --fingerprint=fp_abc123              # Launch with cached profile (fetch from API if not cached)
clawbrowser --fingerprint=fp_abc123 --regenerate # Re-fetch profile from API, overwrite cache
clawbrowser                                      # Vanilla browser, no spoofing
clawbrowser --list                               # List cached profiles, exit
```

**Note:** If `--fingerprint=<id>` is provided and no cached profile exists for that ID, the browser implicitly calls the API to generate one. There is no separate `--new` flag — profile creation is implicit on first use of an ID.

### Additional Flags

- `--verbose` — enable `[clawbrowser]` debug logging to stderr.
- `--output=json` — structured JSON output for CLI commands (e.g., `--list`).
- `--skip-verify` — skip `clawbrowser://verify` on startup.
- All other flags pass through to Chromium unchanged.

### Profile Storage

```
~/Library/Application Support/Clawbrowser/
├── config.json                      # API key + API base URL
├── Browser/
│   ├── Default/                     # Vanilla Chromium user-data-dir
│   └── fp_abc123/                   # Fingerprint user-data-dir
│       ├── fingerprint.json         # Profile envelope (see On-Disk Format)
│       └── Default/                 # Chromium profile directory
│           └── <Chromium profile data>  # cookies, localStorage, etc.
```

Chromium flags for fingerprint profiles:
- `--user-data-dir=~/Library/Application Support/Clawbrowser/Browser/fp_abc123`
- Chromium creates `Default/` inside this directory automatically for its profile data.

Vanilla mode:
- `--user-data-dir=~/Library/Application Support/Clawbrowser/Browser/Default`

### API Key Resolution

The API key is resolved in the following order (first match wins):

1. `CLAWBROWSER_API_KEY` environment variable
2. `api_key` field in `config.json`

This allows CI/automation to pass the key via env var without a config file.

### Startup Flow

```
Parse args
  │
  ├─ --list? → Print cached profiles → exit
  │
  ├─ --fingerprint=<id>?
  │   ├─ --regenerate OR no cached profile?
  │   │   ├─ Resolve API key (env var → config.json)
  │   │   ├─ POST /v1/fingerprints/generate
  │   │   │   (request params: platform, browser from defaults;
  │   │   │    country/city/connection_type from --regenerate reuses
  │   │   │    stored request params, new profile uses defaults)
  │   │   ├─ Save response as profile envelope to fp_<id>/fingerprint.json
  │   │   └─ Continue
  │   ├─ Cached profile exists?
  │   │   └─ Read fp_<id>/fingerprint.json → Continue
  │   │
  │   ├─ Set --clawbrowser-fp-path=<path to fingerprint.json>
  │   ├─ Set --user-data-dir=<fp_<id> directory>
  │   ├─ Configure proxy from fingerprint proxy config
  │   └─ Launch Chromium → clawbrowser://verify (unless --skip-verify)
  │
  └─ No --fingerprint?
      └─ Launch vanilla Chromium (Default user-data-dir, no spoofing)
```

### API Client

The shim includes a C++ HTTP client for pre-launch API calls, using Chromium's `net::URLFetcher` (available in the browser process before full Chromium init via `net::URLRequestContextBuilder`).

- Only two endpoints: `POST /v1/fingerprints/generate`, `POST /v1/proxy/verify`.
- Bearer auth with resolved API key.
- Timeout: 10s, no retries — fail fast with clear error message.
- Errors print to stderr and exit with non-zero code.

### Logging

- Default: silent (no clawbrowser output).
- `--verbose`: structured `[clawbrowser]` prefixed messages to stderr.
- `--output=json`: machine-readable JSON to stdout (for `--list` and error cases).

## Fingerprint Loading & Sandbox Integration

### On-Disk Format (Profile Envelope)

The `fingerprint.json` file on disk wraps the API `GenerateResponse` in a local envelope with metadata. The envelope struct is **not code-generated** — it is hand-written in the shim, while the nested `GenerateResponse` is code-generated from the OpenAPI spec.

```json
{
  "schema_version": 1,
  "created_at": "2026-03-23T10:00:00Z",
  "request": {
    "platform": "macos",
    "browser": "chrome",
    "country": "US",
    "city": "New York",
    "connection_type": "residential"
  },
  "response": {
    "fingerprint": { ... },
    "proxy": { ... }
  }
}
```

| Field | Type | Purpose |
|-------|------|---------|
| `schema_version` | integer | Envelope format version. Current: `1`. If missing or outdated, warn and suggest `--regenerate` but still attempt to load. |
| `created_at` | ISO 8601 string | When the profile was generated. |
| `request` | object | Original `GenerateRequest` params. Replayed on `--regenerate` to preserve country/city/connection_type. |
| `response` | `GenerateResponse` | The API response body (code-generated struct). Contains `fingerprint` and `proxy`. |

### Data Lifecycle

```
fingerprint.json on disk
       │
       │ (1) Browser process reads at startup
       │     (pre-Chromium init)
       ▼
  In-memory: ProfileEnvelope → GenerateResponse → Fingerprint + ProxyConfig
       │
       │ (2) --clawbrowser-fp-path flag explicitly added to child process
       │     command lines via patch to content/browser/child_process_launcher.cc
       │
       ├──→ Renderer process: reads file pre-sandbox → in-memory struct
       ├──→ GPU process: reads file pre-sandbox → in-memory struct
       │
       │ (3) Sandbox locks down — no more file I/O
       │
       ▼
  All processes: FingerprintAccessor::Get() returns in-memory data
```

### Sandbox Safety

- No sandbox policy modifications.
- File read happens before `LockdownSandbox()` in each process.
- After lockdown, only in-memory reads via `FingerprintAccessor::Get()`.
- If `--clawbrowser-fp-path` is absent, accessor returns `nullptr` — all patches become no-ops (vanilla mode).

### Chromium Patch Points for Loading

| File | What it does |
|------|-------------|
| `content/renderer/renderer_main.cc` | Call `clawbrowser::LoadFingerprint()` pre-sandbox |
| `content/gpu/gpu_main.cc` | Call `clawbrowser::LoadFingerprint()` pre-sandbox |
| `chrome/browser/chrome_browser_main.cc` | Load fingerprint + CLI init in browser process |
| `content/browser/child_process_launcher.cc` | Propagate `--clawbrowser-fp-path` flag to child process command lines |

## Code Generation from OpenAPI

The API response structs (`GenerateResponse`, `Fingerprint`, `ProxyConfig`, etc.) and their JSON parsers are auto-generated from the backend's OpenAPI spec (`api/openapi.yaml`) using **quicktype**, keeping the browser in lockstep with the backend API.

### Pipeline

```
api/openapi.yaml
       │
       │ (1) Extract relevant schemas (GenerateResponse, Fingerprint,
       │     ProxyConfig, VerifyProxyRequest, VerifyProxyResponse, etc.)
       │     via a small script that pulls $ref'd schemas into standalone JSON Schema
       ▼
clawbrowser/schemas/fingerprint.schema.json
       │
       │ (2) quicktype --src-lang schema --lang cpp --namespace clawbrowser
       │     --include-location global-include --source-style single-source
       │     --type-style pascal-case --member-style underscore-case
       ▼
clawbrowser/generated/
├── fingerprint_types.h       # Struct definitions
├── fingerprint_types.cc      # JSON parsing (using Chromium's base::Value / base::JSONReader)
└── README.md                 # "DO NOT EDIT — generated from api/openapi.yaml"
```

**Note on JSON library:** quicktype generates code using nlohmann/json by default. Since Chromium does not ship nlohmann/json, a custom quicktype template is used to target Chromium's built-in `base::Value` / `base::JSONReader` instead. This eliminates the need to vendor an external JSON library. The custom template lives in `clawbrowser/schemas/quicktype-chromium-template/`.

### What Gets Generated

From OpenAPI schemas:

- `GenerateResponse` → top-level response struct (contains `fingerprint` + `proxy`)
- `Fingerprint` → all surface fields
- `ProxyConfig` → proxy credentials (host, port, username, password, country, city, connection_type)
- `Screen`, `Hardware`, `WebGL`, `MediaDevice`, `Plugin`, `Battery` → nested structs
- `VerifyProxyRequest` / `VerifyProxyResponse` → used by API client and verify page
- `GenerateRequest` → used for the request field in the profile envelope

**Field name mapping:** The generated structs use field names exactly as defined in the OpenAPI spec. The override tables in this spec reference these exact names:

| OpenAPI field | Generated C++ field | JS API |
|--------------|-------------------|--------|
| `fingerprint.language` (array) | `language` | `navigator.language` → `language[0]`, `navigator.languages` → `language` |
| `fingerprint.hardware.concurrency` | `concurrency` | `navigator.hardwareConcurrency` |
| `fingerprint.hardware.memory` | `memory` | `navigator.deviceMemory` |
| `fingerprint.battery.charging` | `charging` | `BatteryManager.charging` |
| `fingerprint.battery.level` | `level` | `BatteryManager.level` |

### What Is NOT Generated

The following are hand-written in the shim (not derived from OpenAPI):

- `ProfileEnvelope` — the on-disk wrapper struct (`schema_version`, `created_at`, `request`, `response`)
- `FingerprintAccessor` — process-global singleton accessor
- `FingerprintLoader` — file reading and pre-sandbox init
- Noise PRNG state and functions

### Build Integration

- GN build step runs the generator before compiling the shim.
- CI validates generated files are up-to-date (same pattern as the dashboard's `pnpm generate-types` check).

### Lockstep Guarantee

If a field is added or renamed in `openapi.yaml`, the generated code updates automatically and any mismatches become compile errors. Same pattern as the dashboard (`openapi-typescript` → TS types) and backend (`oapi-codegen` → Go server + types).

## Surface Override Patches

Each patch intercepts a Chromium/Blink API at the point where it returns a value to JavaScript, checks `FingerprintAccessor::Get()`, and substitutes the spoofed value. If accessor returns `nullptr`, the original value passes through unchanged (vanilla mode).

### Navigator Properties

| JS API | Patch location | Override (generated field) |
|--------|---------------|----------|
| `navigator.userAgent` | `third_party/blink/renderer/core/frame/navigator.cc` | `fingerprint.user_agent` |
| `navigator.platform` | Same file | `fingerprint.platform` |
| `navigator.language` | Same file | `fingerprint.language[0]` |
| `navigator.languages` | Same file | `fingerprint.language` (full array) |
| `navigator.hardwareConcurrency` | Same file | `fingerprint.hardware.concurrency` |
| `navigator.deviceMemory` | Same file | `fingerprint.hardware.memory` |

### Screen Metrics

| JS API | Patch location | Override (generated field) |
|--------|---------------|----------|
| `screen.width/height/avail*` | `third_party/blink/renderer/core/frame/screen.cc` | `fingerprint.screen.*` |
| `window.devicePixelRatio` | `third_party/blink/renderer/core/frame/local_dom_window.cc` | `fingerprint.screen.pixel_ratio` |

### Canvas 2D

| JS API | Patch location | Override |
|--------|---------------|----------|
| `canvas.toDataURL()` | `third_party/blink/renderer/core/html/canvas/html_canvas_element.cc` | Apply seeded noise to pixel buffer before encoding |
| `canvas.toBlob()` | Same file | Same noise application |
| `getImageData()` | `third_party/blink/renderer/modules/canvas/canvas2d/canvas_rendering_context_2d.cc` | Apply seeded noise to returned pixel data |

Noise strategy: PRNG seeded with `fingerprint.canvas_seed`, generates per-pixel offset (±1 per channel), deterministic across calls for same content.

### WebGL

| JS API | Patch location | Override (generated field) |
|--------|---------------|----------|
| `getParameter(VENDOR/RENDERER)` | `third_party/blink/renderer/modules/webgl/webgl_rendering_context_base.cc` | `fingerprint.webgl.vendor` / `fingerprint.webgl.renderer` |
| `WEBGL_debug_renderer_info` | Same file | Same strings via debug extension |
| `readPixels()` | Same file | Apply seeded noise (same strategy as Canvas, using `fingerprint.canvas_seed`) |

### AudioContext

| JS API | Patch location | Override |
|--------|---------------|----------|
| `AudioBuffer.getChannelData()` | `third_party/blink/renderer/modules/webaudio/audio_buffer.cc` | Apply seeded float noise (±1e-7) using `fingerprint.audio_seed` |
| `AnalyserNode.getFloatFrequencyData()` | `third_party/blink/renderer/modules/webaudio/analyser_node.cc` | Same noise strategy |

### ClientRects

| JS API | Patch location | Override |
|--------|---------------|----------|
| `Element.getClientRects()` | `third_party/blink/renderer/core/dom/element.cc` | Apply seeded sub-pixel offset (±0.001px) using `fingerprint.client_rects_seed` |
| `Element.getBoundingClientRect()` | Same file | Same offset |

### Fonts

| JS API | Patch location | Override (generated field) |
|--------|---------------|----------|
| Font enumeration | `third_party/blink/renderer/platform/fonts/font_cache.cc` | Filter system fonts to only those in `fingerprint.fonts` list |

### Media Devices

| JS API | Patch location | Override (generated field) |
|--------|---------------|----------|
| `navigator.mediaDevices.enumerateDevices()` | `third_party/blink/renderer/modules/mediastream/media_devices.cc` | Return `fingerprint.media_devices` list |

### Plugins

| JS API | Patch location | Override (generated field) |
|--------|---------------|----------|
| `navigator.plugins` | `third_party/blink/renderer/core/page/navigator_plugins.cc` | Return `fingerprint.plugins` list |

### Battery

| JS API | Patch location | Override (generated field) |
|--------|---------------|----------|
| `navigator.getBattery()` | `third_party/blink/renderer/modules/battery/battery_manager.cc` | `fingerprint.battery.charging` / `fingerprint.battery.level` |

### Speech Synthesis

| JS API | Patch location | Override (generated field) |
|--------|---------------|----------|
| `speechSynthesis.getVoices()` | `third_party/blink/renderer/modules/speech/speech_synthesis.cc` | Filter to `fingerprint.speech_voices` list |

### Timezone & Language (Process-Level)

| Surface | Approach |
|---------|----------|
| Timezone | Set `TZ` env var before ICU init in each process, affects `Intl.DateTimeFormat`, `Date.getTimezoneOffset()` |
| Language | Override via `--lang` Chromium flag + `--accept-lang` flag, derived from `fingerprint.language` |

## Proxy Routing & WebRTC Leak Prevention

### Proxy Configuration

The shim builds a Chromium `ProxyConfig` from the fingerprint's proxy credentials at startup, before Chromium's network stack initializes.

```
fingerprint.json → response.proxy field:
  host, port, username, password, country, city, connection_type
       │
       ▼
  clawbrowser/proxy/proxy_config.cc
       │
       ├─ Build ProxyConfig: HTTP/HTTPS proxy → host:port
       ├─ Set proxy auth credentials in Chromium's HttpAuthCache
       └─ Pass via --proxy-server=<host:port> flag
```

- Protocol: HTTPS proxy (CONNECT tunnel) for all traffic.
- Auth: Basic auth, credentials pre-loaded into auth cache so Chromium doesn't prompt.
- No proxy rotation mid-session — single proxy for the entire browser lifetime.
- No fingerprint → no proxy → direct connection (vanilla mode).

### WebRTC Leak Prevention

WebRTC can leak the real IP via STUN/TURN even when a proxy is configured. Two patches:

| Surface | Patch location | Override |
|---------|---------------|----------|
| ICE candidate gathering | `third_party/blink/renderer/modules/peerconnection/rtc_peer_connection.cc` | Force `iceTransportPolicy: "relay"` — disables direct STUN, only allows TURN relay |
| Local IP enumeration | `content/renderer/media/webrtc/peer_connection_dependency_factory.cc` | Strip local/host candidates from SDP, only relay candidates pass through |

- When proxy is configured: both patches active — no real IP leaks.
- When no proxy (vanilla mode): patches inactive — normal WebRTC behavior.

### Accept-Language Header

The proxy's geo alignment extends to HTTP headers:

- `Accept-Language` header set to match `fingerprint.language` array.
- Configured via Chromium's `--accept-lang` flag derived from fingerprint data.
- Consistent with `navigator.language`/`navigator.languages` overrides.

## Verification Page (`clawbrowser://verify`)

### Purpose

On startup (unless `--skip-verify`), the browser navigates to `clawbrowser://verify` which runs client-side JS to verify all fingerprint surfaces match the profile. CDP/automation clients wait for verification results before proceeding.

### Implementation

Registered as a Chromium WebUI page (like `chrome://settings`), hosted by the browser process. HTML/JS/CSS are embedded as resources in the binary.

```
Browser starts with --fingerprint
       │
       ▼
  Navigate to clawbrowser://verify
       │
       ▼
  Page JS runs checks (all client-side):
       │
       ├─ Navigator: userAgent, platform, language,
       │   hardwareConcurrency, deviceMemory
       ├─ Screen: width, height, colorDepth, pixelRatio
       ├─ Canvas: render test pattern twice → compare hashes
       │   (determinism check: both must match)
       ├─ WebGL: getParameter(VENDOR), getParameter(RENDERER),
       │   readPixels() twice → compare hashes (determinism check)
       ├─ Audio: OfflineAudioContext twice → compare hashes
       │   (determinism check)
       ├─ ClientRects: getBoundingClientRect() twice on same element
       │   → values must match (stability check)
       ├─ Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
       ├─ Fonts: test known fonts from profile list
       ├─ MediaDevices: enumerateDevices()
       ├─ Plugins: navigator.plugins
       ├─ Battery: navigator.getBattery()
       ├─ SpeechSynthesis: speechSynthesis.getVoices()
       │
       ├─ Proxy check:
       │   Browser process makes POST /v1/proxy/verify server-side,
       │   injects result into page via WebUI message handler
       │   (API key never exposed to page JS context)
       │
       ▼
  Results written to DOM + exposed via JS global:
  window.__clawbrowser_verify = {
    status: "pass" | "fail",
    checks: [
      { surface: "navigator.userAgent", pass: true, expected: "...", actual: "..." },
      { surface: "canvas", pass: true, detail: "deterministic" },
      { surface: "proxy", pass: true, actual_country: "US" },
      ...
    ],
    timestamp: "2026-03-23T..."
  }
```

### Fingerprint Comparison Strategy

The verify page uses two comparison strategies depending on the surface type:

**Direct comparison (for simple values):** The WebUI handler injects expected values from the fingerprint into the page via `window.__clawbrowser_expected`. The page JS reads the actual browser values and compares.

```
window.__clawbrowser_expected = {
  user_agent: "...",
  platform: "...",
  timezone: "America/New_York",
  screen_width: 1920,
  ...
}
```

**Determinism check (for seeded noise surfaces):** Canvas, WebGL readPixels, AudioContext, and ClientRects are verified by rendering the same operation twice and confirming identical output. This proves the PRNG-based noise is deterministic without needing to pre-compute expected hashes in C++ (which would require a software renderer).

### Proxy Verification Authentication

The proxy check (`POST /v1/proxy/verify`) requires a Bearer API key. To avoid exposing the API key to the renderer process JS context:

1. The verify page JS sends a WebUI message to the browser process: `chrome.send('verifyProxy')`.
2. The browser process WebUI handler (`verify_page.cc`) makes the HTTP call using the already-loaded API key.
3. The result is sent back to the page via a JS callback.

This keeps the API key exclusively in the browser process.

### CDP/Automation Integration

Automation clients detect verification completion by:

1. Wait for `clawbrowser://verify` to finish loading.
2. Evaluate `window.__clawbrowser_verify.status` via CDP `Runtime.evaluate`.
3. If `"pass"` → proceed with automation.
4. If `"fail"` → read `checks` array for details, abort or handle.

### Failure Behavior

- Page displays red/green status per surface with details.
- `--skip-verify` bypasses the page entirely (for development/debugging).
- Verification failure does **not** force-quit the browser — the automation client decides how to handle it. This is an intentional deviation from the original design spec, which blocked CDP on failure. Allowing CDP inspection of failure details is more practical for debugging.
- Exit code behavior: when launched with `--fingerprint`, if verify fails and no CDP client connects within 30s, exit with code 1.

## Build System & Project Structure

### Source Layout

The `clawbrowser/` directory sits at the top level of the Chromium source tree, alongside `chrome/`, `content/`, etc.

```
chromium/src/
├── chrome/                    # Existing Chromium browser
├── content/                   # Existing Chromium content layer
├── third_party/blink/         # Existing Blink renderer
├── clawbrowser/               # Shim library
│   ├── BUILD.gn
│   ├── profile_envelope.h          # Hand-written: on-disk wrapper struct
│   ├── profile_envelope.cc
│   ├── fingerprint_loader.h
│   ├── fingerprint_loader.cc
│   ├── fingerprint_accessor.h
│   ├── fingerprint_accessor.cc
│   ├── schemas/
│   │   ├── extract_schemas.py           # Extracts JSON Schema from openapi.yaml
│   │   └── quicktype-chromium-template/ # Custom template for base::Value output
│   ├── generated/
│   │   ├── fingerprint_types.h     # quicktype-generated structs
│   │   ├── fingerprint_types.cc    # quicktype-generated JSON parsing (base::Value)
│   │   └── README.md               # "DO NOT EDIT — generated from api/openapi.yaml"
│   ├── cli/
│   │   ├── args.h
│   │   ├── args.cc
│   │   ├── profile_manager.h
│   │   ├── profile_manager.cc
│   │   ├── api_client.h
│   │   └── api_client.cc
│   ├── proxy/
│   │   ├── proxy_config.h
│   │   └── proxy_config.cc
│   ├── verify/
│   │   ├── verify_page.h
│   │   ├── verify_page.cc
│   │   └── resources/
│   │       ├── verify.html
│   │       ├── verify.js
│   │       └── verify.css
│   ├── noise/
│   │   ├── prng.h
│   │   └── prng.cc
│   ├── patches/
│   │   ├── 001-browser-main-init.patch
│   │   ├── 002-renderer-main-loader.patch
│   │   ├── 003-gpu-main-loader.patch
│   │   ├── 004-child-process-flag-propagation.patch
│   │   ├── 005-navigator-properties.patch
│   │   ├── 006-screen-metrics.patch
│   │   ├── 007-canvas-noise.patch
│   │   ├── 008-webgl-override.patch
│   │   ├── 009-audio-noise.patch
│   │   ├── 010-client-rects-noise.patch
│   │   ├── 011-fonts-filter.patch
│   │   ├── 012-media-devices.patch
│   │   ├── 013-plugins.patch
│   │   ├── 014-battery.patch
│   │   ├── 015-speech-voices.patch
│   │   ├── 016-timezone-env.patch
│   │   ├── 017-webrtc-leak-prevention.patch
│   │   ├── 018-proxy-config.patch
│   │   ├── 019-verify-page-registration.patch
│   │   └── 020-build-dep.patch
│   └── test/
│       ├── fixtures/
│       │   ├── valid_fingerprint.json
│       │   ├── minimal_fingerprint.json
│       │   └── malformed_fingerprint.json
│       ├── fingerprint_loader_unittest.cc
│       ├── profile_envelope_unittest.cc
│       ├── api_client_unittest.cc
│       ├── args_unittest.cc
│       ├── profile_manager_unittest.cc
│       ├── proxy_config_unittest.cc
│       └── prng_unittest.cc
```

### GN Build

```gn
static_library("clawbrowser") {
  sources = [
    "profile_envelope.cc",
    "fingerprint_loader.cc",
    "fingerprint_accessor.cc",
    "generated/fingerprint_types.cc",
    "cli/args.cc",
    "cli/profile_manager.cc",
    "cli/api_client.cc",
    "proxy/proxy_config.cc",
    "verify/verify_page.cc",
    "noise/prng.cc",
  ]
  deps = [
    "//base",
    "//net",
    "//content/public/browser",
    "//content/public/renderer",
  ]
}

test("clawbrowser_unittests") {
  sources = [
    "test/fingerprint_loader_unittest.cc",
    "test/profile_envelope_unittest.cc",
    "test/api_client_unittest.cc",
    "test/args_unittest.cc",
    "test/profile_manager_unittest.cc",
    "test/proxy_config_unittest.cc",
    "test/prng_unittest.cc",
  ]
  deps = [
    ":clawbrowser",
    "//testing/gtest",
  ]
}
```

No external JSON library dependency — uses Chromium's built-in `base::Value` / `base::JSONReader`.

### Chromium Patches

All patches tracked in `clawbrowser/patches/` using `git diff` format for easy reapplication after upstream rebases.

| Patch | File(s) modified | Purpose |
|-------|-----------------|---------|
| 001 | `chrome/browser/chrome_browser_main.cc` | Browser process: CLI init + fingerprint load |
| 002 | `content/renderer/renderer_main.cc` | Renderer process: pre-sandbox fingerprint load |
| 003 | `content/gpu/gpu_main.cc` | GPU process: pre-sandbox fingerprint load |
| 004 | `content/browser/child_process_launcher.cc` | Propagate `--clawbrowser-fp-path` to child processes |
| 005 | `third_party/blink/renderer/core/frame/navigator.cc` | Navigator property overrides |
| 006 | `screen.cc`, `local_dom_window.cc` | Screen metrics + devicePixelRatio |
| 007 | `html_canvas_element.cc`, `canvas_rendering_context_2d.cc` | Canvas 2D seeded noise |
| 008 | `webgl_rendering_context_base.cc` | WebGL vendor/renderer + readPixels noise |
| 009 | `audio_buffer.cc`, `analyser_node.cc` | AudioContext seeded noise |
| 010 | `element.cc` | ClientRects seeded offset |
| 011 | `font_cache.cc` | Font enumeration filter |
| 012 | `media_devices.cc` | MediaDevices override |
| 013 | `navigator_plugins.cc` | Plugins override |
| 014 | `battery_manager.cc` | Battery API override |
| 015 | `speech_synthesis.cc` | Speech voices filter |
| 016 | ICU init paths | TZ env var before ICU init |
| 017 | `rtc_peer_connection.cc`, `peer_connection_dependency_factory.cc` | WebRTC leak prevention |
| 018 | Network stack init | Proxy setup integration |
| 019 | WebUI registration | Register `clawbrowser://verify` page |
| 020 | `chrome/BUILD.gn` | Add `//clawbrowser` dependency |

### Rebase Strategy

- Patches are small and isolated (1–5 lines each in Chromium files).
- `clawbrowser/` directory is untouched by upstream — never conflicts.
- On Chromium update: re-apply patches, fix any that fail due to upstream changes.
- Patch files are version-tagged with the Chromium version they were tested against.

## Testing Strategy

### Unit Tests (`clawbrowser_unittests`)

All shim logic tested independently, no Chromium UI needed.

| Test suite | What it covers |
|-----------|---------------|
| `fingerprint_loader_unittest` | File reading: valid path, missing file, empty file, permissions error, malformed JSON, missing required fields |
| `profile_envelope_unittest` | Envelope parsing: schema_version check, created_at, request params extraction, response delegation to generated parser |
| `api_client_unittest` | HTTP calls: success responses, timeout handling, error parsing (401, 429, 500), network failure |
| `args_unittest` | CLI parsing: all flag combinations, unknown flags pass through, no flags = vanilla mode |
| `profile_manager_unittest` | List profiles, read/write fingerprint.json, config.json loading, env var precedence for API key |
| `proxy_config_unittest` | ProxyConfig construction from fingerprint, no-proxy case |
| `prng_unittest` | Deterministic output: same seed → same sequence, different seeds → different, noise within bounds |

### Integration Tests (Browser-Level)

Run a full clawbrowser instance with a test fingerprint file, use CDP to verify surfaces.

| Test | What it verifies |
|------|-----------------|
| Navigator properties | CDP eval `navigator.userAgent` etc. matches fingerprint |
| Screen metrics | CDP eval `screen.width` etc. matches fingerprint |
| Canvas determinism | Render same pattern twice → identical `toDataURL()` hash |
| WebGL strings | CDP eval `getParameter(VENDOR/RENDERER)` matches fingerprint |
| Audio determinism | OfflineAudioContext → `getChannelData()` hash is stable across calls |
| ClientRects stability | Same element → same sub-pixel offsets across calls |
| Timezone | CDP eval `Intl.DateTimeFormat().resolvedOptions().timeZone` matches |
| Fonts | Probe fingerprint fonts → detected, probe non-fingerprint fonts → not detected |
| Media devices | CDP eval `enumerateDevices()` matches fingerprint list |
| Plugins | CDP eval `navigator.plugins` matches fingerprint list |
| Battery | CDP eval `navigator.getBattery()` matches fingerprint values |
| Speech voices | CDP eval `speechSynthesis.getVoices()` matches fingerprint list |
| Proxy routing | Fetch external IP check service via CDP → IP is proxy IP, not real |
| WebRTC leak | Create RTCPeerConnection, gather candidates → no host candidates, only relay |
| Vanilla mode | Launch without `--fingerprint` → all surfaces return real values |
| Verify page | Navigate to `clawbrowser://verify` → `window.__clawbrowser_verify.status === "pass"` |
| Cross-tab consistency | Open two tabs → same fingerprint values in both |
| Cross-process consistency | Open page that spawns new renderer → same fingerprint |

### Test Infrastructure

- Test fingerprint files: static JSON fixtures in `clawbrowser/test/fixtures/`.
- CDP client: Python script or Node.js using Puppeteer/Playwright connecting to `--remote-debugging-port`.
- CI: unit tests run on every commit, integration tests run on nightly or pre-release builds (full Chromium build required).

## Error Handling & Edge Cases

### Startup Errors (Fail Fast)

| Scenario | Behavior |
|----------|----------|
| `--fingerprint` but no API key (no env var, no config.json) | Stderr: `[clawbrowser] error: API key not found. Set CLAWBROWSER_API_KEY or add api_key to config.json` Exit 1 |
| API call fails (network) | Stderr: `[clawbrowser] error: cannot reach API at <url>: <reason>` Exit 1 |
| API call fails (401) | Stderr: `[clawbrowser] error: invalid API key` Exit 1 |
| API call fails (429) | Stderr: `[clawbrowser] error: rate limited, try again later` Exit 1 |
| API call fails (500) | Stderr: `[clawbrowser] error: API server error` Exit 1 |
| Fingerprint JSON malformed | Stderr: `[clawbrowser] error: failed to parse fingerprint.json: <detail>` Exit 1 |
| Fingerprint JSON missing required field | Stderr: `[clawbrowser] error: fingerprint missing field: <name>` Exit 1 |
| Profile directory not writable | Stderr: `[clawbrowser] error: cannot write to <path>: <reason>` Exit 1 |

All errors go to stderr. With `--output=json`, errors also emit structured JSON:

```json
{"error": "invalid_api_key", "message": "invalid API key"}
```

### Runtime Edge Cases

| Scenario | Behavior |
|----------|----------|
| Proxy drops mid-session | Chromium's native proxy error page shows. No auto-recovery — session is tied to one proxy. User must restart. |
| Multiple `--fingerprint` flags | Last one wins (standard Chromium flag behavior). |
| Invalid `--fingerprint` ID format | Stderr: `[clawbrowser] error: invalid fingerprint ID: <value>` Exit 1 |
| `fingerprint.json` with outdated `schema_version` | Warn to stderr: `[clawbrowser] warn: fingerprint schema version <N> is outdated, consider --regenerate`. Still attempt to load — missing optional fields degrade gracefully. |

### Graceful Degradation

If a fingerprint field is `null` or absent, that specific surface override is skipped — the real browser value passes through. This allows partial fingerprints (e.g., proxy-only profiles without canvas spoofing) and forward compatibility when new surfaces are added to the API before the browser supports them.

## Deferred (Post-MVP)

| Item | Reason |
|------|--------|
| TLS/JA3 fingerprinting | Requires BoringSSL patches, significant complexity — separate spec |
| Linux support | macOS MVP first, Linux patches differ (sandbox model, font paths) |
| Android support | Different Chromium build target, different proxy/sandbox model |
| Chromium upstream rebase automation | Manual patch reapplication for MVP, tooling later |
| `navigator.plugins` deprecation | Already deprecated, keep override but expect it to become no-op |
| Multi-proxy / proxy rotation | Single proxy per session by design |
| Fingerprint hot-reload | Restart browser for new fingerprint — acceptable for MVP |
| Headless mode optimizations | Standard `--headless` works, dedicated testing deferred |
| Auto-update mechanism | Manual builds for MVP |
