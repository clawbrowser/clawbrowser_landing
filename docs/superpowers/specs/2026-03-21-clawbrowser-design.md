# Clawbrowser.ai — Design Specification

## Overview

Clawbrowser.ai is a Chromium-forked browser with built-in fingerprint control and proxy routing, optimized for AI agent automation and multi-account management. It reduces captcha triggers and anti-bot detection by providing managed fingerprint identities and transparent proxy routing.

**Target users:** Human multi-account users and AI agents. AI agent integration is the key differentiator.

## Architecture

**Approach:** Chromium fork + embedded Rust library (libclaw) via FFI. Single binary, single process.

```
┌──────────────────────────────────────────────────────┐
│              Patched Chromium (C++)                   │
│                                                      │
│  main():                                             │
│  - CLI arg parsing (--fingerprint, --new, etc.)      │
│  - API key loading from env (CLAWBROWSER_API_KEY)           │
│  - Profile loading/generation                        │
│  - Launches libclaw::init()                          │
│                                                      │
│  Runtime hooks call into:                            │
│  ┌────────────────────────────────────────────┐      │
│  │           libclaw (Rust, via FFI)          │      │
│  │                                            │      │
│  │  Fingerprint Engine:                       │      │
│  │  - Canvas 2D noise (seeded)                │      │
│  │  - WebGL vendor/renderer spoofing          │      │
│  │  - AudioContext perturbation (seeded)       │      │
│  │  - ClientRects noise (seeded)              │      │
│  │  - Font enumeration control                │      │
│  │  - Navigator properties                    │      │
│  │  - Screen/display metrics                  │      │
│  │  - Hardware concurrency/device memory      │      │
│  │  - Battery API                             │      │
│  │  - Media devices                           │      │
│  │  - Plugins                                 │      │
│  │  - Speech synthesis voices                 │
│  │  - Timezone spoofing                      │
│  │  - Language spoofing                      │      │
│  │                                            │      │
│  │  Profile Manager:                          │      │
│  │  - Load profiles from disk                 │      │
│  │  - Save profiles from API response         │      │
│  │                                            │      │
│  │  Proxy Manager:                            │      │
│  │  - Load proxy credentials from profile     │      │
│  │  - Set up proxy connection                 │      │
│  └────────────────────────────────────────────┘      │
│                                                      │
│  C++ patches:                                        │
│  - WebRTC IP leak prevention                         │
│  - Custom proxy resolver (delegates to libclaw)      │
│  - Sandbox modified for shared memory read access for fingerprint values injection into chromium window forks and sub processes    │
│                                                      │
│  Standard CDP/DevTools Protocol (untouched)           │
└──────────────────────────────────────────────────────┘
```

### Shared Static Memory

`libclaw::init(profile)` loads the fingerprint profile into a shared memory region accessible by all Chromium sub-processes and forks (browser process, renderer processes, GPU process). This is critical for:

- No IPC overhead per fingerprint query — processes read directly
- No FFI calls per JS API invocation — V8 reads values from memory
- Simpler development — add a new fingerprint surface by writing to shared memory in init, reading in the hook

The Chromium sandbox is modified to allow read-only access to this shared region.

### Shared Memory Implementation (macOS)

The shared memory mechanism uses POSIX `shm_open` to create a named shared memory region:

1. **Browser process (main):** `libclaw::init()` creates a named shared memory object (`/clawbrowser-<profileID>-<pid>`), writes the serialized fingerprint profile with a magic header for validation, and marks it read-only. On startup, any stale `/clawbrowser-<profileID>-*` objects from crashed sessions are unlinked before creation.
2. **FD inheritance:** The shared memory file descriptor is inherited by child processes before sandbox lockdown. Chromium's `content::ChildProcessLauncher` is patched to pass the FD via the `--clawbrowser-shm-fd=<N>` flag.
3. **Sandbox policy:** The macOS sandbox profile (`content/browser/sandbox_mac.mm` / `.sb` policy files) is modified to add a read-only exception for the inherited clawbrowser shared memory FD. No other file or memory access is granted.
4. **Process access:**
   - Renderer processes (V8): read fingerprint values (navigator, screen, canvas seeds, etc.)
   - GPU process: read WebGL vendor/renderer values
   - Browser process: read proxy credentials, manage WebRTC policy
