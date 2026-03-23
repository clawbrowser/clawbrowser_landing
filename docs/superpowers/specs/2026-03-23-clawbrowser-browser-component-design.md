# Clawbrowser Browser Component Design Spec

## Overview

The clawbrowser browser component is a patched Chromium browser (latest stable at time of implementation, macOS MVP) with built-in fingerprint spoofing, proxy routing, and a CLI for profile management. All custom logic lives in a `clawbrowser/` shim library compiled as a static library and linked into the Chromium browser target. Chromium subsystem patches are minimal hooks (1–5 lines each) calling into the shim.

**Key architectural decisions:**

- **Pure C++** — all fingerprint injection logic lives in Chromium patches and the shim library. No Rust, no FFI, no JS injection.
- **Thin shim + minimal patches** — `clawbrowser/` shim is a static library with CLI, API client, fingerprint loading, proxy config, verification, and noise generation. Each Chromium subsystem patch is a 1–5 line hook into the shim.
- **File-path IPC** — fingerprint data is passed to child processes via `--clawbrowser-fp-path=<path>` flag. Each process reads the file during pre-sandbox init. No shared memory, no Mojo IPC, no sandbox modifications.
- **Code-generated types** — `FingerprintData` struct and JSON parser are auto-generated from `api/openapi.yaml` using quicktype, keeping the browser in lockstep with the backend API.
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
│   ├── Default/                     # Vanilla profile (no fingerprint)
│   └── fp_abc123/                   # Fingerprint profile
│       ├── fingerprint.json         # GenerateResponse body + metadata
│       └── <Chromium profile data>  # cookies, localStorage, etc.
```

### Startup Flow

```
Parse args
  │
  ├─ --list? → Print cached profiles → exit
  │
  ├─ --fingerprint=<id>?
  │   ├─ --regenerate OR no cached profile?
  │   │   ├─ Load API key from config.json
  │   │   ├─ POST /v1/fingerprints/generate
  │   │   ├─ Save response to fp_<id>/fingerprint.json
  │   │   └─ Continue
  │   ├─ Cached profile exists?
  │   │   └─ Read fp_<id>/fingerprint.json → Continue
  │   │
  │   ├─ Set --clawbrowser-fp-path=<path to fingerprint.json>
  │   ├─ Set --user-data-dir=<fp_<id> profile dir>
  │   ├─ Configure proxy from fingerprint proxy config
  │   └─ Launch Chromium → clawbrowser://verify (unless --skip-verify)
  │
  └─ No --fingerprint?
      └─ Launch vanilla Chromium (Default profile, no spoofing)
```

### API Client

The shim includes a C++ HTTP client for pre-launch API calls, using Chromium's built-in network stack or a lightweight HTTP client (e.g., libcurl statically linked).

- Only two endpoints: `POST /v1/fingerprints/generate`, `POST /v1/proxy/verify`.
- Bearer auth with API key from `config.json`.
- Timeout: 10s, no retries — fail fast with clear error message.
- Errors print to stderr and exit with non-zero code.

### Logging

- Default: silent (no clawbrowser output).
- `--verbose`: structured `[clawbrowser]` prefixed messages to stderr.
- `--output=json`: machine-readable JSON to stdout (for `--list` and error cases).

## Fingerprint Loading & Sandbox Integration

### Data Lifecycle

```
fingerprint.json on disk
       │
       │ (1) Browser process reads at startup
       │     (pre-Chromium init)
       ▼
  In-memory FingerprintData struct
       │
       │ (2) --clawbrowser-fp-path flag inherited by child processes
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

## Code Generation from OpenAPI

The `FingerprintData` C++ struct and its JSON parser are auto-generated from the backend's OpenAPI spec (`api/openapi.yaml`) using **quicktype**, keeping the browser in lockstep with the backend API.

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
       ▼
