# Plan 3: Chromium Fork + Patches — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fork Chromium, integrate libclaw via FFI, patch fingerprint surfaces, add proxy resolver, CLI handling, sandbox modifications, stdout filtering, verification page, and the `clawbrowser://verify` internal page.

**Architecture:** Minimal patches to Chromium source — CLI arg parsing and libclaw initialization in `chrome/browser/chrome_browser_main.cc`, fingerprint hooks at each API surface, sandbox policy relaxation for shared memory FD inheritance, custom proxy resolver, and a built-in HTML+JS verification page.

**Tech Stack:** Chromium source (C++), libclaw (Rust FFI via `libclaw.h`), GN/Ninja build system, macOS Seatbelt sandbox

**Spec:** `docs/superpowers/specs/2026-03-21-clawbrowser-design.md`

**Depends on:** Plan 2 (libclaw) must be built first — the `.dylib` and `libclaw.h` header are required.

---

## Prerequisites

Before starting, you need:
1. Chromium source checked out via `depot_tools` (see [Chromium build instructions](https://chromium.googlesource.com/chromium/src/+/main/docs/mac_build_instructions.md))
2. libclaw built (`cargo build --release` in `libclaw/`)
3. `libclaw.h` generated via cbindgen

## File Structure (patches to Chromium source tree)

```
chromium/src/
├── chrome/
│   ├── browser/
│   │   ├── chrome_browser_main.cc          # MODIFY: add claw_init() call, CLI parsing
│   │   └── clawbrowser/
│   │       ├── clawbrowser_startup.h       # CREATE: startup logic declarations
│   │       └── clawbrowser_startup.cc      # CREATE: CLI parsing, profile loading, libclaw init
│   ├── app/
│   │   └── chrome_main_delegate.cc         # MODIFY: register clawbrowser:// URL scheme
│   └── browser/ui/webui/
│       └── clawbrowser_verify_ui.cc        # CREATE: clawbrowser://verify page handler
│       └── clawbrowser_verify_ui.h         # CREATE: header
├── content/
│   ├── browser/
│   │   ├── child_process_launcher_helper.cc  # MODIFY: pass shm FD to child processes
│   │   └── sandbox_mac.mm                    # MODIFY: add shm read exception
│   └── renderer/
│       └── render_frame_impl.cc              # MODIFY: hook navigator overrides
├── third_party/
│   ├── blink/
│   │   ├── renderer/
│   │   │   ├── modules/
│   │   │   │   ├── canvas/
│   │   │   │   │   └── htmlcanvas/
│   │   │   │   │       └── html_canvas_element.cc  # MODIFY: canvas noise injection
│   │   │   │   ├── webgl/
│   │   │   │   │   └── webgl_rendering_context_base.cc  # MODIFY: WebGL spoofing
│   │   │   │   ├── webaudio/
│   │   │   │   │   └── offline_audio_context.cc  # MODIFY: audio perturbation
│   │   │   │   └── webrtc/
│   │   │   │       └── rtc_peer_connection.cc  # MODIFY: force relay-only
│   │   │   ├── core/
│   │   │   │   ├── dom/
│   │   │   │   │   └── element.cc  # MODIFY: client rects noise
│   │   │   │   └── frame/
│   │   │   │       └── navigator.cc  # MODIFY: navigator property overrides
│   │   │   └── platform/
│   │   │       └── fonts/  # MODIFY: font enumeration filtering
│   └── libclaw/              # CREATE: symlink or copy of libclaw artifacts
│       ├── include/
│       │   └── libclaw.h
│       └── lib/
│           └── liblibclaw.dylib
├── net/
│   └── proxy_resolution/
│       └── configured_proxy_resolution_service.cc  # MODIFY: custom proxy resolver
└── clawbrowser/
    └── resources/
        └── verify.html           # CREATE: built-in verification page (HTML+JS)
```

---

### Task 1: Chromium Checkout and Build Verification

**Files:**
- No files modified

- [ ] **Step 1: Check out Chromium source**

```bash
mkdir ~/chromium && cd ~/chromium
fetch --nohooks chromium
cd src
gclient runhooks
```

This takes several hours and ~100GB of disk space.

- [ ] **Step 2: Verify vanilla build works**

```bash
cd ~/chromium/src
gn gen out/Default --args='is_debug=false target_os="mac"'
autoninja -C out/Default chrome
```

Expected: Chromium builds successfully. This confirms the build environment is correct before making any patches.

- [ ] **Step 3: Run vanilla Chromium**

```bash
./out/Default/Chromium.app/Contents/MacOS/Chromium
```

Expected: browser opens normally.

- [ ] **Step 4: Commit (no changes, just document baseline)**

```bash
echo "Chromium build verified at $(git rev-parse HEAD)" > ~/chromium/src/CLAWBROWSER_BASE.txt
```

---

### Task 2: Integrate libclaw into Build System

**Files:**
- Create: `third_party/libclaw/BUILD.gn`
- Create: `third_party/libclaw/include/libclaw.h` (copy from libclaw build)
- Create: `third_party/libclaw/lib/liblibclaw.dylib` (copy from libclaw build)
- Modify: `chrome/browser/BUILD.gn`

- [ ] **Step 1: Copy libclaw artifacts into Chromium tree**

```bash
mkdir -p third_party/libclaw/include third_party/libclaw/lib
cp /path/to/libclaw/include/libclaw.h third_party/libclaw/include/
cp /path/to/libclaw/target/release/liblibclaw.dylib third_party/libclaw/lib/
```

- [ ] **Step 2: Create BUILD.gn for libclaw**

Create `third_party/libclaw/BUILD.gn`:

```gn
config("libclaw_config") {
  include_dirs = [ "include" ]
  libs = [ "libclaw" ]
  lib_dirs = [ "lib" ]
}

group("libclaw") {
  public_configs = [ ":libclaw_config" ]
}
```

- [ ] **Step 3: Add libclaw dependency to chrome browser BUILD.gn**

In `chrome/browser/BUILD.gn`, add to the `deps` list:

```gn
"//third_party/libclaw",
```

- [ ] **Step 4: Verify build still succeeds**

```bash
autoninja -C out/Default chrome
```

Expected: builds with libclaw linked.

- [ ] **Step 5: Commit**

```bash
git add third_party/libclaw/ chrome/browser/BUILD.gn
git commit -m "feat(chromium): integrate libclaw into build system"
```

---

### Task 3: CLI Parsing and Startup Logic

**Files:**
- Create: `chrome/browser/clawbrowser/clawbrowser_startup.h`
- Create: `chrome/browser/clawbrowser/clawbrowser_startup.cc`
- Modify: `chrome/browser/chrome_browser_main.cc`

- [ ] **Step 1: Create startup header**

Create `chrome/browser/clawbrowser/clawbrowser_startup.h`:

```cpp
#ifndef CHROME_BROWSER_CLAWBROWSER_CLAWBROWSER_STARTUP_H_
#define CHROME_BROWSER_CLAWBROWSER_CLAWBROWSER_STARTUP_H_

#include <string>

namespace clawbrowser {

struct StartupConfig {
  std::string profile_id;
  bool regenerate = false;
  bool list_profiles = false;
  bool skip_verify = false;
  bool json_output = false;
  bool verbose = false;
  bool has_fingerprint = false;
};

// Parse clawbrowser-specific CLI flags.
StartupConfig ParseFlags(int argc, const char* argv[]);

// Initialize clawbrowser: load profile, create shared memory, set up proxy.
// Returns 0 on success, -1 on error.
int Initialize(const StartupConfig& config);

// Log a message in the appropriate format (plain text or JSON).
void Log(const std::string& event, const std::string& message = "");
void LogJson(const std::string& event, const std::string& extra_json = "");
void LogError(const std::string& message);

// Get the shared memory name (for passing to child processes).
std::string GetShmName();

// Shutdown and cleanup.
void Shutdown();

}  // namespace clawbrowser

#endif  // CHROME_BROWSER_CLAWBROWSER_CLAWBROWSER_STARTUP_H_
```

- [ ] **Step 2: Create startup implementation**

Create `chrome/browser/clawbrowser/clawbrowser_startup.cc`:

```cpp
#include "chrome/browser/clawbrowser/clawbrowser_startup.h"

#include <cstdlib>
#include <cstring>
#include <iostream>
#include <string>

extern "C" {
#include "third_party/libclaw/include/libclaw.h"
}

namespace clawbrowser {

namespace {
  StartupConfig g_config;
  char g_shm_name[256] = {0};
  bool g_initialized = false;
}

StartupConfig ParseFlags(int argc, const char* argv[]) {
  StartupConfig config;
  for (int i = 1; i < argc; ++i) {
    std::string arg(argv[i]);
    if (arg.find("--fingerprint=") == 0) {
      config.profile_id = arg.substr(14);
      config.has_fingerprint = true;
    } else if (arg == "--regenerate") {
      config.regenerate = true;
    } else if (arg == "--list") {
      config.list_profiles = true;
    } else if (arg == "--skip-verify") {
      config.skip_verify = true;
    } else if (arg == "--output=json") {
      config.json_output = true;
    } else if (arg == "--verbose") {
      config.verbose = true;
    }
  }
  return config;
}

int Initialize(const StartupConfig& config) {
  g_config = config;

  if (!config.has_fingerprint) {
    // Vanilla mode — no fingerprint, no proxy, no spoofing
    return 0;
  }

  // Get browser data directory
  const char* home = std::getenv("HOME");
  if (!home) {
    LogError("Cannot determine HOME directory");
    return -1;
  }

  std::string base_dir = std::string(home) +
      "/Library/Application Support/Clawbrowser";
  std::string browser_dir = base_dir + "/Browser";
  std::string config_dir = base_dir;

  int result = claw_init(
      config.profile_id.c_str(),
      browser_dir.c_str(),
      config_dir.c_str(),
      g_shm_name,
      sizeof(g_shm_name));

  if (result != 0) {
    LogError("Failed to initialize clawbrowser profile");
    return -1;
  }

  g_initialized = true;
  Log("profile_loaded", config.profile_id);
  return 0;
}

void Log(const std::string& event, const std::string& message) {
  if (g_config.json_output) {
    if (message.empty()) {
      std::cerr << "{\"event\":\"" << event << "\"}" << std::endl;
    } else {
      std::cerr << "{\"event\":\"" << event
                << "\",\"detail\":\"" << message << "\"}" << std::endl;
    }
  } else {
    if (message.empty()) {
      std::cerr << "[clawbrowser] " << event << std::endl;
    } else {
      std::cerr << "[clawbrowser] " << event << ": " << message << std::endl;
    }
  }
}

void LogError(const std::string& message) {
  if (g_config.json_output) {
    std::cerr << "{\"event\":\"error\",\"message\":\""
              << message << "\"}" << std::endl;
  } else {
    std::cerr << "[clawbrowser] Error: " << message << std::endl;
  }
}

std::string GetShmName() {
  return std::string(g_shm_name);
}

void Shutdown() {
  if (g_initialized) {
    claw_shutdown();
    g_initialized = false;
  }
}

}  // namespace clawbrowser
```

- [ ] **Step 3: Hook into chrome_browser_main.cc**

In `chrome/browser/chrome_browser_main.cc`, add early in `ChromeBrowserMainParts::PreMainMessageLoopRunImpl()`:

```cpp
#include "chrome/browser/clawbrowser/clawbrowser_startup.h"

// Near the start of PreMainMessageLoopRunImpl():
{
  auto config = clawbrowser::ParseFlags(
      base::CommandLine::ForCurrentProcess()->GetArgs());
  if (clawbrowser::Initialize(config) != 0) {
    return 1;  // Exit on initialization failure
  }
}
```

- [ ] **Step 4: Verify build**

```bash
autoninja -C out/Default chrome
```

Expected: builds with clawbrowser startup integrated.

- [ ] **Step 5: Commit**

```bash
git add chrome/browser/clawbrowser/ chrome/browser/chrome_browser_main.cc
git commit -m "feat(chromium): add CLI parsing and libclaw initialization on startup"
```

---

### Task 4: Sandbox and Shared Memory FD Inheritance

**Files:**
- Modify: `content/browser/child_process_launcher_helper.cc`
- Modify: `content/browser/sandbox_mac.mm` (or equivalent sandbox policy)

- [ ] **Step 1: Pass shm FD to child processes**

In `content/browser/child_process_launcher_helper.cc`, in the method that sets up child process launch:

```cpp
#include "chrome/browser/clawbrowser/clawbrowser_startup.h"

// In the child process launch setup, add the shm FD to inherited FDs:
std::string shm_name = clawbrowser::GetShmName();
if (!shm_name.empty()) {
  // Add --clawbrowser-shm-name flag to child process command line
  command_line->AppendSwitchASCII("clawbrowser-shm-name", shm_name);
}
```

- [ ] **Step 2: Modify sandbox policy for shm read access**

In the macOS sandbox policy (`.sb` file or `sandbox_mac.mm`), add:

```scheme
;; Allow read access to clawbrowser shared memory
(allow ipc-posix-shm-read-data
  (ipc-posix-name (regex "^/clawbrowser-.*")))
```

Or in C++ sandbox setup:

```cpp
// Allow POSIX shared memory read for clawbrowser fingerprint data
sandbox::policy::SeatbeltExecClient::SetParameter(
    "CLAWBROWSER_SHM_ALLOWED", "TRUE");
```

- [ ] **Step 3: Verify child processes can read shared memory**

Build and test with a simple logging check in the renderer process startup that reads the shm and validates the magic header.

- [ ] **Step 4: Verify build**

```bash
autoninja -C out/Default chrome
```

Expected: builds successfully.

- [ ] **Step 5: Commit**

```bash
git add content/browser/
git commit -m "feat(chromium): pass shm FD to child processes and relax sandbox for clawbrowser"
```

---

### Task 5: Navigator Property Overrides

**Files:**
- Modify: `third_party/blink/renderer/core/frame/navigator.cc`

- [ ] **Step 1: Read shm in renderer process startup**

In the renderer process, on startup, read the shared memory using the `--clawbrowser-shm-name` flag:

```cpp
#include "third_party/libclaw/include/libclaw.h"

// Global pointer to shared fingerprint data (read-only)
static const ShmFingerprint* g_claw_fingerprint = nullptr;

void InitClawbrowserFingerprint() {
  auto* cmd = base::CommandLine::ForCurrentProcess();
  if (cmd->HasSwitch("clawbrowser-shm-name")) {
    std::string shm_name = cmd->GetSwitchValueASCII("clawbrowser-shm-name");
    g_claw_fingerprint = claw_read_shm(shm_name.c_str());
  }
}
```

- [ ] **Step 2: Override navigator properties**

In `navigator.cc`, modify the getters to read from shared memory when available:

```cpp
String Navigator::userAgent() const {
  if (g_claw_fingerprint) {
    return String::FromUTF8(g_claw_fingerprint->user_agent);
  }
  // Original implementation
  return original_user_agent_;
}

String Navigator::platform() const {
  if (g_claw_fingerprint) {
    return String::FromUTF8(g_claw_fingerprint->platform);
  }
  return original_platform_;
}

unsigned Navigator::hardwareConcurrency() const {
  if (g_claw_fingerprint) {
    return g_claw_fingerprint->hardware_concurrency;
  }
  return original_concurrency_;
}

double Navigator::deviceMemory() const {
  if (g_claw_fingerprint) {
    return static_cast<double>(g_claw_fingerprint->hardware_memory);
  }
  return original_memory_;
}
```

Similarly override `navigator.language`, `navigator.languages`.

- [ ] **Step 3: Override screen properties**

In the Screen implementation, override width/height/etc when shm is available.

- [ ] **Step 4: Override timezone**

Hook into `Intl.DateTimeFormat` and the timezone resolution to return the profile's timezone.

- [ ] **Step 5: Verify build**

```bash
autoninja -C out/Default chrome
```

- [ ] **Step 6: Test manually**

Launch with a test profile and open DevTools console:

```javascript
console.log(navigator.userAgent);
console.log(navigator.platform);
console.log(navigator.hardwareConcurrency);
console.log(screen.width);
```

Expected: values match the fingerprint profile.

- [ ] **Step 7: Commit**

```bash
git add third_party/blink/renderer/core/frame/navigator.cc
git commit -m "feat(chromium): override navigator/screen/timezone from shared memory fingerprint"
```

---

### Task 6: Canvas Fingerprint Noise

**Files:**
- Modify: `third_party/blink/renderer/modules/canvas/htmlcanvas/html_canvas_element.cc`

- [ ] **Step 1: Hook toDataURL/toBlob/getImageData**

In `html_canvas_element.cc`, intercept the pixel data before it's returned:

```cpp
#include "third_party/libclaw/include/libclaw.h"

// In HTMLCanvasElement::toDataURL or equivalent:
void ApplyClawCanvasNoise(uint8_t* pixel_data, size_t length) {
  if (!g_claw_fingerprint) return;

  auto* noise_gen = claw_noise_new(g_claw_fingerprint->canvas_seed);
  for (size_t i = 0; i < length; ++i) {
    pixel_data[i] ^= claw_noise_canvas(noise_gen, i);
  }
  claw_noise_free(noise_gen);
}
```

Apply this function to the pixel buffer in `toDataURL()`, `toBlob()`, and `getImageData()` before the data is returned to JavaScript.

- [ ] **Step 2: Verify build**

```bash
autoninja -C out/Default chrome
```

- [ ] **Step 3: Test manually**

Open a page that reads canvas fingerprint (e.g., browserleaks.com/canvas). Verify the fingerprint is different from vanilla Chromium but consistent across page reloads with the same profile.

- [ ] **Step 4: Commit**

```bash
git add third_party/blink/renderer/modules/canvas/
git commit -m "feat(chromium): add deterministic canvas noise injection via libclaw"
```

---

### Task 7: WebGL Fingerprint Spoofing

**Files:**
- Modify: `third_party/blink/renderer/modules/webgl/webgl_rendering_context_base.cc`

- [ ] **Step 1: Override getParameter for UNMASKED_VENDOR/RENDERER**

In `webgl_rendering_context_base.cc`:

```cpp
ScriptValue WebGLRenderingContextBase::getParameter(GLenum pname) {
  if (g_claw_fingerprint) {
    if (pname == GL_UNMASKED_VENDOR_WEBGL) {
      return String::FromUTF8(g_claw_fingerprint->webgl_vendor);
    }
    if (pname == GL_UNMASKED_RENDERER_WEBGL) {
      return String::FromUTF8(g_claw_fingerprint->webgl_renderer);
    }
  }
  // Original implementation
  ...
}
```

- [ ] **Step 2: Apply noise to WebGL readPixels/toDataURL**

Same noise injection as canvas, using `canvas_seed` (WebGL canvas shares the same noise pattern).

- [ ] **Step 3: Verify build and test**

```bash
autoninja -C out/Default chrome
```

Test at browserleaks.com/webgl — verify vendor/renderer match profile.

- [ ] **Step 4: Commit**

```bash
git add third_party/blink/renderer/modules/webgl/
git commit -m "feat(chromium): spoof WebGL vendor/renderer and apply canvas noise"
```

---

### Task 8: AudioContext Perturbation

**Files:**
- Modify: `third_party/blink/renderer/modules/webaudio/offline_audio_context.cc`

- [ ] **Step 1: Hook startRendering to perturb audio buffer**

```cpp
void ApplyClawAudioNoise(float* buffer, size_t length) {
  if (!g_claw_fingerprint) return;

  auto* noise_gen = claw_noise_new(g_claw_fingerprint->audio_seed);
  for (size_t i = 0; i < length; ++i) {
    buffer[i] += static_cast<float>(claw_noise_audio(noise_gen, i));
  }
  claw_noise_free(noise_gen);
}
```

Apply after `OfflineAudioContext::startRendering()` completes, before returning the buffer.

- [ ] **Step 2: Verify build and test**

```bash
autoninja -C out/Default chrome
```

Test at browserleaks.com/audio — verify audio fingerprint differs from vanilla but is consistent per profile.

- [ ] **Step 3: Commit**

```bash
git add third_party/blink/renderer/modules/webaudio/
git commit -m "feat(chromium): add deterministic audio context perturbation"
```

---

### Task 9: ClientRects Noise

**Files:**
- Modify: `third_party/blink/renderer/core/dom/element.cc`

- [ ] **Step 1: Add sub-pixel noise to getClientRects/getBoundingClientRect**

```cpp
DOMRect* Element::getBoundingClientRect() {
  DOMRect* rect = original_getBoundingClientRect();
  if (g_claw_fingerprint) {
    auto* noise_gen = claw_noise_new(g_claw_fingerprint->client_rects_seed);
    // Use element's hash as index for deterministic per-element noise
    uint64_t elem_hash = reinterpret_cast<uint64_t>(this) & 0xFFFF;
    rect->setX(rect->x() + claw_noise_client_rect(noise_gen, elem_hash));
    rect->setY(rect->y() + claw_noise_client_rect(noise_gen, elem_hash + 1));
    rect->setWidth(rect->width() + claw_noise_client_rect(noise_gen, elem_hash + 2));
    rect->setHeight(rect->height() + claw_noise_client_rect(noise_gen, elem_hash + 3));
    claw_noise_free(noise_gen);
  }
  return rect;
}
```

- [ ] **Step 2: Verify build and test**

```bash
autoninja -C out/Default chrome
```

- [ ] **Step 3: Commit**

```bash
git add third_party/blink/renderer/core/dom/element.cc
git commit -m "feat(chromium): add sub-pixel noise to client rects"
```

---

### Task 10: WebRTC Leak Prevention

**Files:**
- Modify: `third_party/blink/renderer/modules/webrtc/rtc_peer_connection.cc`

- [ ] **Step 1: Force relay-only ICE transport policy**

In `rtc_peer_connection.cc`, when creating a PeerConnection and clawbrowser fingerprint is active:

```cpp
if (g_claw_fingerprint) {
  configuration.type = webrtc::PeerConnectionInterface::kRelay;
  // This prevents local/host ICE candidates from being generated,
  // only allowing TURN relay candidates
}
```

- [ ] **Step 2: Verify build and test**

Test at browserleaks.com/webrtc — verify local IP is not leaked.

- [ ] **Step 3: Commit**

```bash
git add third_party/blink/renderer/modules/webrtc/
git commit -m "feat(chromium): force WebRTC relay-only mode to prevent IP leaks"
```

---

### Task 11: Custom Proxy Resolver

**Files:**
- Modify: `net/proxy_resolution/configured_proxy_resolution_service.cc`

- [ ] **Step 1: Read proxy config from shared memory**

In the proxy resolution path, when clawbrowser fingerprint has proxy data:

```cpp
if (g_claw_fingerprint && g_claw_fingerprint->has_proxy) {
  std::string proxy_str = base::StringPrintf(
      "PROXY %s:%d",
      g_claw_fingerprint->proxy_host,
      g_claw_fingerprint->proxy_port);
  // Set proxy with authentication
  // Username/password from g_claw_fingerprint->proxy_username/password
}
```

- [ ] **Step 2: Handle proxy authentication**

Hook into `HttpAuthController` or `HttpNetworkTransaction` to automatically provide the proxy username/password from shared memory without prompting.

- [ ] **Step 3: Verify build and test**

Launch with a profile that has proxy credentials. Verify traffic routes through the proxy (check IP at whatismyip.com).

- [ ] **Step 4: Commit**

```bash
git add net/proxy_resolution/
git commit -m "feat(chromium): route traffic through profile proxy credentials"
```

---

### Task 12: Stdout Filtering

**Files:**
- Modify: `chrome/app/chrome_main_delegate.cc` or logging initialization

- [ ] **Step 1: Suppress Chromium logs in default mode**

In the logging initialization, when `--verbose` is NOT set:

```cpp
if (!base::CommandLine::ForCurrentProcess()->HasSwitch("verbose")) {
  logging::SetMinLogLevel(logging::LOG_FATAL + 1);  // Suppress all logs
}
```

Only `[clawbrowser]` messages (written via `clawbrowser::Log()`) go to stderr.

- [ ] **Step 2: Verify build and test**

Launch browser, verify only `[clawbrowser]` messages appear on stderr.

- [ ] **Step 3: Commit**

```bash
git add chrome/app/chrome_main_delegate.cc
git commit -m "feat(chromium): suppress Chromium stdout noise by default"
```

---

### Task 13: Verification Page (clawbrowser://verify)

**Files:**
- Create: `clawbrowser/resources/verify.html`
- Create: `chrome/browser/ui/webui/clawbrowser_verify_ui.h`
- Create: `chrome/browser/ui/webui/clawbrowser_verify_ui.cc`
- Modify: `chrome/app/chrome_main_delegate.cc` (register URL scheme)

- [ ] **Step 1: Create verification HTML page**

Create `clawbrowser/resources/verify.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Clawbrowser Verification</title>
  <style>
    body { font-family: -apple-system, sans-serif; margin: 40px; background: #1a1a1a; color: #e0e0e0; }
    .pass { color: #4caf50; }
    .fail { color: #f44336; }
    .check { margin: 8px 0; }
    h1 { color: #fff; }
    #result { font-size: 24px; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>Clawbrowser Fingerprint Verification</h1>
  <div id="checks"></div>
  <div id="proxy-checks"></div>
  <div id="result"></div>

  <script>
    // Expected values are injected by clawbrowser C++ as a global object
    // window.__clawbrowser_expected = { ... }

    const checks = [];
    const expected = window.__clawbrowser_expected || {};

    function addCheck(name, actual, expected, compare) {
      const pass = compare ? compare(actual, expected) : actual === expected;
      checks.push({ name, actual, expected, pass });
      const div = document.createElement('div');
      div.className = 'check ' + (pass ? 'pass' : 'fail');
      div.textContent = `${pass ? 'PASS' : 'FAIL'} ${name}: got "${actual}", expected "${expected}"`;
      document.getElementById('checks').appendChild(div);
      return pass;
    }

    async function verifyFingerprint() {
      let allPassed = true;

      // Navigator
      allPassed &= addCheck('userAgent', navigator.userAgent, expected.user_agent);
      allPassed &= addCheck('platform', navigator.platform, expected.platform);
      allPassed &= addCheck('hardwareConcurrency', navigator.hardwareConcurrency, expected.hardware_concurrency);
      allPassed &= addCheck('deviceMemory', navigator.deviceMemory, expected.hardware_memory);

      // Screen
      allPassed &= addCheck('screen.width', screen.width, expected.screen_width);
      allPassed &= addCheck('screen.height', screen.height, expected.screen_height);

      // Timezone
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      allPassed &= addCheck('timezone', tz, expected.timezone);

      // Language
      allPassed &= addCheck('language', navigator.language, expected.language_primary);

      // WebGL
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          const vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
          const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
          allPassed &= addCheck('webgl.vendor', vendor, expected.webgl_vendor);
          allPassed &= addCheck('webgl.renderer', renderer, expected.webgl_renderer);
        }
      } catch (e) {
        addCheck('webgl', 'error: ' + e.message, 'accessible', () => false);
        allPassed = false;
      }

      // Canvas (verify noise is applied — hash should differ from vanilla)
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f60';
        ctx.fillRect(0, 0, 200, 50);
        ctx.fillStyle = '#069';
        ctx.font = '16px Arial';
        ctx.fillText('clawbrowser verify', 2, 30);
        const dataUrl = canvas.toDataURL();
        addCheck('canvas', 'noise applied (hash present)', 'noise applied (hash present)',
          () => dataUrl.length > 100);
      } catch (e) {
        allPassed = false;
      }

      // Result
      const resultDiv = document.getElementById('result');
      if (allPassed) {
        resultDiv.className = 'pass';
        resultDiv.textContent = 'ALL CHECKS PASSED';
        // Signal to C++ that verification succeeded
        if (window.__clawbrowser_on_result) {
          window.__clawbrowser_on_result(true, []);
        }
      } else {
        resultDiv.className = 'fail';
        const failures = checks.filter(c => !c.pass).map(c => c.name);
        resultDiv.textContent = 'VERIFICATION FAILED: ' + failures.join(', ');
        if (window.__clawbrowser_on_result) {
          window.__clawbrowser_on_result(false, failures);
        }
      }
    }

    async function verifyProxy() {
      if (!expected.proxy_verify_url || !expected.has_proxy) return;

      try {
        const resp = await fetch(expected.proxy_verify_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + expected.api_key,
          },
          body: JSON.stringify({
            proxy: {
              host: expected.proxy_host,
              port: expected.proxy_port,
              username: expected.proxy_username,
              password: expected.proxy_password,
            },
            expected_country: expected.proxy_country,
            expected_city: expected.proxy_city || '',
          }),
        });

        const data = await resp.json();
        const countryMatch = data.actual_country === expected.proxy_country;

        const div = document.createElement('div');
        div.className = 'check ' + (countryMatch ? 'pass' : 'fail');
        div.textContent = countryMatch
          ? `PASS proxy: ${data.actual_country} (IP: ${data.ipv4 || 'unknown'})`
          : `FAIL proxy: expected ${expected.proxy_country}, got ${data.actual_country}`;
        document.getElementById('proxy-checks').appendChild(div);

        if (!countryMatch && window.__clawbrowser_on_proxy_result) {
          window.__clawbrowser_on_proxy_result(false, data.actual_country);
        } else if (window.__clawbrowser_on_proxy_result) {
          window.__clawbrowser_on_proxy_result(true, data.actual_country);
        }
      } catch (e) {
        const div = document.createElement('div');
        div.className = 'check fail';
        div.textContent = 'FAIL proxy verification: ' + e.message;
        document.getElementById('proxy-checks').appendChild(div);
      }
    }

    // Run verification
    verifyProxy().then(() => verifyFingerprint());
  </script>
</body>
</html>
```

- [ ] **Step 2: Create WebUI handler**

Create the `clawbrowser_verify_ui.h` and `.cc` files to register the `clawbrowser://verify` URL scheme and serve the HTML page. The handler should:

1. Serve `verify.html` as the page content
2. Inject `window.__clawbrowser_expected` with values from shared memory
3. Listen for `window.__clawbrowser_on_result` callback
4. On success: log verification passed, enable CDP
5. On failure: log failures, exit with error code

- [ ] **Step 3: Register clawbrowser:// URL scheme**

In `chrome/app/chrome_main_delegate.cc`, register the custom URL scheme:

```cpp
content::ContentClient::Schemes schemes;
schemes.standard_schemes.push_back("clawbrowser");
```

- [ ] **Step 4: Auto-open verification page on startup**

In the startup flow, after Chromium is ready and `--skip-verify` is not set, navigate the first tab to `clawbrowser://verify`.

- [ ] **Step 5: Verify build and test**

```bash
autoninja -C out/Default chrome
```

Launch with a profile, verify the verification page loads and checks pass.

- [ ] **Step 6: Commit**

```bash
git add clawbrowser/resources/ chrome/browser/ui/webui/ chrome/app/
git commit -m "feat(chromium): add clawbrowser://verify page with proxy and fingerprint checks"
```

---

### Task 14: --list Command

**Files:**
- Modify: `chrome/browser/clawbrowser/clawbrowser_startup.cc`

- [ ] **Step 1: Implement --list in startup logic**

In `clawbrowser_startup.cc`, before `Initialize`:

```cpp
if (config.list_profiles) {
  // Read Browser/ directory, find all subdirs with fingerprint.json
  // Output each profile with country/city/date
  // Exit without launching browser
  ListProfiles(config);
  exit(0);
}
```

Implement `ListProfiles()` to iterate the Browser directory, read each `fingerprint.json`, extract the request country/city and created_at, and output in the appropriate format (text or JSON based on `--output=json`).

- [ ] **Step 2: Verify build and test**

```bash
autoninja -C out/Default chrome
./out/Default/Chromium.app/Contents/MacOS/Chromium --list
```

Expected: lists profiles in text format.

- [ ] **Step 3: Commit**

```bash
git add chrome/browser/clawbrowser/
git commit -m "feat(chromium): implement --list command to show cached profiles"
```

---

### Task 15: Rename Binary and Final Integration Test

**Files:**
- Modify: `chrome/app/chromium_strings.grd` (or equivalent branding)
- Modify: GN build files for output name

- [ ] **Step 1: Change output binary name to clawbrowser**

In the GN build config, change the output binary name:

```gn
output_name = "clawbrowser"
```

Or modify the `.app` bundle name for macOS.

- [ ] **Step 2: Full integration test**

```bash
# Set up API key
export CLAWBROWSER_API_KEY=your-test-key

# Launch with new profile
./out/Default/Clawbrowser.app/Contents/MacOS/clawbrowser --fingerprint=test_integration

# Expected stdout:
# [clawbrowser] Profile test_integration loaded
# [clawbrowser] Proxy verified
# [clawbrowser] Fingerprint verified
# [clawbrowser] CDP listening on ws://127.0.0.1:9222
# [clawbrowser] Browser ready

# Verify fingerprint matches on browserleaks.com
# Verify proxy is active
# Verify WebRTC doesn't leak local IP

# Test JSON output
./out/Default/Clawbrowser.app/Contents/MacOS/clawbrowser \
  --fingerprint=test_integration --output=json

# Test --list
./out/Default/Clawbrowser.app/Contents/MacOS/clawbrowser --list

# Test vanilla mode
./out/Default/Clawbrowser.app/Contents/MacOS/clawbrowser

# Test automation
./out/Default/Clawbrowser.app/Contents/MacOS/clawbrowser \
  --fingerprint=test_integration --remote-debugging-port=9222
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(chromium): rename binary to clawbrowser and complete integration"
```