5. **Cleanup:** Shared memory object is unlinked on browser shutdown.

## Fingerprint Engine

### Generation

Fingerprints are generated by a hosted backend API (SaaS). The browser calls the API when creating a new profile. Browser detects it by non existing profile directory in browser directory. The API is stateless — it generates and returns a fingerprint, the browser saves it locally.

Fingerprints are deterministic per profile — seeded PRNG ensures consistent identity across sessions. Users explicitly regenerate when they want new values.

### On-Disk Profile Format

The on-disk `fingerprint.json` is the `GenerateResponse` body verbatim, plus metadata:

```json
{
  "schema_version": 1,
  "created_at": "2026-03-21T14:30:00Z",
  "request": {
    "platform": "macos",
    "browser": "chrome",
    "country": "US",
    "city": "NYC",
    "connection_type": "residential"
  },
  "fingerprint": { ... },
  "proxy": { ... }
}
```

The `request` field stores the original `GenerateRequest` parameters, enabling `--regenerate` to replay the API call without requiring the user to re-specify parameters.

If a future clawbrowser version encounters an older `schema_version`, it rejects the profile with an error and the user must regenerate with `--new`.

### Spoofed Surfaces

**Native C++ patches (hook into Chromium rendering pipeline):**

| Surface | Patch Location | Mechanism |
|---------|---------------|-----------|
| Canvas 2D | `HTMLCanvasElement::toDataURL`, `toBlob`, `getImageData` | Reads seed from shared memory, applies deterministic noise |
| WebGL | `WebGLRenderingContext::getParameter` | Reads vendor/renderer from shared memory |
| WebGL canvas | `readPixels`, `toDataURL` on WebGL context | Same noise injection as Canvas 2D |
| AudioContext | `OfflineAudioContext::startRendering` | Reads seed from shared memory, perturbs audio buffer |
| ClientRects | `Element::getClientRects`, `getBoundingClientRect` | Reads seed from shared memory, adds sub-pixel noise |
| WebRTC | `cricket::BasicPortAllocator`, force relay-only mode via `PeerConnection` ICE transport policy | Prevents local/host candidate generation, only TURN relay candidates allowed |
| Proxy | `NetworkDelegate` / proxy resolver | Routes through profile proxy credentials |

**Values read from shared memory by V8/renderers:**

| Surface | Value |
|---------|-------|
| User-Agent | `navigator.userAgent` |
| Screen | `screen.width/height/availWidth/availHeight/colorDepth/pixelRatio` |
| Device memory | `navigator.deviceMemory` |
| Hardware concurrency | `navigator.hardwareConcurrency` |
| Platform / OS | `navigator.platform` |
| Language | `navigator.language/languages` |
| Timezone | Aligned with proxy geo |
| Fonts | Controlled enumeration list |
| Battery API | Returns static values from profile (disabling would be a detectable signal) |
| Media devices | Synthetic device list |
| Plugins | Synthetic `navigator.plugins` array |
| Speech voices | Filtered/spoofed voice list |

### Internal Consistency

Generated fingerprints are internally consistent:
- macOS UA won't pair with Windows fonts
- Platform presets generate realistic combinations (e.g., "Chrome 122 on macOS 14, M2, 16GB")
- Timezone and language auto-aligned with proxy geo

## Proxy Manager

### Sources

**Proxy data is loaded together with fingerprint.** Browser is proxy provider agnostic. Proxy credentials (type, host, port, username, password) are included in the fingerprint profile generated by the backend API.

### Behavior

- Proxy credentials come from the fingerprint profile — no separate proxy selection logic
- No CLI flags for proxy parameters — everything is derived from the fingerprint
- No proxy rotation mid-session — one proxy per launch
- If profile has no proxy requirements, browser launches with direct connection
- Timezone and language auto-aligned with proxy geo at injection time
- Proxy credentials may expire. If the proxy connection fails at launch, the browser errors with `[clawbrowser] Error: proxy connection failed` and the user must regenerate the profile (`--regenerate`)

## CLI Design

The `clawbrowser` binary IS the Chromium binary. API key lookup order: `CLAWBROWSER_API_KEY` env var takes precedence over `config.json`. Minimal flags:

```bash
# Launch with existing fingerprint (loads from disk)
clawbrowser --fingerprint=fp_abc123

# Regenerate existing fingerprint (overwrites cached profile)
clawbrowser --fingerprint=fp_abc123 --regenerate

# Launch with no fingerprint (vanilla browser, no spoofing)
clawbrowser

# List all locally cached profiles
clawbrowser --list

# Standard Chromium flags pass through
clawbrowser --fingerprint=fp_abc123 --remote-debugging-port=9222
clawbrowser --fingerprint=fp_abc123 --headless
```

### Stdout

Default mode suppresses Chromium's verbose logging. Only structured clawbrowser messages are output:

```
[clawbrowser] Profile fp_abc123 loaded
[clawbrowser] Proxy connected: US/NYC/residential
[clawbrowser] Fingerprint verified
[clawbrowser] CDP listening on ws://127.0.0.1:9222
[clawbrowser] Browser ready
```

`--verbose` flag enables full Chromium output for debugging.

`--output=json` flag outputs all `[clawbrowser]` messages as structured JSON for machine consumption:

```json
{"event":"profile_loaded","profile_id":"fp_abc123"}
{"event":"proxy_verified"}
{"event":"fingerprint_verified"}
{"event":"cdp_ready","url":"ws://127.0.0.1:9222"}
{"event":"ready"}
```

On verification failure:
```json
{"event":"fingerprint_verification_failed","mismatches":["canvas","webgl_renderer"]}
{"event":"proxy_verification_failed","reason":"proxy country does not match fingerprint country"}
```

`--skip-verify` flag skips the fingerprint verification step (for callers that handle verification themselves or need faster startup).

## Backend Fingerprint API

**Stack:** Go + Kubernetes

**Single endpoint, stateless.** Generates fingerprints on demand.

### OpenAPI 3.1 Specification

```yaml
openapi: 3.1.0
info:
  title: Clawbrowser Fingerprint API
  version: 1.0.0

paths:
  /v1/fingerprints/generate:
    post:
      summary: Generate a browser fingerprint
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GenerateRequest'
      responses:
        '200':
          description: Generated fingerprint
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GenerateResponse'
        '401':
          description: Invalid or missing API key
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '429':
          description: Rate limit exceeded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /v1/proxy/verify:
    post:
      summary: Verify proxy matches expected geo parameters
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/VerifyProxyRequest'
      responses:
        '200':
          description: Proxy verification result
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VerifyProxyResponse'
        '401':
          description: Invalid or missing API key
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '429':
          description: Rate limit exceeded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer

  schemas:
    GenerateRequest:
      type: object
      required: [platform, browser, country]
      properties:
        platform:
          type: string
          enum: [macos]
        browser:
          type: string
          enum: [chrome]
        country:
          type: string
          description: ISO 3166-1 alpha-2
        city:
          type: string
        connection_type:
          type: string
          enum: [residential, datacenter, mobile]

    GenerateResponse:
      type: object
      required: [fingerprint]
      properties:
        fingerprint:
          $ref: '#/components/schemas/Fingerprint'
        proxy:
          $ref: '#/components/schemas/ProxyConfig'

    Fingerprint:
      type: object
      required: [user_agent, platform, screen, hardware, webgl, canvas_seed, audio_seed, client_rects_seed, timezone, language, fonts]
      properties:
        user_agent:
          type: string
        platform:
          type: string
        screen:
          $ref: '#/components/schemas/Screen'
        hardware:
          $ref: '#/components/schemas/Hardware'
        webgl:
          $ref: '#/components/schemas/WebGL'
        canvas_seed:
          type: integer
        audio_seed:
          type: integer
        client_rects_seed:
          type: integer
        timezone:
          type: string
        language:
          type: array
          items:
            type: string
        fonts:
          type: array
          items:
            type: string
        media_devices:
          type: array
          items:
            $ref: '#/components/schemas/MediaDevice'
        plugins:
          type: array
          items:
            $ref: '#/components/schemas/Plugin'
        battery:
          $ref: '#/components/schemas/Battery'
        speech_voices:
          type: array
          items:
            type: string

    Screen:
      type: object
      required: [width, height, avail_width, avail_height, color_depth, pixel_ratio]
      properties:
        width: { type: integer }
        height: { type: integer }
        avail_width: { type: integer }
        avail_height: { type: integer }
        color_depth: { type: integer }
        pixel_ratio: { type: number }

    Hardware:
      type: object
      required: [concurrency, memory]
      properties:
        concurrency: { type: integer }
        memory: { type: integer }

    WebGL:
      type: object
      required: [vendor, renderer]
      properties:
        vendor: { type: string }
        renderer: { type: string }

    MediaDevice:
      type: object
      properties:
        kind: { type: string, enum: [audioinput, audiooutput, videoinput] }
        label: { type: string }
        device_id: { type: string }

    Plugin:
      type: object
      properties:
        name: { type: string }
        description: { type: string }
        filename: { type: string }

    Battery:
      type: object
      properties:
        charging: { type: boolean }
        level: { type: number }

    Error:
      type: object
      required: [code, message]
      properties:
        code:
          type: string
          description: Machine-readable error code
        message:
          type: string
          description: Human-readable error message

    ProxyConfig:
      type: object
      properties:
        country: { type: string }
        city: { type: string }
        connection_type: { type: string }
        host: { type: string }
        port: { type: integer }
        username: { type: string }
        password: { type: string }

    VerifyProxyRequest:
      type: object
      required: [proxy, expected_country]
      properties:
        proxy:
          type: object
          required: [host, port, username, password]
          properties:
            host: { type: string }
            port: { type: integer }
            username: { type: string }
            password: { type: string }
        expected_country:
          type: string
          description: ISO 3166-1 alpha-2
        expected_city:
          type: string

    VerifyProxyResponse:
      type: object
      required: [actual_country]
      properties:
        actual_country:
          type: string
        actual_city:
          type: string
        ipv4:
          type: string
          description: Detected IPv4 address of the proxy
        ipv6:
          type: string
          description: Detected IPv6 address of the proxy
```