clawbrowser/generated/
├── fingerprint_types.h       # Struct definitions
├── fingerprint_types.cc      # JSON parsing (nlohmann/json)
└── README.md                 # "DO NOT EDIT — generated from api/openapi.yaml"
```

### What Gets Generated

From OpenAPI schemas:

- `GenerateResponse` → top-level response struct
- `Fingerprint` → all surface fields (user_agent, platform, screen, hardware, webgl, canvas_seed, audio_seed, client_rects_seed, timezone, language, fonts, media_devices, plugins, battery, speech_voices)
- `ProxyConfig` → proxy credentials (host, port, username, password, country, city, connection_type)
- `Screen`, `Hardware`, `WebGL`, `MediaDevice`, `Plugin`, `Battery` → nested structs
- `VerifyProxyRequest` / `VerifyProxyResponse` → used by API client and verify page

### Build Integration

- GN build step runs the generator before compiling the shim.
- CI validates generated files are up-to-date (same pattern as the dashboard's `pnpm generate-types` check).
- Manual structs only for browser-internal concepts not in the API (e.g., noise PRNG state).

### Lockstep Guarantee

If a field is added or renamed in `openapi.yaml`, the generated code updates automatically and any mismatches become compile errors. Same pattern as the dashboard (`openapi-typescript` → TS types) and backend (`oapi-codegen` → Go server + types).

## Surface Override Patches

Each patch intercepts a Chromium/Blink API at the point where it returns a value to JavaScript, checks `FingerprintAccessor::Get()`, and substitutes the spoofed value. If accessor returns `nullptr`, the original value passes through unchanged (vanilla mode).

### Navigator Properties

| JS API | Patch location | Override |
|--------|---------------|----------|
| `navigator.userAgent` | `third_party/blink/renderer/core/frame/navigator.cc` | Return `user_agent` |
| `navigator.platform` | Same file | Return `platform` |
| `navigator.language` | Same file | Return `language` |
| `navigator.languages` | Same file | Return `languages` |
| `navigator.hardwareConcurrency` | Same file | Return `hardware_concurrency` |
| `navigator.deviceMemory` | Same file | Return `device_memory` |

### Screen Metrics

| JS API | Patch location | Override |
|--------|---------------|----------|
| `screen.width/height/avail*` | `third_party/blink/renderer/core/frame/screen.cc` | Return screen values |
| `window.devicePixelRatio` | `third_party/blink/renderer/core/frame/local_dom_window.cc` | Return `pixel_ratio` |

### Canvas 2D

| JS API | Patch location | Override |
|--------|---------------|----------|
| `canvas.toDataURL()` | `third_party/blink/renderer/core/html/canvas/html_canvas_element.cc` | Apply seeded noise to pixel buffer before encoding |
| `canvas.toBlob()` | Same file | Same noise application |
| `getImageData()` | `third_party/blink/renderer/modules/canvas/canvas2d/canvas_rendering_context_2d.cc` | Apply seeded noise to returned pixel data |

Noise strategy: PRNG seeded with `canvas_seed`, generates per-pixel offset (±1 per channel), deterministic across calls for same content.

### WebGL

| JS API | Patch location | Override |
|--------|---------------|----------|
| `getParameter(VENDOR/RENDERER)` | `third_party/blink/renderer/modules/webgl/webgl_rendering_context_base.cc` | Return `webgl_vendor`/`webgl_renderer` |
| `WEBGL_debug_renderer_info` | Same file | Same strings via debug extension |
| `readPixels()` | Same file | Apply seeded noise (same strategy as Canvas, using `canvas_seed`) |

### AudioContext

| JS API | Patch location | Override |
|--------|---------------|----------|
| `AudioBuffer.getChannelData()` | `third_party/blink/renderer/modules/webaudio/audio_buffer.cc` | Apply seeded float noise (±1e-7) using `audio_seed` |
| `AnalyserNode.getFloatFrequencyData()` | `third_party/blink/renderer/modules/webaudio/analyser_node.cc` | Same noise strategy |

### ClientRects

| JS API | Patch location | Override |
|--------|---------------|----------|
| `Element.getClientRects()` | `third_party/blink/renderer/core/dom/element.cc` | Apply seeded sub-pixel offset (±0.001px) using `client_rects_seed` |
| `Element.getBoundingClientRect()` | Same file | Same offset |

### Fonts

| JS API | Patch location | Override |
|--------|---------------|----------|
| Font enumeration | `third_party/blink/renderer/platform/fonts/font_cache.cc` | Filter system fonts to only those in `fonts` list |

### Media Devices

| JS API | Patch location | Override |
|--------|---------------|----------|
| `navigator.mediaDevices.enumerateDevices()` | `third_party/blink/renderer/modules/mediastream/media_devices.cc` | Return `media_devices` list |

### Plugins

| JS API | Patch location | Override |
|--------|---------------|----------|
| `navigator.plugins` | `third_party/blink/renderer/core/page/navigator_plugins.cc` | Return `plugins` list |

### Battery

| JS API | Patch location | Override |
|--------|---------------|----------|
| `navigator.getBattery()` | `third_party/blink/renderer/modules/battery/battery_manager.cc` | Return `battery_charging`/`battery_level` |

### Speech Synthesis

| JS API | Patch location | Override |
|--------|---------------|----------|
| `speechSynthesis.getVoices()` | `third_party/blink/renderer/modules/speech/speech_synthesis.cc` | Filter to `speech_voices` list |

### Timezone & Language (Process-Level)

| Surface | Approach |
|---------|----------|
| Timezone | Set `TZ` env var before ICU init in each process, affects `Intl.DateTimeFormat`, `Date.getTimezoneOffset()` |
| Language | Override via `--lang` Chromium flag + Accept-Language header via fingerprint data |

## Proxy Routing & WebRTC Leak Prevention

### Proxy Configuration

The shim builds a Chromium `ProxyConfig` from the fingerprint's proxy credentials at startup, before Chromium's network stack initializes.

```
fingerprint.json proxy field:
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