## Data Flow

```
clawbrowser --fingerprint=fp_abc123 --new
  │
  │ (inside Chromium main)
  │
  ├─ 1. Parse args
  ├─ 2. Load API key from env (CLAWBROWSER_API_KEY)
  ├─ 3. Profile not found + --new
  │     → POST /v1/fingerprints/generate
  │     → Save to Browser/fp_abc123/fingerprint.json
  ├─ 4. libclaw::init(profile)
  │     → Load profile into shared static memory
  │     → Accessible by all child/forked processes
  │     → Sandbox modified for read access
  ├─ 5. Proxy setup from profile credentials
  ├─ 6. Normal Chromium startup
  ├─ 7. Verification (proxy + fingerprint)
  │     → Browser opens internal clawbrowser://verify page
  │     → Built-in HTML+JavaScript page performs two checks:
  │     │
  │     │  7a. Proxy verification:
  │     │     → Page calls backend API POST /v1/proxy/verify
  │     │       with proxy credentials and expected country/city
  │     │     → Verifies proxy IP matches expected geo
  │     │
  │     │  7b. Fingerprint verification:
  │     │     → Page runs JS to read all fingerprint surfaces:
  │     │       Canvas, WebGL, AudioContext, navigator.*,
  │     │       screen.*, timezone, fonts, etc.
  │     │     → Compares actual values against profile
  │     │
  │     ├─ ALL MATCH →
  │     │   [clawbrowser] Proxy verified
  │     │   [clawbrowser] Fingerprint verified
  │     │   Enable CDP/automation
  │     │   [clawbrowser] CDP listening on ws://127.0.0.1:9222
  │     │   [clawbrowser] Browser ready
  │     │
  │     ├─ PROXY MISMATCH →
  │     │   [clawbrowser] Proxy verification FAILED
  │     │   Show error page in browser with details
  │     │   CDP not enabled
  │     │   Exit with error code 1
  │     │
  │     └─ FINGERPRINT MISMATCH →
  │        [clawbrowser] Fingerprint verification FAILED
  │        [clawbrowser] Mismatch: canvas, webgl_renderer
  │        Show error page in browser with details
  │        CDP not enabled
  │        Exit with error code 1
```

### Regenerate Flow