- `Accept-Language` header set to match fingerprint `languages` array.
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
       ├─ Canvas: render test pattern → toDataURL() → hash
       ├─ WebGL: getParameter(VENDOR), getParameter(RENDERER),
       │   readPixels() → hash
       ├─ Audio: OfflineAudioContext → getChannelData() → hash
       ├─ ClientRects: getBoundingClientRect() on test element → values
       ├─ Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
       ├─ Fonts: test known fonts from profile list
       ├─ MediaDevices: enumerateDevices()
       ├─ Plugins: navigator.plugins
       ├─ Battery: navigator.getBattery()
       ├─ SpeechSynthesis: speechSynthesis.getVoices()
       │
       ├─ Proxy check:
       │   POST /v1/proxy/verify (via fetch from page)
       │   Confirms exit IP matches expected country/city
       │
       ▼
  Results written to DOM + exposed via JS global:
  window.__clawbrowser_verify = {
    status: "pass" | "fail",
    checks: [
      { surface: "navigator.userAgent", pass: true },
      { surface: "canvas", pass: true },
      { surface: "proxy", pass: true, actual_country: "US" },
      ...
    ],
    timestamp: "2026-03-23T..."
  }
```

### CDP/Automation Integration

Automation clients detect verification completion by:

1. Wait for `clawbrowser://verify` to finish loading.
2. Evaluate `window.__clawbrowser_verify.status` via CDP `Runtime.evaluate`.
3. If `"pass"` → proceed with automation.
4. If `"fail"` → read `checks` array for details, abort or handle.

### Fingerprint Comparison

The page accesses expected fingerprint values via a second JS global injected by the WebUI handler:

```
window.__clawbrowser_expected = {
  user_agent: "...",
  platform: "...",
  canvas_hash: "...",   // pre-computed by shim from seed
  ...
}
```

The shim pre-computes expected hashes for seeded surfaces (canvas, audio, client rects) using the same PRNG + test patterns that the verify page will render.

### Failure Behavior

- Page displays red/green status per surface with details.
- `--skip-verify` bypasses the page entirely (for development/debugging).
- Verification failure does **not** force-quit the browser — the automation client decides how to handle it.
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
│   ├── fingerprint_loader.h
│   ├── fingerprint_loader.cc
│   ├── fingerprint_accessor.h
│   ├── fingerprint_accessor.cc
│   ├── schemas/
│   │   └── extract_schemas.py      # Extracts JSON Schema from openapi.yaml
│   ├── generated/
│   │   ├── fingerprint_types.h     # quicktype-generated structs
│   │   ├── fingerprint_types.cc    # quicktype-generated JSON parsing
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
│   │   ├── 004-navigator-properties.patch
│   │   ├── 005-screen-metrics.patch
│   │   ├── 006-canvas-noise.patch
│   │   ├── 007-webgl-override.patch
│   │   ├── 008-audio-noise.patch
│   │   ├── 009-client-rects-noise.patch
│   │   ├── 010-fonts-filter.patch
│   │   ├── 011-media-devices.patch
│   │   ├── 012-plugins.patch
│   │   ├── 013-battery.patch
│   │   ├── 014-speech-voices.patch
│   │   ├── 015-timezone-env.patch
│   │   ├── 016-webrtc-leak-prevention.patch
│   │   ├── 017-proxy-config.patch
│   │   ├── 018-verify-page-registration.patch
│   │   └── 019-build-dep.patch
│   └── test/
│       ├── fixtures/
│       │   ├── valid_fingerprint.json
│       │   ├── minimal_fingerprint.json
│       │   └── malformed_fingerprint.json
│       ├── fingerprint_loader_unittest.cc
│       ├── args_unittest.cc
│       ├── profile_manager_unittest.cc
│       ├── proxy_config_unittest.cc
│       └── prng_unittest.cc
```

### GN Build

```gn
static_library("clawbrowser") {
  sources = [
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
    "//third_party/nlohmann_json",
  ]
}

test("clawbrowser_unittests") {
  sources = [
    "test/fingerprint_loader_unittest.cc",
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

### Chromium Patches

All patches tracked in `clawbrowser/patches/` using `git diff` format for easy reapplication after upstream rebases.

| Patch | File(s) modified | Purpose |
|-------|-----------------|---------|
| 001 | `chrome/browser/chrome_browser_main.cc` | Browser process: CLI init + fingerprint load |
| 002 | `content/renderer/renderer_main.cc` | Renderer process: pre-sandbox fingerprint load |
| 003 | `content/gpu/gpu_main.cc` | GPU process: pre-sandbox fingerprint load |
| 004 | `third_party/blink/renderer/core/frame/navigator.cc` | Navigator property overrides |
| 005 | `screen.cc`, `local_dom_window.cc` | Screen metrics + devicePixelRatio |
| 006 | `html_canvas_element.cc`, `canvas_rendering_context_2d.cc` | Canvas 2D seeded noise |
| 007 | `webgl_rendering_context_base.cc` | WebGL vendor/renderer + readPixels noise |
| 008 | `audio_buffer.cc`, `analyser_node.cc` | AudioContext seeded noise |
| 009 | `element.cc` | ClientRects seeded offset |
| 010 | `font_cache.cc` | Font enumeration filter |
| 011 | `media_devices.cc` | MediaDevices override |
| 012 | `navigator_plugins.cc` | Plugins override |
| 013 | `battery_manager.cc` | Battery API override |
| 014 | `speech_synthesis.cc` | Speech voices filter |
| 015 | ICU init paths | TZ env var before ICU init |
| 016 | `rtc_peer_connection.cc`, `peer_connection_dependency_factory.cc` | WebRTC leak prevention |
| 017 | Network stack init | Proxy setup integration |
| 018 | WebUI registration | Register `clawbrowser://verify` page |
| 019 | `chrome/BUILD.gn` | Add `//clawbrowser` dependency |

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
| `fingerprint_loader_unittest` | File reading: valid path, missing file, empty file, permissions error |
| `args_unittest` | CLI parsing: all flag combinations, unknown flags pass through, no flags = vanilla mode |
| `profile_manager_unittest` | List profiles, read/write fingerprint.json, config.json loading |
| `proxy_config_unittest` | ProxyConfig construction from fingerprint, no-proxy case |
| `prng_unittest` | Deterministic output: same seed → same sequence, different seeds → different, noise within bounds |

Generated type parsing is tested implicitly — malformed JSON and missing fields are covered by `fingerprint_loader_unittest` using test fixtures.

### Integration Tests (Browser-Level)

Run a full clawbrowser instance with a test fingerprint file, use CDP to verify surfaces.

| Test | What it verifies |
|------|-----------------|
| Navigator properties | CDP eval `navigator.userAgent` etc. matches fingerprint |
| Screen metrics | CDP eval `screen.width` etc. matches fingerprint |
| Canvas determinism | Render same pattern twice → identical `toDataURL()` hash, matches expected |
| WebGL strings | CDP eval `getParameter(VENDOR/RENDERER)` matches fingerprint |
| Audio determinism | OfflineAudioContext → `getChannelData()` hash matches expected |
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
| `--fingerprint` but no `config.json` | Stderr: `[clawbrowser] error: config.json not found at <path>. Run setup first.` Exit 1 |
| `config.json` missing API key | Stderr: `[clawbrowser] error: api_key not set in config.json` Exit 1 |
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
| `fingerprint.json` from older API version | Check a `version` field in the JSON. If missing or outdated, warn and suggest `--regenerate` but still attempt to load. |

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