```
clawbrowser --fingerprint=fp_abc123 --regenerate
  │
  ├─ 1. Parse args
  ├─ 2. Load API key from env (CLAWBROWSER_API_KEY) or config.json
  ├─ 3. Load existing profile from disk
  │     → Read stored `request` parameters
  ├─ 4. POST /v1/fingerprints/generate with original request params
  │     → Overwrite fingerprint.json with new response
  │     → Browser state (cookies, history, storage) is preserved
  ├─ 5. libclaw::init(profile) with new fingerprint
  ├─ 6. Continue as normal launch (proxy setup → startup → verify)
```

### --list Output

Default mode:
```
fp_abc123    US/NYC/residential     2026-03-21
fp_def456    DE/Berlin/datacenter   2026-03-20
```

With `--output=json`:
```json
[
  {"profile_id":"fp_abc123","country":"US","city":"NYC","type":"residential","created_at":"2026-03-21T14:30:00Z"},
  {"profile_id":"fp_def456","country":"DE","city":"Berlin","type":"datacenter","created_at":"2026-03-20T10:00:00Z"}
]
```

### Error Scenarios

- No API key in env → `[clawbrowser] Error: CLAWBROWSER_API_KEY not set`
- Backend API unreachable (new profile) → `[clawbrowser] Error: cannot reach fingerprint API`
- Profile not found without --new → `[clawbrowser] Error: profile fp_abc123 not found, use --new to create`
- Proxy connection failed → `[clawbrowser] Error: proxy connection failed`
- Fingerprint verification failed → `[clawbrowser] Error: fingerprint verification failed` + details
- Out of credits → `[clawbrowser] Error: out of credits, please top up at clawbrowser.ai`

## Directory Structure

```
~/Library/Application Support/Clawbrowser/
├── config.json                          # global config (see below)
├── Browser/
│   ├── Default/
│   │   ├── fingerprint.json
│   │   ├── Bookmarks
│   │   ├── Cookies
│   │   ├── History
│   │   └── ...
│   ├── fp_abc123/
│   │   ├── fingerprint.json
│   │   ├── Bookmarks
│   │   ├── Cookies
│   │   └── ...
│   └── Local State
```

Each fingerprint ID maps to a browser profile directory. Fingerprint identity and browser state (cookies, sessions, local storage) are naturally coupled — essential for multi-accounting.

**config.json format:**

```json
{
  "api_key": "clawbrowser_xxxxx"
}
```

`CLAWBROWSER_API_KEY` env var takes precedence over `config.json` when both are set.

## Platform Support

- **MVP:** macOS only
- **Future:** Linux
- **Future:** Android
- **Deferred:** Windows

## AI Agent Integration

Standard CDP/DevTools Protocol, untouched. AI agents connect via existing tooling:

```python
# Playwright
browser = await playwright.chromium.connect_over_cdp("http://127.0.0.1:9222")

# Puppeteer
browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9222" })
```

All fingerprint spoofing and proxy routing is transparent to the automation consumer.

For the full AI agent integration guide, see [SKILL.md](../../SKILL.md).

## Technology Stack

| Component | Language |
|-----------|----------|
| Chromium patches | C++ |
| libclaw (fingerprint injection, profile/proxy management) | Rust (FFI) |
| clawbrowser binary | Chromium fork (C++ + Rust) |
| Backend fingerprint API | Go + Kubernetes |

## Known Gaps (Post-MVP)

- **TLS/JA3 fingerprinting:** Chromium's BoringSSL produces a recognizable TLS fingerprint (JA3/JA4 hash). Anti-bot systems can detect this at the network level. Mitigation (cipher suite shuffling, extension ordering randomization) is deferred to post-MVP.
- **`navigator.plugins` deprecation:** Chromium is deprecating the legacy plugins API. Included for completeness but may become a no-op in future Chromium versions.
- **Chromium upstream rebasing:** Strategy for keeping the fork up to date with upstream Chromium security releases is not defined. This is a maintenance concern, not a design concern.

## Testing Strategy

- **libclaw unit tests (Rust):** Test fingerprint injection logic, profile loading, proxy credential parsing, seed-based noise generation
- **Built-in fingerprint verification page (`clawbrowser://verify`):** Validates that all spoofed surfaces match the profile. Runs on every browser launch. This IS the integration test.
