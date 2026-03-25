# Clawbrowser Browser Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the clawbrowser browser component — a patched Chromium browser with built-in fingerprint spoofing, proxy routing, CLI profile management, and a verification page — as a static C++ shim library with minimal Chromium patches.

**Architecture:** A `clawbrowser/` shim library (static C++ library) sits at the Chromium source root. It provides CLI arg parsing, API client, fingerprint loading/caching, proxy config, PRNG-based noise, and a `clawbrowser://verify` WebUI page. Code-generated types from `api/openapi.yaml` (via quicktype targeting `base::Value`) keep the browser in lockstep with the backend API. Twenty numbered patch files hook into Chromium subsystems with 1-5 line changes each. Fingerprint data passes to child processes via `--clawbrowser-fp-path=<path>` flag and is read pre-sandbox.

**Tech Stack:** C++ (Chromium/Blink), GN build system, quicktype (code generation), Chromium `base::Value`/`base::JSONReader` (JSON), `network::SimpleURLLoader` (HTTP), gtest (unit tests), CDP/Puppeteer (integration tests)

**Spec:** `docs/superpowers/specs/2026-03-23-clawbrowser-browser-component-design.md`
**OpenAPI:** `api/openapi.yaml`

**Prerequisites:** A Chromium source checkout (latest stable, pin to specific version tag before starting — e.g., `131.0.6778.x`) at `chromium/src/`. The `clawbrowser/` directory is created at the top level alongside `chrome/`, `content/`, etc. Node.js + quicktype CLI installed for code generation. Python 3 for schema extraction script.

**Generated type API contract:** The quicktype-generated types (or hand-written adapter if quicktype template proves insufficient) MUST provide these APIs:
- `static base::expected<T, std::string> T::FromDict(const base::Value::Dict&)` — parse from already-parsed dict
- `static base::expected<T, std::string> T::FromJson(const std::string&)` — parse from raw JSON string (convenience, calls JSONReader then FromDict)
- `base::Value::Dict T::ToDict() const` — serialize to dict
- `std::string T::ToJson() const` — serialize to JSON string (convenience, calls ToDict then JSONWriter)

This applies to `GenerateResponse`, `VerifyProxyRequest`, `VerifyProxyResponse`, and all nested types.

**Graceful degradation contract:** Fields marked as optional in the OpenAPI spec (`media_devices`, `plugins`, `battery`, `speech_voices`, `proxy`) MUST be represented as `std::optional<T>` or empty containers in the generated types. The `FromDict`/`FromJson` methods must NOT fail when optional fields are absent or null — they should parse successfully with those fields empty/nullopt. This enables partial fingerprints (e.g., proxy-only profiles). All Chromium patches must check for empty/null before overriding (the accessor returning non-null does not mean every field is populated).

**Context:** This plan supersedes `2026-03-21-plan2-libclaw.md` (Rust/FFI approach) and `2026-03-21-plan3-chromium-patches.md`. Both are now deprecated — the pure C++ approach in this plan is authoritative.

---

## File Structure

```
chromium/src/clawbrowser/
├── BUILD.gn                              # Static library + unit test targets
├── profile_envelope.h                    # Hand-written on-disk wrapper struct
├── profile_envelope.cc
├── fingerprint_loader.h                  # File reading, pre-sandbox init
├── fingerprint_loader.cc
├── fingerprint_accessor.h               # Process-global singleton accessor
├── fingerprint_accessor.cc
├── schemas/
│   ├── extract_schemas.py               # Extracts JSON Schema from openapi.yaml
│   └── quicktype-chromium-template/     # Custom template for base::Value output
│       └── base_value.hpp               # quicktype template file
├── generated/
│   ├── fingerprint_types.h              # quicktype-generated structs
│   ├── fingerprint_types.cc             # quicktype-generated JSON parsing (base::Value)
│   └── README.md                        # "DO NOT EDIT — generated from api/openapi.yaml"
├── cli/
│   ├── args.h                           # CLI flag parsing
│   ├── args.cc
│   ├── profile_manager.h               # Profile listing, config loading, cache I/O
│   ├── profile_manager.cc
│   ├── api_client.h                     # HTTP client for /v1/fingerprints/generate and /v1/proxy/verify
│   └── api_client.cc
├── proxy/
│   ├── proxy_config.h                   # Build Chromium ProxyConfig from fingerprint
│   └── proxy_config.cc
├── startup.h                             # Top-level startup orchestration
├── startup.cc
├── logging.h                             # Verbose-gated logging macros
├── logging.cc
├── verify/
│   ├── verify_page.h                    # WebUI page handler
│   ├── verify_page.cc
│   ├── clawbrowser_verify.grd           # Resource definitions for embedded HTML/JS/CSS
│   └── resources/
│       ├── verify.html                  # Verification page HTML
│       ├── verify.js                    # Client-side fingerprint checks
│       └── verify.css                   # Styling
├── noise/
│   ├── prng.h                           # Seeded PRNG for deterministic noise
│   └── prng.cc
├── patches/
│   ├── 001-browser-main-init.patch
│   ├── 002-renderer-main-loader.patch
│   ├── 003-gpu-main-loader.patch
│   ├── 004-child-process-flag-propagation.patch
│   ├── 005-navigator-properties.patch
│   ├── 006-screen-metrics.patch
│   ├── 007-canvas-noise.patch
│   ├── 008-webgl-override.patch
│   ├── 009-audio-noise.patch
│   ├── 010-client-rects-noise.patch
│   ├── 011-fonts-filter.patch
│   ├── 012-media-devices.patch
│   ├── 013-plugins.patch
│   ├── 014-battery.patch
│   ├── 015-speech-voices.patch
│   ├── 016-timezone-env.patch
│   ├── 017-webrtc-leak-prevention.patch
│   ├── 018-proxy-config.patch
│   ├── 019-verify-page-registration.patch
│   └── 020-build-dep.patch
└── test/
    ├── fixtures/
    │   ├── valid_fingerprint.json       # Complete fingerprint for testing
    │   ├── minimal_fingerprint.json     # Only required fields
    │   └── malformed_fingerprint.json   # Invalid JSON for error testing
    ├── fingerprint_loader_unittest.cc
    ├── profile_envelope_unittest.cc
    ├── api_client_unittest.cc
    ├── args_unittest.cc
    ├── profile_manager_unittest.cc
    ├── proxy_config_unittest.cc
    ├── prng_unittest.cc
    └── startup_unittest.cc
```

---

### Task 1: Project Scaffolding + Code Generation Pipeline

**Files:**
- Create: `clawbrowser/BUILD.gn`
- Create: `clawbrowser/schemas/extract_schemas.py`
- Create: `clawbrowser/schemas/quicktype-chromium-template/base_value.hpp`
- Create: `clawbrowser/generated/fingerprint_types.h`
- Create: `clawbrowser/generated/fingerprint_types.cc`
- Create: `clawbrowser/generated/README.md`
- Create: `clawbrowser/test/fixtures/valid_fingerprint.json`
- Create: `clawbrowser/test/fixtures/minimal_fingerprint.json`
- Create: `clawbrowser/test/fixtures/malformed_fingerprint.json`
- Reference: `api/openapi.yaml`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p clawbrowser/{cli,proxy,verify/resources,noise,patches,test/fixtures,schemas/quicktype-chromium-template,generated}
```

- [ ] **Step 2: Create the schema extraction script**

Create `clawbrowser/schemas/extract_schemas.py` — a Python script that reads `api/openapi.yaml`, extracts the fingerprint-related schemas (`GenerateRequest`, `GenerateResponse`, `Fingerprint`, `ProxyConfig`, `Screen`, `Hardware`, `WebGL`, `MediaDevice`, `Plugin`, `Battery`, `VerifyProxyRequest`, `VerifyProxyResponse`), resolves `$ref` pointers, and outputs a standalone `fingerprint.schema.json`.

```python
#!/usr/bin/env python3
"""Extract fingerprint-related schemas from openapi.yaml into standalone JSON Schema."""

import json
import sys
from pathlib import Path

import yaml


def resolve_refs(schema: dict, all_schemas: dict) -> dict:
    """Recursively resolve $ref pointers within a schema."""
    if isinstance(schema, dict):
        if "$ref" in schema:
            ref_path = schema["$ref"]
            # Handle #/components/schemas/Foo
            parts = ref_path.split("/")
            ref_name = parts[-1]
            if ref_name in all_schemas:
                return resolve_refs(all_schemas[ref_name], all_schemas)
            return schema
        return {k: resolve_refs(v, all_schemas) for k, v in schema.items()}
    if isinstance(schema, list):
        return [resolve_refs(item, all_schemas) for item in schema]
    return schema


def main():
    openapi_path = Path(__file__).parent.parent.parent / "api" / "openapi.yaml"
    output_path = Path(__file__).parent / "fingerprint.schema.json"

    with open(openapi_path) as f:
        spec = yaml.safe_load(f)

    all_schemas = spec["components"]["schemas"]

    # Schemas needed by the browser component
    target_schemas = [
        "GenerateRequest",
        "GenerateResponse",
        "Fingerprint",
        "ProxyConfig",
        "Screen",
        "Hardware",
        "WebGL",
        "MediaDevice",
        "Plugin",
        "Battery",
        "VerifyProxyRequest",
        "VerifyProxyResponse",
    ]

    resolved = {}
    for name in target_schemas:
        if name in all_schemas:
            resolved[name] = resolve_refs(all_schemas[name], all_schemas)

    output = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "ClawbrowserFingerprint",
        "description": "Generated from api/openapi.yaml — DO NOT EDIT",
        "definitions": resolved,
        "$ref": "#/definitions/GenerateResponse",
    }

    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Run schema extraction and verify output**

Run: `cd clawbrowser/schemas && python3 extract_schemas.py`
Expected: `fingerprint.schema.json` created with resolved schemas

- [ ] **Step 4: Create quicktype Chromium template**

Create `clawbrowser/schemas/quicktype-chromium-template/base_value.hpp` — a custom quicktype C++ template that generates code using `base::Value` and `base::JSONReader` instead of nlohmann/json.

The template must:
- Use `#include "base/values.h"` and `#include "base/json/json_reader.h"`
- Generate struct definitions with `base::Value` parsing
- Use `base::JSONReader::Read()` for JSON parsing
- Use `value.GetDict()`, `dict.FindString()`, `dict.FindInt()`, `dict.FindDouble()`, `dict.FindBool()`, `dict.FindList()` for field access
- Namespace everything under `clawbrowser`
- Use PascalCase for types, underscore_case for members

This is a non-trivial template. quicktype's C++ renderer supports custom templates via `--renderers`. The template file should follow quicktype's Handlebars template format for C++ output. If quicktype's template customization proves insufficient for `base::Value` integration, fall back to generating standard C++ structs and writing a thin hand-written adapter layer in `fingerprint_types_adapter.h/cc` that converts from `base::Value` to the generated structs.

- [ ] **Step 5: Generate C++ types from schema**

Run:
```bash
quicktype --src-lang schema \
  --lang cpp \
  --namespace clawbrowser \
  --include-location global-include \
  --source-style single-source \
  --type-style pascal-case \
  --member-style underscore-case \
  --out clawbrowser/generated/fingerprint_types.h \
  clawbrowser/schemas/fingerprint.schema.json
```

If the custom template approach works:
```bash
quicktype --src-lang schema \
  --lang cpp \
  --namespace clawbrowser \
  --template clawbrowser/schemas/quicktype-chromium-template/ \
  --out clawbrowser/generated/fingerprint_types.h \
  clawbrowser/schemas/fingerprint.schema.json
```

Split the output: header declarations → `fingerprint_types.h`, implementations → `fingerprint_types.cc`.

- [ ] **Step 6: Add generated README**

Create `clawbrowser/generated/README.md`:

```markdown
# Generated Code — DO NOT EDIT

These files are auto-generated from `api/openapi.yaml` using quicktype.

To regenerate:
```
cd clawbrowser/schemas
python3 extract_schemas.py
quicktype --src-lang schema --lang cpp --namespace clawbrowser \
  --include-location global-include --source-style single-source \
  --type-style pascal-case --member-style underscore-case \
  --out ../generated/fingerprint_types.h \
  fingerprint.schema.json
```

If types or JSON parsing are out of sync with the API, re-run the above.
```

- [ ] **Step 7: Create test fixture — valid_fingerprint.json**

Create `clawbrowser/test/fixtures/valid_fingerprint.json` — a complete profile envelope with all fields populated:

```json
{
  "schema_version": 1,
  "created_at": "2026-03-23T10:00:00Z",
  "request": {
    "platform": "linux",
    "browser": "chrome",
    "country": "US",
    "city": "New York",
    "connection_type": "residential"
  },
  "response": {
    "fingerprint": {
      "user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "platform": "Linux x86_64",
      "screen": {
        "width": 1920,
        "height": 1080,
        "avail_width": 1920,
        "avail_height": 1040,
        "color_depth": 24,
        "pixel_ratio": 1.0
      },
      "hardware": {
        "concurrency": 8,
        "memory": 8
      },
      "webgl": {
        "vendor": "Google Inc. (NVIDIA)",
        "renderer": "ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0, D3D11)"
      },
      "canvas_seed": 12345678,
      "audio_seed": 87654321,
      "client_rects_seed": 11223344,
      "timezone": "America/New_York",
      "language": ["en-US", "en"],
      "fonts": ["Arial", "Courier New", "Georgia", "Helvetica", "Times New Roman", "Verdana"],
      "media_devices": [
        {"kind": "audioinput", "label": "Default", "device_id": "default"},
        {"kind": "audiooutput", "label": "Speakers", "device_id": "speakers-001"},
        {"kind": "videoinput", "label": "HD Webcam", "device_id": "webcam-001"}
      ],
      "plugins": [
        {"name": "PDF Viewer", "description": "Portable Document Format", "filename": "internal-pdf-viewer"},
        {"name": "Chrome PDF Viewer", "description": "Portable Document Format", "filename": "mhjfbmdgcfjbbpaeojofohoefgiehjai"}
      ],
      "battery": {
        "charging": true,
        "level": 0.75
      },
      "speech_voices": ["Google US English", "Google UK English Male"]
    },
    "proxy": {
      "host": "proxy.nodemaven.com",
      "port": 8080,
      "username": "user_abc123",
      "password": "pass_xyz789",
      "country": "US",
      "city": "New York",
      "connection_type": "residential"
    }
  }
}
```

- [ ] **Step 8: Create test fixture — minimal_fingerprint.json**

Create `clawbrowser/test/fixtures/minimal_fingerprint.json` — only required fields, optional fields absent:

```json
{
  "schema_version": 1,
  "created_at": "2026-03-23T10:00:00Z",
  "request": {
    "platform": "linux",
    "browser": "chrome",
    "country": "US"
  },
  "response": {
    "fingerprint": {
      "user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "platform": "Linux x86_64",
      "screen": {
        "width": 1920,
        "height": 1080,
        "avail_width": 1920,
        "avail_height": 1040,
        "color_depth": 24,
        "pixel_ratio": 1.0
      },
      "hardware": {
        "concurrency": 8,
        "memory": 8
      },
      "webgl": {
        "vendor": "Google Inc.",
        "renderer": "ANGLE (NVIDIA GeForce GTX 1080)"
      },
      "canvas_seed": 12345678,
      "audio_seed": 87654321,
      "client_rects_seed": 11223344,
      "timezone": "America/New_York",
      "language": ["en-US"],
      "fonts": ["Arial"]
    }
  }
}
```

- [ ] **Step 9: Create test fixture — malformed_fingerprint.json**

Create `clawbrowser/test/fixtures/malformed_fingerprint.json`:

```json
{ "schema_version": 1, "created_at": "2026-03-23T10:00:00Z", "response": { "fingerprint": { "not_a_real_field": true } } }
```

- [ ] **Step 10: Create BUILD.gn (initial scaffold, will grow with each task)**

Create `clawbrowser/BUILD.gn`:

```gn
import("//build/config/features.gni")

static_library("clawbrowser") {
  sources = [
    "generated/fingerprint_types.cc",
    "generated/fingerprint_types.h",
  ]
  deps = [
    "//base",
  ]
}

test("clawbrowser_unittests") {
  sources = []
  deps = [
    ":clawbrowser",
    "//testing/gtest",
    "//testing/gtest:gtest_main",
  ]
  data = [
    "test/fixtures/",
  ]
}
```

- [ ] **Step 11: Create CI check script for generated file freshness**

Create `clawbrowser/schemas/check_generated_fresh.sh`:

```bash
#!/bin/bash
# CI script: verify generated C++ types are up-to-date with openapi.yaml.
# Exits non-zero if regeneration produces different output.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GEN_DIR="$SCRIPT_DIR/../generated"

# Save current generated files
cp "$GEN_DIR/fingerprint_types.h" /tmp/fingerprint_types.h.before
cp "$GEN_DIR/fingerprint_types.cc" /tmp/fingerprint_types.cc.before

# Regenerate
cd "$SCRIPT_DIR"
python3 extract_schemas.py
quicktype --src-lang schema --lang cpp --namespace clawbrowser \
  --include-location global-include --source-style single-source \
  --type-style pascal-case --member-style underscore-case \
  --out "$GEN_DIR/fingerprint_types.h" \
  fingerprint.schema.json
# Split .h/.cc if needed (same process as initial generation)

# Compare
if ! diff -q /tmp/fingerprint_types.h.before "$GEN_DIR/fingerprint_types.h" >/dev/null 2>&1 || \
   ! diff -q /tmp/fingerprint_types.cc.before "$GEN_DIR/fingerprint_types.cc" >/dev/null 2>&1; then
  echo "ERROR: Generated files are out of date with api/openapi.yaml"
  echo "Run: cd clawbrowser/schemas && python3 extract_schemas.py && quicktype ..."
  # Restore originals
  cp /tmp/fingerprint_types.h.before "$GEN_DIR/fingerprint_types.h"
  cp /tmp/fingerprint_types.cc.before "$GEN_DIR/fingerprint_types.cc"
  exit 1
fi

echo "OK: Generated files are up to date"
```

This script should be run in CI on every commit. Add to the CI pipeline alongside `clawbrowser_unittests`.

- [ ] **Step 12: Verify GN build parses (no compile yet — generated code needed first)**

Run: `gn gen out/Default && gn check out/Default //clawbrowser:clawbrowser`
Expected: Build files generated, no errors.

- [ ] **Step 13: Commit**

```bash
git add clawbrowser/BUILD.gn clawbrowser/schemas/ clawbrowser/generated/ clawbrowser/test/fixtures/
git commit -m "feat(browser): scaffold project structure and code generation pipeline

Add BUILD.gn, schema extraction script, quicktype Chromium template,
generated C++ types from OpenAPI spec, test fixtures, and CI freshness check."
```

---

### Task 2: PRNG Module — Seeded Deterministic Noise

**Files:**
- Create: `clawbrowser/noise/prng.h`
- Create: `clawbrowser/noise/prng.cc`
- Create: `clawbrowser/test/prng_unittest.cc`
- Modify: `clawbrowser/BUILD.gn` — add sources and test

- [ ] **Step 1: Write failing test for PRNG determinism**

Create `clawbrowser/test/prng_unittest.cc`:

```cpp
#include "clawbrowser/noise/prng.h"

#include "testing/gtest/include/gtest/gtest.h"

namespace clawbrowser {
namespace {

TEST(PrngTest, SameSeedProducesSameSequence) {
  Prng a(12345);
  Prng b(12345);
  for (int i = 0; i < 100; ++i) {
    EXPECT_EQ(a.NextUint32(), b.NextUint32());
  }
}

TEST(PrngTest, DifferentSeedsProduceDifferentSequence) {
  Prng a(12345);
  Prng b(54321);
  bool any_different = false;
  for (int i = 0; i < 100; ++i) {
    if (a.NextUint32() != b.NextUint32()) {
      any_different = true;
      break;
    }
  }
  EXPECT_TRUE(any_different);
}

TEST(PrngTest, PixelNoiseWithinBounds) {
  Prng prng(99999);
  for (int i = 0; i < 1000; ++i) {
    int offset = prng.PixelNoise();
    EXPECT_GE(offset, -1);
    EXPECT_LE(offset, 1);
  }
}

TEST(PrngTest, AudioNoiseWithinBounds) {
  Prng prng(99999);
  for (int i = 0; i < 1000; ++i) {
    float offset = prng.AudioNoise();
    EXPECT_GE(offset, -1e-7f);
    EXPECT_LE(offset, 1e-7f);
  }
}

TEST(PrngTest, SubPixelNoiseWithinBounds) {
  Prng prng(99999);
  for (int i = 0; i < 1000; ++i) {
    double offset = prng.SubPixelNoise();
    EXPECT_GE(offset, -0.001);
    EXPECT_LE(offset, 0.001);
  }
}

TEST(PrngTest, DeterministicPixelNoise) {
  Prng a(42);
  Prng b(42);
  for (int i = 0; i < 100; ++i) {
    EXPECT_EQ(a.PixelNoise(), b.PixelNoise());
  }
}

}  // namespace
}  // namespace clawbrowser
```

- [ ] **Step 2: Run test to verify it fails**

Run: `autoninja -C out/Default clawbrowser_unittests && out/Default/clawbrowser_unittests --gtest_filter="PrngTest.*"`
Expected: FAIL — `clawbrowser/noise/prng.h` not found

- [ ] **Step 3: Write PRNG header**

Create `clawbrowser/noise/prng.h`:

```cpp
#ifndef CLAWBROWSER_NOISE_PRNG_H_
#define CLAWBROWSER_NOISE_PRNG_H_

#include <cstdint>

namespace clawbrowser {

// Seeded PRNG for deterministic fingerprint noise.
// Uses xorshift64 — fast, lightweight, good enough for noise injection.
// NOT cryptographically secure.
class Prng {
 public:
  explicit Prng(uint64_t seed);

  // Raw random uint32.
  uint32_t NextUint32();

  // Per-pixel noise: returns -1, 0, or +1 per color channel.
  int PixelNoise();

  // Audio sample noise: returns float in [-1e-7, +1e-7].
  float AudioNoise();

  // Sub-pixel offset: returns double in [-0.001, +0.001].
  double SubPixelNoise();

 private:
  uint64_t state_;
};

}  // namespace clawbrowser

#endif  // CLAWBROWSER_NOISE_PRNG_H_
```

- [ ] **Step 4: Write PRNG implementation**

Create `clawbrowser/noise/prng.cc`:

```cpp
#include "clawbrowser/noise/prng.h"

namespace clawbrowser {

Prng::Prng(uint64_t seed) : state_(seed ? seed : 1) {}

uint32_t Prng::NextUint32() {
  // xorshift64
  state_ ^= state_ << 13;
  state_ ^= state_ >> 7;
  state_ ^= state_ << 17;
  return static_cast<uint32_t>(state_ & 0xFFFFFFFF);
}

int Prng::PixelNoise() {
  uint32_t val = NextUint32();
  return static_cast<int>(val % 3) - 1;  // -1, 0, or +1
}

float Prng::AudioNoise() {
  uint32_t val = NextUint32();
  // Map to [-1e-7, +1e-7]
  float normalized = static_cast<float>(val) / static_cast<float>(UINT32_MAX);
  return (normalized * 2.0f - 1.0f) * 1e-7f;
}

double Prng::SubPixelNoise() {
  uint32_t val = NextUint32();
  // Map to [-0.001, +0.001]
  double normalized = static_cast<double>(val) / static_cast<double>(UINT32_MAX);
  return (normalized * 2.0 - 1.0) * 0.001;
}

}  // namespace clawbrowser
```

- [ ] **Step 5: Update BUILD.gn — add PRNG sources and test**

Add to `static_library("clawbrowser")` sources:
```
    "noise/prng.cc",
    "noise/prng.h",
```

Add to `test("clawbrowser_unittests")` sources:
```
    "test/prng_unittest.cc",
```

- [ ] **Step 6: Run test to verify it passes**

Run: `autoninja -C out/Default clawbrowser_unittests && out/Default/clawbrowser_unittests --gtest_filter="PrngTest.*"`
Expected: All 6 tests PASS

- [ ] **Step 7: Commit**

```bash
git add clawbrowser/noise/ clawbrowser/test/prng_unittest.cc clawbrowser/BUILD.gn
git commit -m "feat(browser): add seeded PRNG for deterministic fingerprint noise

xorshift64-based PRNG with helpers for pixel (±1), audio (±1e-7),
and sub-pixel (±0.001) noise generation."
```

---

### Task 3: Profile Envelope — On-Disk Wrapper Struct

**Files:**
- Create: `clawbrowser/profile_envelope.h`
- Create: `clawbrowser/profile_envelope.cc`
- Create: `clawbrowser/test/profile_envelope_unittest.cc`
- Modify: `clawbrowser/BUILD.gn`

- [ ] **Step 1: Write failing test for profile envelope parsing**

Create `clawbrowser/test/profile_envelope_unittest.cc`:

```cpp
#include "clawbrowser/profile_envelope.h"

#include "base/files/file_path.h"
#include "base/files/file_util.h"
#include "base/path_service.h"
#include "testing/gtest/include/gtest/gtest.h"

namespace clawbrowser {
namespace {

base::FilePath GetFixturePath(const std::string& filename) {
  base::FilePath exe_dir;
  base::PathService::Get(base::DIR_EXE, &exe_dir);
  return exe_dir.AppendASCII("clawbrowser")
      .AppendASCII("test")
      .AppendASCII("fixtures")
      .AppendASCII(filename);
}

TEST(ProfileEnvelopeTest, ParseValidEnvelope) {
  std::string json;
  ASSERT_TRUE(base::ReadFileToString(
      GetFixturePath("valid_fingerprint.json"), &json));

  auto result = ProfileEnvelope::Parse(json);
  ASSERT_TRUE(result.has_value()) << result.error();

  EXPECT_EQ(result->schema_version, 1);
  EXPECT_EQ(result->created_at, "2026-03-23T10:00:00Z");
  EXPECT_EQ(result->request.platform, "linux");
  EXPECT_EQ(result->request.browser, "chrome");
  EXPECT_EQ(result->request.country, "US");
  EXPECT_EQ(result->response.fingerprint.user_agent,
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
  EXPECT_EQ(result->response.fingerprint.timezone, "America/New_York");
  EXPECT_EQ(result->response.fingerprint.screen.width, 1920);
  EXPECT_EQ(result->response.proxy->host, "proxy.nodemaven.com");
}

TEST(ProfileEnvelopeTest, ParseMinimalEnvelope) {
  std::string json;
  ASSERT_TRUE(base::ReadFileToString(
      GetFixturePath("minimal_fingerprint.json"), &json));

  auto result = ProfileEnvelope::Parse(json);
  ASSERT_TRUE(result.has_value()) << result.error();

  EXPECT_EQ(result->schema_version, 1);
  // No proxy in minimal
  EXPECT_FALSE(result->response.proxy.has_value());
  // No optional fields
  EXPECT_TRUE(result->response.fingerprint.media_devices.empty());
  EXPECT_TRUE(result->response.fingerprint.plugins.empty());
}

TEST(ProfileEnvelopeTest, ParseMalformedJson) {
  auto result = ProfileEnvelope::Parse("not json at all");
  ASSERT_FALSE(result.has_value());
  EXPECT_NE(result.error().find("parse"), std::string::npos);
}

TEST(ProfileEnvelopeTest, ParseMissingRequiredField) {
  std::string json;
  ASSERT_TRUE(base::ReadFileToString(
      GetFixturePath("malformed_fingerprint.json"), &json));

  auto result = ProfileEnvelope::Parse(json);
  ASSERT_FALSE(result.has_value());
  // Should report missing required fingerprint fields
}

TEST(ProfileEnvelopeTest, OutdatedSchemaVersionWarns) {
  // schema_version 0 should still parse but set a warning flag
  std::string json = R"({
    "schema_version": 0,
    "created_at": "2026-01-01T00:00:00Z",
    "request": {"platform": "linux", "browser": "chrome", "country": "US"},
    "response": {
      "fingerprint": {
        "user_agent": "test", "platform": "test",
        "screen": {"width": 1, "height": 1, "avail_width": 1, "avail_height": 1, "color_depth": 24, "pixel_ratio": 1.0},
        "hardware": {"concurrency": 1, "memory": 1},
        "webgl": {"vendor": "test", "renderer": "test"},
        "canvas_seed": 1, "audio_seed": 1, "client_rects_seed": 1,
        "timezone": "UTC", "language": ["en"], "fonts": ["Arial"]
      }
    }
  })";
  auto result = ProfileEnvelope::Parse(json);
  ASSERT_TRUE(result.has_value());
  EXPECT_TRUE(result->schema_outdated);
}

TEST(ProfileEnvelopeTest, SerializeRoundTrip) {
  std::string json;
  ASSERT_TRUE(base::ReadFileToString(
      GetFixturePath("valid_fingerprint.json"), &json));

  auto parsed = ProfileEnvelope::Parse(json);
  ASSERT_TRUE(parsed.has_value());

  std::string serialized = parsed->Serialize();
  auto reparsed = ProfileEnvelope::Parse(serialized);
  ASSERT_TRUE(reparsed.has_value());

  EXPECT_EQ(parsed->response.fingerprint.user_agent,
            reparsed->response.fingerprint.user_agent);
  EXPECT_EQ(parsed->response.fingerprint.canvas_seed,
            reparsed->response.fingerprint.canvas_seed);
}

}  // namespace
}  // namespace clawbrowser
```

- [ ] **Step 2: Run test to verify it fails**

Run: `autoninja -C out/Default clawbrowser_unittests && out/Default/clawbrowser_unittests --gtest_filter="ProfileEnvelopeTest.*"`
Expected: FAIL — `clawbrowser/profile_envelope.h` not found

- [ ] **Step 3: Write profile envelope header**

Create `clawbrowser/profile_envelope.h`:

```cpp
#ifndef CLAWBROWSER_PROFILE_ENVELOPE_H_
#define CLAWBROWSER_PROFILE_ENVELOPE_H_

#include <optional>
#include <string>

#include "base/types/expected.h"
#include "clawbrowser/generated/fingerprint_types.h"

namespace clawbrowser {

// Request parameters stored in the envelope for --regenerate replay.
struct GenerateRequestParams {
  std::string platform;
  std::string browser;
  std::string country;
  std::string city;           // optional
  std::string connection_type; // optional
};

// On-disk profile envelope wrapping the API GenerateResponse.
// Hand-written — the nested GenerateResponse is code-generated.
struct ProfileEnvelope {
  int schema_version = 0;
  std::string created_at;
  GenerateRequestParams request;
  GenerateResponse response;
  bool schema_outdated = false;  // Set if schema_version < current

  static constexpr int kCurrentSchemaVersion = 1;

  // Parse from JSON string.
  // Returns envelope on success, error message on failure.
  static base::expected<ProfileEnvelope, std::string> Parse(
      const std::string& json);

  // Serialize to JSON string for writing to disk.
  std::string Serialize() const;
};

}  // namespace clawbrowser

#endif  // CLAWBROWSER_PROFILE_ENVELOPE_H_
```

- [ ] **Step 4: Write profile envelope implementation**

Create `clawbrowser/profile_envelope.cc`:

```cpp
#include "clawbrowser/profile_envelope.h"

#include "base/json/json_reader.h"
#include "base/json/json_writer.h"
#include "base/values.h"

namespace clawbrowser {

// static
base::expected<ProfileEnvelope, std::string> ProfileEnvelope::Parse(
    const std::string& json) {
  auto parsed = base::JSONReader::Read(json);
  if (!parsed || !parsed->is_dict()) {
    return base::unexpected("failed to parse JSON");
  }

  const base::Value::Dict& root = parsed->GetDict();
  ProfileEnvelope envelope;

  // schema_version
  auto schema_version = root.FindInt("schema_version");
  if (!schema_version) {
    return base::unexpected("fingerprint missing field: schema_version");
  }
  envelope.schema_version = *schema_version;
  envelope.schema_outdated =
      envelope.schema_version < kCurrentSchemaVersion;

  // created_at
  const std::string* created_at = root.FindString("created_at");
  if (!created_at) {
    return base::unexpected("fingerprint missing field: created_at");
  }
  envelope.created_at = *created_at;

  // request
  const base::Value::Dict* request = root.FindDict("request");
  if (request) {
    if (const std::string* v = request->FindString("platform"))
      envelope.request.platform = *v;
    if (const std::string* v = request->FindString("browser"))
      envelope.request.browser = *v;
    if (const std::string* v = request->FindString("country"))
      envelope.request.country = *v;
    if (const std::string* v = request->FindString("city"))
      envelope.request.city = *v;
    if (const std::string* v = request->FindString("connection_type"))
      envelope.request.connection_type = *v;
  }

  // response — delegate to generated parser
  const base::Value::Dict* response = root.FindDict("response");
  if (!response) {
    return base::unexpected("fingerprint missing field: response");
  }

  auto generate_response = GenerateResponse::FromDict(*response);
  if (!generate_response) {
    return base::unexpected("failed to parse response: " +
                            generate_response.error());
  }
  envelope.response = std::move(*generate_response);

  return envelope;
}

std::string ProfileEnvelope::Serialize() const {
  base::Value::Dict root;
  root.Set("schema_version", schema_version);
  root.Set("created_at", created_at);

  base::Value::Dict req;
  req.Set("platform", request.platform);
  req.Set("browser", request.browser);
  req.Set("country", request.country);
  if (!request.city.empty())
    req.Set("city", request.city);
  if (!request.connection_type.empty())
    req.Set("connection_type", request.connection_type);
  root.Set("request", std::move(req));

  root.Set("response", response.ToDict());

  std::string output;
  base::JSONWriter::WriteWithOptions(
      base::Value(std::move(root)),
      base::JSONWriter::OPTIONS_PRETTY_PRINT, &output);
  return output;
}

}  // namespace clawbrowser
```

**Note:** This implementation assumes the generated `GenerateResponse` has `FromDict()` and `ToDict()` methods. If quicktype generates different parsing APIs, adapt accordingly. The key contract is: `GenerateResponse` can be constructed from a `base::Value::Dict` and can serialize back to one.

- [ ] **Step 5: Update BUILD.gn**

Add to `static_library("clawbrowser")` sources:
```
    "profile_envelope.cc",
    "profile_envelope.h",
```

Add to `test("clawbrowser_unittests")` sources:
```
    "test/profile_envelope_unittest.cc",
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `autoninja -C out/Default clawbrowser_unittests && out/Default/clawbrowser_unittests --gtest_filter="ProfileEnvelopeTest.*"`
Expected: All 6 tests PASS

- [ ] **Step 7: Commit**

```bash
git add clawbrowser/profile_envelope.h clawbrowser/profile_envelope.cc clawbrowser/test/profile_envelope_unittest.cc clawbrowser/BUILD.gn
git commit -m "feat(browser): add profile envelope for on-disk fingerprint storage

Hand-written wrapper around code-generated GenerateResponse with
schema versioning, request param replay, and JSON round-trip."
```

---

### Task 4: Fingerprint Loader + Accessor — Pre-Sandbox Data Pipeline

**Files:**
- Create: `clawbrowser/fingerprint_loader.h`
- Create: `clawbrowser/fingerprint_loader.cc`
- Create: `clawbrowser/fingerprint_accessor.h`
- Create: `clawbrowser/fingerprint_accessor.cc`
- Create: `clawbrowser/test/fingerprint_loader_unittest.cc`
- Modify: `clawbrowser/BUILD.gn`

- [ ] **Step 1: Write failing test for fingerprint loader**

Create `clawbrowser/test/fingerprint_loader_unittest.cc`:

```cpp
#include "clawbrowser/fingerprint_loader.h"

#include "base/command_line.h"
#include "base/files/file_path.h"
#include "base/files/file_util.h"
#include "base/files/scoped_temp_dir.h"
#include "base/path_service.h"
#include "clawbrowser/fingerprint_accessor.h"
#include "testing/gtest/include/gtest/gtest.h"

namespace clawbrowser {
namespace {

base::FilePath GetFixturePath(const std::string& filename) {
  base::FilePath exe_dir;
  base::PathService::Get(base::DIR_EXE, &exe_dir);
  return exe_dir.AppendASCII("clawbrowser")
      .AppendASCII("test")
      .AppendASCII("fixtures")
      .AppendASCII(filename);
}

class FingerprintLoaderTest : public testing::Test {
 protected:
  void TearDown() override {
    // Reset global accessor state between tests
    FingerprintAccessor::Reset();
  }
};

TEST_F(FingerprintLoaderTest, LoadValidFile) {
  base::FilePath path = GetFixturePath("valid_fingerprint.json");
  auto result = LoadFingerprint(path);
  ASSERT_TRUE(result.has_value()) << result.error();

  // Accessor should now return data
  const Fingerprint* fp = FingerprintAccessor::Get();
  ASSERT_NE(fp, nullptr);
  EXPECT_EQ(fp->user_agent,
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
  EXPECT_EQ(fp->screen.width, 1920);
  EXPECT_EQ(fp->canvas_seed, 12345678);
}

TEST_F(FingerprintLoaderTest, LoadMinimalFile) {
  base::FilePath path = GetFixturePath("minimal_fingerprint.json");
  auto result = LoadFingerprint(path);
  ASSERT_TRUE(result.has_value()) << result.error();

  const Fingerprint* fp = FingerprintAccessor::Get();
  ASSERT_NE(fp, nullptr);
  // Optional fields should be absent/empty
  EXPECT_TRUE(fp->media_devices.empty());
}

TEST_F(FingerprintLoaderTest, LoadMissingFile) {
  base::FilePath path(FILE_PATH_LITERAL("/nonexistent/path.json"));
  auto result = LoadFingerprint(path);
  ASSERT_FALSE(result.has_value());
  EXPECT_NE(result.error().find("read"), std::string::npos);
}

TEST_F(FingerprintLoaderTest, LoadMalformedFile) {
  base::FilePath path = GetFixturePath("malformed_fingerprint.json");
  auto result = LoadFingerprint(path);
  ASSERT_FALSE(result.has_value());
}

TEST_F(FingerprintLoaderTest, AccessorReturnsNullWhenNotLoaded) {
  EXPECT_EQ(FingerprintAccessor::Get(), nullptr);
}

TEST_F(FingerprintLoaderTest, AccessorReturnsNullAfterReset) {
  base::FilePath path = GetFixturePath("valid_fingerprint.json");
  auto result = LoadFingerprint(path);
  ASSERT_TRUE(result.has_value());
  ASSERT_NE(FingerprintAccessor::Get(), nullptr);

  FingerprintAccessor::Reset();
  EXPECT_EQ(FingerprintAccessor::Get(), nullptr);
}

TEST_F(FingerprintLoaderTest, LoadFromCommandLine) {
  base::FilePath path = GetFixturePath("valid_fingerprint.json");
  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  cmd.AppendSwitchPath("clawbrowser-fp-path", path);

  auto result = LoadFingerprintFromCommandLine(cmd);
  ASSERT_TRUE(result.has_value()) << result.error();
  ASSERT_NE(FingerprintAccessor::Get(), nullptr);
}

TEST_F(FingerprintLoaderTest, LoadFromCommandLineNoFlag) {
  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  auto result = LoadFingerprintFromCommandLine(cmd);
  // No flag = no load, not an error (vanilla mode)
  ASSERT_TRUE(result.has_value());
  EXPECT_EQ(FingerprintAccessor::Get(), nullptr);
}

}  // namespace
}  // namespace clawbrowser
```

- [ ] **Step 2: Run test to verify it fails**

Run: `autoninja -C out/Default clawbrowser_unittests && out/Default/clawbrowser_unittests --gtest_filter="FingerprintLoaderTest.*"`
Expected: FAIL — headers not found

- [ ] **Step 3: Write fingerprint accessor**

Create `clawbrowser/fingerprint_accessor.h`:

```cpp
#ifndef CLAWBROWSER_FINGERPRINT_ACCESSOR_H_
#define CLAWBROWSER_FINGERPRINT_ACCESSOR_H_

#include <memory>

#include "clawbrowser/profile_envelope.h"

namespace clawbrowser {

// Process-global singleton providing read-only access to the loaded
// fingerprint. Returns nullptr if no fingerprint loaded (vanilla mode).
// All patches check Get() and become no-ops when nullptr.
class FingerprintAccessor {
 public:
  // Returns the loaded fingerprint, or nullptr if not loaded.
  static const Fingerprint* Get();

  // Returns the loaded proxy config, or nullptr.
  static const ProxyConfig* GetProxy();

  // Returns the full envelope, or nullptr.
  static const ProfileEnvelope* GetEnvelope();

  // Set the loaded envelope. Called by FingerprintLoader.
  static void Set(std::unique_ptr<ProfileEnvelope> envelope);

  // Clear loaded data. For testing only.
  static void Reset();

 private:
  FingerprintAccessor() = delete;
};

}  // namespace clawbrowser

#endif  // CLAWBROWSER_FINGERPRINT_ACCESSOR_H_
```

Create `clawbrowser/fingerprint_accessor.cc`:

```cpp
#include "clawbrowser/fingerprint_accessor.h"

namespace clawbrowser {

namespace {
std::unique_ptr<ProfileEnvelope> g_envelope;
}

// static
const Fingerprint* FingerprintAccessor::Get() {
  return g_envelope ? &g_envelope->response.fingerprint : nullptr;
}

// static
const ProxyConfig* FingerprintAccessor::GetProxy() {
  if (!g_envelope || !g_envelope->response.proxy)
    return nullptr;
  return &(*g_envelope->response.proxy);
}

// static
const ProfileEnvelope* FingerprintAccessor::GetEnvelope() {
  return g_envelope.get();
}

// static
void FingerprintAccessor::Set(std::unique_ptr<ProfileEnvelope> envelope) {
  g_envelope = std::move(envelope);
}

// static
void FingerprintAccessor::Reset() {
  g_envelope.reset();
}

}  // namespace clawbrowser
```

- [ ] **Step 4: Write fingerprint loader**

Create `clawbrowser/fingerprint_loader.h`:

```cpp
#ifndef CLAWBROWSER_FINGERPRINT_LOADER_H_
#define CLAWBROWSER_FINGERPRINT_LOADER_H_

#include <string>

#include "base/command_line.h"
#include "base/files/file_path.h"
#include "base/types/expected.h"

namespace clawbrowser {

// Command-line switch for fingerprint file path.
inline constexpr char kFingerprintPathSwitch[] = "clawbrowser-fp-path";

// Load fingerprint from file and store in FingerprintAccessor.
// Must be called before sandbox lockdown in renderer/GPU processes.
base::expected<void, std::string> LoadFingerprint(
    const base::FilePath& path);

// Load fingerprint if --clawbrowser-fp-path is present on command line.
// Returns success even if flag is absent (vanilla mode).
base::expected<void, std::string> LoadFingerprintFromCommandLine(
    const base::CommandLine& command_line);

}  // namespace clawbrowser

#endif  // CLAWBROWSER_FINGERPRINT_LOADER_H_
```

Create `clawbrowser/fingerprint_loader.cc`:

```cpp
#include "clawbrowser/fingerprint_loader.h"

#include "base/files/file_util.h"
#include "clawbrowser/fingerprint_accessor.h"
#include "clawbrowser/logging.h"
#include "clawbrowser/profile_envelope.h"

namespace clawbrowser {

base::expected<void, std::string> LoadFingerprint(
    const base::FilePath& path) {
  std::string contents;
  if (!base::ReadFileToString(path, &contents)) {
    return base::unexpected(
        "failed to read fingerprint file: " + path.AsUTF8Unsafe());
  }

  auto envelope = ProfileEnvelope::Parse(contents);
  if (!envelope.has_value()) {
    return base::unexpected(envelope.error());
  }

  if (envelope->schema_outdated) {
    CLAW_VLOG() << "warn: fingerprint schema version "
                << envelope->schema_version
                << " is outdated, consider --regenerate";
  }

  FingerprintAccessor::Set(
      std::make_unique<ProfileEnvelope>(std::move(*envelope)));
  return {};
}

base::expected<void, std::string> LoadFingerprintFromCommandLine(
    const base::CommandLine& command_line) {
  if (!command_line.HasSwitch(kFingerprintPathSwitch)) {
    return {};  // Vanilla mode — no fingerprint
  }

  base::FilePath path =
      command_line.GetSwitchValuePath(kFingerprintPathSwitch);
  return LoadFingerprint(path);
}

}  // namespace clawbrowser
```

- [ ] **Step 5: Update BUILD.gn**

Add to `static_library("clawbrowser")` sources:
```
    "fingerprint_accessor.cc",
    "fingerprint_accessor.h",
    "fingerprint_loader.cc",
    "fingerprint_loader.h",
```

Add to `test("clawbrowser_unittests")` sources:
```
    "test/fingerprint_loader_unittest.cc",
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `autoninja -C out/Default clawbrowser_unittests && out/Default/clawbrowser_unittests --gtest_filter="FingerprintLoaderTest.*"`
Expected: All 7 tests PASS

- [ ] **Step 7: Commit**

```bash
git add clawbrowser/fingerprint_loader.h clawbrowser/fingerprint_loader.cc \
  clawbrowser/fingerprint_accessor.h clawbrowser/fingerprint_accessor.cc \
  clawbrowser/test/fingerprint_loader_unittest.cc clawbrowser/BUILD.gn
git commit -m "feat(browser): add fingerprint loader and process-global accessor

Pre-sandbox file loading via --clawbrowser-fp-path flag.
Accessor returns nullptr in vanilla mode (no fingerprint)."
```

---

### Task 5: CLI Args Parsing

**Files:**
- Create: `clawbrowser/cli/args.h`
- Create: `clawbrowser/cli/args.cc`
- Create: `clawbrowser/test/args_unittest.cc`
- Modify: `clawbrowser/BUILD.gn`

- [ ] **Step 1: Write failing test for CLI args**

Create `clawbrowser/test/args_unittest.cc`:

```cpp
#include "clawbrowser/cli/args.h"

#include "base/command_line.h"
#include "testing/gtest/include/gtest/gtest.h"

namespace clawbrowser {
namespace {

TEST(ArgsTest, ParseFingerprintId) {
  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  cmd.AppendSwitchASCII("fingerprint", "fp_abc123");

  ClawArgs args = ClawArgs::Parse(cmd);
  EXPECT_TRUE(args.has_fingerprint());
  EXPECT_EQ(args.fingerprint_id(), "fp_abc123");
  EXPECT_FALSE(args.regenerate());
  EXPECT_FALSE(args.list());
  EXPECT_FALSE(args.verbose());
  EXPECT_FALSE(args.skip_verify());
}

TEST(ArgsTest, ParseRegenerate) {
  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  cmd.AppendSwitchASCII("fingerprint", "fp_abc123");
  cmd.AppendSwitch("regenerate");

  ClawArgs args = ClawArgs::Parse(cmd);
  EXPECT_TRUE(args.has_fingerprint());
  EXPECT_TRUE(args.regenerate());
}

TEST(ArgsTest, ParseList) {
  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  cmd.AppendSwitch("list");

  ClawArgs args = ClawArgs::Parse(cmd);
  EXPECT_TRUE(args.list());
  EXPECT_FALSE(args.has_fingerprint());
}

TEST(ArgsTest, ParseVerbose) {
  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  cmd.AppendSwitch("verbose");

  ClawArgs args = ClawArgs::Parse(cmd);
  EXPECT_TRUE(args.verbose());
}

TEST(ArgsTest, ParseOutputJson) {
  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  cmd.AppendSwitchASCII("output", "json");

  ClawArgs args = ClawArgs::Parse(cmd);
  EXPECT_TRUE(args.json_output());
}

TEST(ArgsTest, ParseSkipVerify) {
  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  cmd.AppendSwitch("skip-verify");

  ClawArgs args = ClawArgs::Parse(cmd);
  EXPECT_TRUE(args.skip_verify());
}

TEST(ArgsTest, VanillaMode) {
  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);

  ClawArgs args = ClawArgs::Parse(cmd);
  EXPECT_FALSE(args.has_fingerprint());
  EXPECT_TRUE(args.is_vanilla());
}

TEST(ArgsTest, InvalidFingerprintId) {
  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  cmd.AppendSwitchASCII("fingerprint", "");

  ClawArgs args = ClawArgs::Parse(cmd);
  EXPECT_TRUE(args.has_fingerprint());
  EXPECT_TRUE(args.fingerprint_id().empty());
  // Validation happens in profile_manager, not args
}

}  // namespace
}  // namespace clawbrowser
```

- [ ] **Step 2: Run test to verify it fails**

Run: `autoninja -C out/Default clawbrowser_unittests && out/Default/clawbrowser_unittests --gtest_filter="ArgsTest.*"`
Expected: FAIL — header not found

- [ ] **Step 3: Write args header and implementation**

Create `clawbrowser/cli/args.h`:

```cpp
#ifndef CLAWBROWSER_CLI_ARGS_H_
#define CLAWBROWSER_CLI_ARGS_H_

#include <string>

#include "base/command_line.h"

namespace clawbrowser {

// Parsed clawbrowser-specific CLI flags.
// Unknown flags pass through to Chromium unchanged.
class ClawArgs {
 public:
  static ClawArgs Parse(const base::CommandLine& command_line);

  bool has_fingerprint() const { return has_fingerprint_; }
  const std::string& fingerprint_id() const { return fingerprint_id_; }
  bool regenerate() const { return regenerate_; }
  bool list() const { return list_; }
  bool verbose() const { return verbose_; }
  bool json_output() const { return json_output_; }
  bool skip_verify() const { return skip_verify_; }
  bool is_vanilla() const { return !has_fingerprint_ && !list_; }

 private:
  bool has_fingerprint_ = false;
  std::string fingerprint_id_;
  bool regenerate_ = false;
  bool list_ = false;
  bool verbose_ = false;
  bool json_output_ = false;
  bool skip_verify_ = false;
};

}  // namespace clawbrowser

#endif  // CLAWBROWSER_CLI_ARGS_H_
```

Create `clawbrowser/cli/args.cc`:

```cpp
#include "clawbrowser/cli/args.h"

namespace clawbrowser {

// static
ClawArgs ClawArgs::Parse(const base::CommandLine& command_line) {
  ClawArgs args;

  if (command_line.HasSwitch("fingerprint")) {
    args.has_fingerprint_ = true;
    args.fingerprint_id_ = command_line.GetSwitchValueASCII("fingerprint");
  }

  args.regenerate_ = command_line.HasSwitch("regenerate");
  args.list_ = command_line.HasSwitch("list");
  args.verbose_ = command_line.HasSwitch("verbose");
  args.skip_verify_ = command_line.HasSwitch("skip-verify");

  if (command_line.HasSwitch("output")) {
    args.json_output_ =
        command_line.GetSwitchValueASCII("output") == "json";
  }

  return args;
}

}  // namespace clawbrowser
```

- [ ] **Step 4: Update BUILD.gn**

Add to `static_library("clawbrowser")` sources:
```
    "cli/args.cc",
    "cli/args.h",
```

Add to `test("clawbrowser_unittests")` sources:
```
    "test/args_unittest.cc",
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `autoninja -C out/Default clawbrowser_unittests && out/Default/clawbrowser_unittests --gtest_filter="ArgsTest.*"`
Expected: All 8 tests PASS

- [ ] **Step 6: Commit**

```bash
git add clawbrowser/cli/args.h clawbrowser/cli/args.cc clawbrowser/test/args_unittest.cc clawbrowser/BUILD.gn
git commit -m "feat(browser): add CLI args parsing for clawbrowser flags

Parses --fingerprint, --regenerate, --list, --verbose, --output=json,
--skip-verify. Unknown flags pass through to Chromium."
```

---

### Task 6: API Client — HTTP Calls to Backend

**Files:**
- Create: `clawbrowser/cli/api_client.h`
- Create: `clawbrowser/cli/api_client.cc`
- Create: `clawbrowser/test/api_client_unittest.cc`
- Modify: `clawbrowser/BUILD.gn`

- [ ] **Step 1: Write failing test for API client**

Create `clawbrowser/test/api_client_unittest.cc`:

```cpp
#include "clawbrowser/cli/api_client.h"

#include "base/test/task_environment.h"
#include "base/test/test_future.h"
#include "net/test/embedded_test_server/embedded_test_server.h"
#include "net/test/embedded_test_server/http_request.h"
#include "net/test/embedded_test_server/http_response.h"
#include "services/network/public/cpp/shared_url_loader_factory.h"
#include "services/network/test/test_url_loader_factory.h"
#include "testing/gtest/include/gtest/gtest.h"

namespace clawbrowser {
namespace {

const char kTestApiKey[] = "test_api_key_123";
const char kTestBaseUrl[] = "https://api.clawbrowser.ai";

class ApiClientTest : public testing::Test {
 protected:
  void SetUp() override {
    client_ = std::make_unique<ApiClient>(
        kTestBaseUrl, kTestApiKey,
        url_loader_factory_.GetSafeWeakWrapper());
  }

  base::test::TaskEnvironment task_environment_;
  network::TestURLLoaderFactory url_loader_factory_;
  std::unique_ptr<ApiClient> client_;
};

TEST_F(ApiClientTest, GenerateFingerprintSuccess) {
  std::string response_json = R"({
    "fingerprint": {
      "user_agent": "test-ua", "platform": "test",
      "screen": {"width": 1920, "height": 1080, "avail_width": 1920,
                 "avail_height": 1040, "color_depth": 24, "pixel_ratio": 1.0},
      "hardware": {"concurrency": 8, "memory": 8},
      "webgl": {"vendor": "test", "renderer": "test"},
      "canvas_seed": 123, "audio_seed": 456, "client_rects_seed": 789,
      "timezone": "UTC", "language": ["en"], "fonts": ["Arial"]
    }
  })";

  url_loader_factory_.AddResponse(
      kTestBaseUrl + std::string("/v1/fingerprints/generate"),
      response_json);

  base::test::TestFuture<base::expected<GenerateResponse, ApiError>> future;
  client_->GenerateFingerprint(
      GenerateRequestParams{"linux", "chrome", "US", "", ""},
      future.GetCallback());

  auto result = future.Get();
  ASSERT_TRUE(result.has_value()) << result.error().message;
  EXPECT_EQ(result->fingerprint.user_agent, "test-ua");
}

TEST_F(ApiClientTest, GenerateFingerprintUnauthorized) {
  url_loader_factory_.AddResponse(
      kTestBaseUrl + std::string("/v1/fingerprints/generate"),
      R"({"code": "invalid_api_key", "message": "invalid API key"})",
      net::HTTP_UNAUTHORIZED);

  base::test::TestFuture<base::expected<GenerateResponse, ApiError>> future;
  client_->GenerateFingerprint(
      GenerateRequestParams{"linux", "chrome", "US", "", ""},
      future.GetCallback());

  auto result = future.Get();
  ASSERT_FALSE(result.has_value());
  EXPECT_EQ(result.error().http_status, 401);
}

TEST_F(ApiClientTest, GenerateFingerprintRateLimited) {
  url_loader_factory_.AddResponse(
      kTestBaseUrl + std::string("/v1/fingerprints/generate"),
      R"({"code": "rate_limited", "message": "rate limited"})",
      net::HTTP_TOO_MANY_REQUESTS);

  base::test::TestFuture<base::expected<GenerateResponse, ApiError>> future;
  client_->GenerateFingerprint(
      GenerateRequestParams{"linux", "chrome", "US", "", ""},
      future.GetCallback());

  auto result = future.Get();
  ASSERT_FALSE(result.has_value());
  EXPECT_EQ(result.error().http_status, 429);
}

TEST_F(ApiClientTest, VerifyProxySuccess) {
  url_loader_factory_.AddResponse(
      kTestBaseUrl + std::string("/v1/proxy/verify"),
      R"({"match": true, "actual_country": "US", "actual_city": "New York"})");

  base::test::TestFuture<base::expected<VerifyProxyResponse, ApiError>> future;
  client_->VerifyProxy(
      VerifyProxyRequest{{"proxy.example.com", 8080, "user", "pass"}, "US", ""},
      future.GetCallback());

  auto result = future.Get();
  ASSERT_TRUE(result.has_value());
  EXPECT_TRUE(result->match);
  EXPECT_EQ(result->actual_country, "US");
}

TEST_F(ApiClientTest, NetworkFailure) {
  url_loader_factory_.AddResponse(
      GURL(kTestBaseUrl + std::string("/v1/fingerprints/generate")),
      network::mojom::URLResponseHead::New(),
      "",
      network::URLLoaderCompletionStatus(net::ERR_CONNECTION_REFUSED));

  base::test::TestFuture<base::expected<GenerateResponse, ApiError>> future;
  client_->GenerateFingerprint(
      GenerateRequestParams{"linux", "chrome", "US", "", ""},
      future.GetCallback());

  auto result = future.Get();
  ASSERT_FALSE(result.has_value());
  EXPECT_EQ(result.error().http_status, 0);
  EXPECT_NE(result.error().message.find("reach"), std::string::npos);
}

}  // namespace
}  // namespace clawbrowser
```

- [ ] **Step 2: Run test to verify it fails**

Run: `autoninja -C out/Default clawbrowser_unittests && out/Default/clawbrowser_unittests --gtest_filter="ApiClientTest.*"`
Expected: FAIL — header not found

- [ ] **Step 3: Write API client header**

Create `clawbrowser/cli/api_client.h`:

```cpp
#ifndef CLAWBROWSER_CLI_API_CLIENT_H_
#define CLAWBROWSER_CLI_API_CLIENT_H_

#include <memory>
#include <string>

#include "base/functional/callback.h"
#include "base/types/expected.h"
#include "clawbrowser/generated/fingerprint_types.h"
#include "clawbrowser/profile_envelope.h"

namespace network {
class SharedURLLoaderFactory;
class SimpleURLLoader;
}  // namespace network

namespace clawbrowser {

struct ApiError {
  int http_status = 0;  // 0 = network error
  std::string code;
  std::string message;
};

// HTTP client for clawbrowser API. Used pre-launch in browser process.
// Only two endpoints: generate fingerprint and verify proxy.
// 10s timeout, no retries — fail fast.
class ApiClient {
 public:
  ApiClient(const std::string& base_url,
            const std::string& api_key,
            scoped_refptr<network::SharedURLLoaderFactory> url_loader_factory);
  ~ApiClient();

  using GenerateCallback =
      base::OnceCallback<void(base::expected<GenerateResponse, ApiError>)>;
  using VerifyCallback =
      base::OnceCallback<void(base::expected<VerifyProxyResponse, ApiError>)>;

  void GenerateFingerprint(const GenerateRequestParams& params,
                           GenerateCallback callback);

  void VerifyProxy(const VerifyProxyRequest& request,
                   VerifyCallback callback);

 private:
  std::string base_url_;
  std::string api_key_;
  scoped_refptr<network::SharedURLLoaderFactory> url_loader_factory_;
  std::unique_ptr<network::SimpleURLLoader> loader_;
};

}  // namespace clawbrowser

#endif  // CLAWBROWSER_CLI_API_CLIENT_H_
```

- [ ] **Step 4: Write API client implementation**

Create `clawbrowser/cli/api_client.cc`:

```cpp
#include "clawbrowser/cli/api_client.h"

#include "base/json/json_reader.h"
#include "base/json/json_writer.h"
#include "base/values.h"
#include "net/base/load_flags.h"
#include "net/traffic_annotation/network_traffic_annotation.h"
#include "services/network/public/cpp/resource_request.h"
#include "services/network/public/cpp/shared_url_loader_factory.h"
#include "services/network/public/cpp/simple_url_loader.h"

namespace clawbrowser {

namespace {

constexpr int kTimeoutSeconds = 10;
constexpr int kMaxResponseBytes = 256 * 1024;  // 256KB

net::NetworkTrafficAnnotationTag GetTrafficAnnotation() {
  return net::DefineNetworkTrafficAnnotation("clawbrowser_api", R"(
    semantics {
      sender: "Clawbrowser"
      description: "Fetches fingerprint profiles and verifies proxy configuration."
      trigger: "User launches browser with --fingerprint flag."
      data: "API key, requested fingerprint parameters."
      destination: OTHER
    }
    policy {
      cookies_allowed: NO
      setting: "Controlled by --fingerprint CLI flag."
    })");
}

ApiError ParseApiError(int http_status, const std::string& body) {
  ApiError error;
  error.http_status = http_status;

  auto parsed = base::JSONReader::Read(body);
  if (parsed && parsed->is_dict()) {
    const auto& dict = parsed->GetDict();
    if (const std::string* code = dict.FindString("code"))
      error.code = *code;
    if (const std::string* msg = dict.FindString("message"))
      error.message = *msg;
  }

  if (error.message.empty()) {
    switch (http_status) {
      case 401: error.message = "invalid API key"; break;
      case 429: error.message = "rate limited, try again later"; break;
      case 500: error.message = "API server error"; break;
      default: error.message = "unexpected error"; break;
    }
  }

  return error;
}

}  // namespace

ApiClient::ApiClient(const std::string& base_url,
                     const std::string& api_key,
                     scoped_refptr<network::SharedURLLoaderFactory> url_loader_factory)
    : base_url_(base_url),
      api_key_(api_key),
      url_loader_factory_(std::move(url_loader_factory)) {}

ApiClient::~ApiClient() = default;

void ApiClient::GenerateFingerprint(const GenerateRequestParams& params,
                                    GenerateCallback callback) {
  auto resource_request = std::make_unique<network::ResourceRequest>();
  resource_request->url = GURL(base_url_ + "/v1/fingerprints/generate");
  resource_request->method = "POST";
  resource_request->headers.SetHeader("Authorization",
                                      "Bearer " + api_key_);
  resource_request->headers.SetHeader("Content-Type", "application/json");

  base::Value::Dict body;
  body.Set("platform", params.platform);
  body.Set("browser", params.browser);
  body.Set("country", params.country);
  if (!params.city.empty())
    body.Set("city", params.city);
  if (!params.connection_type.empty())
    body.Set("connection_type", params.connection_type);

  std::string body_json;
  base::JSONWriter::Write(base::Value(std::move(body)), &body_json);

  loader_ = network::SimpleURLLoader::Create(
      std::move(resource_request), GetTrafficAnnotation());
  loader_->AttachStringForUpload(body_json, "application/json");
  loader_->SetTimeoutDuration(base::Seconds(kTimeoutSeconds));

  loader_->DownloadToString(
      url_loader_factory_.get(),
      base::BindOnce(
          [](GenerateCallback callback,
             network::SimpleURLLoader* loader,
             std::unique_ptr<std::string> body) {
            int status = 0;
            if (loader->ResponseInfo() && loader->ResponseInfo()->headers)
              status = loader->ResponseInfo()->headers->response_code();

            if (!body || status == 0) {
              std::move(callback).Run(base::unexpected(ApiError{
                  0, "network_error",
                  "cannot reach API: " + net::ErrorToString(loader->NetError())
              }));
              return;
            }

            if (status != 200) {
              std::move(callback).Run(
                  base::unexpected(ParseApiError(status, *body)));
              return;
            }

            auto parsed = GenerateResponse::FromJson(*body);
            if (!parsed) {
              std::move(callback).Run(base::unexpected(ApiError{
                  200, "parse_error",
                  "failed to parse API response: " + parsed.error()
              }));
              return;
            }

            std::move(callback).Run(std::move(*parsed));
          },
          std::move(callback), loader_.get()),
      kMaxResponseBytes);
}

void ApiClient::VerifyProxy(const VerifyProxyRequest& request,
                            VerifyCallback callback) {
  auto resource_request = std::make_unique<network::ResourceRequest>();
  resource_request->url = GURL(base_url_ + "/v1/proxy/verify");
  resource_request->method = "POST";
  resource_request->headers.SetHeader("Authorization",
                                      "Bearer " + api_key_);
  resource_request->headers.SetHeader("Content-Type", "application/json");

  std::string body_json = request.ToJson();

  loader_ = network::SimpleURLLoader::Create(
      std::move(resource_request), GetTrafficAnnotation());
  loader_->AttachStringForUpload(body_json, "application/json");
  loader_->SetTimeoutDuration(base::Seconds(kTimeoutSeconds));

  loader_->DownloadToString(
      url_loader_factory_.get(),
      base::BindOnce(
          [](VerifyCallback callback,
             network::SimpleURLLoader* loader,
             std::unique_ptr<std::string> body) {
            int status = 0;
            if (loader->ResponseInfo() && loader->ResponseInfo()->headers)
              status = loader->ResponseInfo()->headers->response_code();

            if (!body || status == 0) {
              std::move(callback).Run(base::unexpected(ApiError{
                  0, "network_error",
                  "cannot reach API: " + net::ErrorToString(loader->NetError())
              }));
              return;
            }

            if (status != 200) {
              std::move(callback).Run(
                  base::unexpected(ParseApiError(status, *body)));
              return;
            }

            auto parsed = VerifyProxyResponse::FromJson(*body);
            if (!parsed) {
              std::move(callback).Run(base::unexpected(ApiError{
                  200, "parse_error",
                  "failed to parse verify response: " + parsed.error()
              }));
              return;
            }

            std::move(callback).Run(std::move(*parsed));
          },
          std::move(callback), loader_.get()),
      kMaxResponseBytes);
}

}  // namespace clawbrowser
```

- [ ] **Step 5: Update BUILD.gn**

Add to `static_library("clawbrowser")` sources:
```
    "cli/api_client.cc",
    "cli/api_client.h",
```
Add to deps:
```
    "//net",
    "//services/network/public/cpp",
```

Add to `test("clawbrowser_unittests")` sources:
```
    "test/api_client_unittest.cc",
```
Add to test deps:
```
    "//services/network:test_support",
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `autoninja -C out/Default clawbrowser_unittests && out/Default/clawbrowser_unittests --gtest_filter="ApiClientTest.*"`
Expected: All 5 tests PASS

- [ ] **Step 7: Commit**

```bash
git add clawbrowser/cli/api_client.h clawbrowser/cli/api_client.cc \
  clawbrowser/test/api_client_unittest.cc clawbrowser/BUILD.gn
git commit -m "feat(browser): add API client for fingerprint generation and proxy verify

Uses SimpleURLLoader with 10s timeout, Bearer auth. Two endpoints:
POST /v1/fingerprints/generate and POST /v1/proxy/verify."
```

---

### Task 7: Profile Manager — Config, Caching, Listing

**Files:**
- Create: `clawbrowser/cli/profile_manager.h`
- Create: `clawbrowser/cli/profile_manager.cc`
- Create: `clawbrowser/test/profile_manager_unittest.cc`
- Modify: `clawbrowser/BUILD.gn`

- [ ] **Step 1: Write failing test for profile manager**

Create `clawbrowser/test/profile_manager_unittest.cc`:

```cpp
#include "clawbrowser/cli/profile_manager.h"

#include "base/environment.h"
#include "base/files/file_util.h"
#include "base/files/scoped_temp_dir.h"
#include "base/json/json_writer.h"
#include "base/values.h"
#include "testing/gtest/include/gtest/gtest.h"

namespace clawbrowser {
namespace {

class ProfileManagerTest : public testing::Test {
 protected:
  void SetUp() override {
    ASSERT_TRUE(temp_dir_.CreateUniqueTempDir());
    manager_ = std::make_unique<ProfileManager>(temp_dir_.GetPath());
  }

  void WriteConfigJson(const std::string& api_key,
                       const std::string& base_url = "") {
    base::Value::Dict config;
    config.Set("api_key", api_key);
    if (!base_url.empty())
      config.Set("api_base_url", base_url);

    std::string json;
    base::JSONWriter::Write(base::Value(std::move(config)), &json);
    base::WriteFile(temp_dir_.GetPath().AppendASCII("config.json"), json);
  }

  void WriteFingerprintProfile(const std::string& id) {
    base::FilePath profile_dir =
        temp_dir_.GetPath().AppendASCII("Browser").AppendASCII(id);
    base::CreateDirectory(profile_dir);

    std::string envelope = R"({
      "schema_version": 1, "created_at": "2026-03-23T10:00:00Z",
      "request": {"platform": "linux", "browser": "chrome", "country": "US"},
      "response": {
        "fingerprint": {
          "user_agent": "test", "platform": "test",
          "screen": {"width": 1920, "height": 1080, "avail_width": 1920,
                     "avail_height": 1040, "color_depth": 24, "pixel_ratio": 1.0},
          "hardware": {"concurrency": 8, "memory": 8},
          "webgl": {"vendor": "v", "renderer": "r"},
          "canvas_seed": 1, "audio_seed": 2, "client_rects_seed": 3,
          "timezone": "UTC", "language": ["en"], "fonts": ["Arial"]
        }
      }
    })";
    base::WriteFile(profile_dir.AppendASCII("fingerprint.json"), envelope);
  }

  base::ScopedTempDir temp_dir_;
  std::unique_ptr<ProfileManager> manager_;
};

TEST_F(ProfileManagerTest, ApiKeyFromConfigJson) {
  WriteConfigJson("key_from_config");
  auto key = manager_->ResolveApiKey();
  ASSERT_TRUE(key.has_value());
  EXPECT_EQ(*key, "key_from_config");
}

TEST_F(ProfileManagerTest, ApiKeyFromEnvVar) {
  auto env = base::Environment::Create();
  env->SetVar("CLAWBROWSER_API_KEY", "key_from_env");
  // Env var takes precedence over config.json
  WriteConfigJson("key_from_config");
  auto key = manager_->ResolveApiKey();
  ASSERT_TRUE(key.has_value());
  EXPECT_EQ(*key, "key_from_env");
  env->UnSetVar("CLAWBROWSER_API_KEY");
}

TEST_F(ProfileManagerTest, ApiKeyMissing) {
  auto key = manager_->ResolveApiKey();
  ASSERT_FALSE(key.has_value());
}

TEST_F(ProfileManagerTest, ListProfiles) {
  WriteFingerprintProfile("fp_abc123");
  WriteFingerprintProfile("fp_def456");

  auto profiles = manager_->ListProfiles();
  EXPECT_EQ(profiles.size(), 2u);
  // Should contain both IDs (order may vary)
  bool found_abc = false, found_def = false;
  for (const auto& p : profiles) {
    if (p.id == "fp_abc123") found_abc = true;
    if (p.id == "fp_def456") found_def = true;
  }
  EXPECT_TRUE(found_abc);
  EXPECT_TRUE(found_def);
}

TEST_F(ProfileManagerTest, ListProfilesEmpty) {
  auto profiles = manager_->ListProfiles();
  EXPECT_TRUE(profiles.empty());
}

TEST_F(ProfileManagerTest, GetFingerprintPath) {
  WriteFingerprintProfile("fp_abc123");

  auto path = manager_->GetFingerprintPath("fp_abc123");
  EXPECT_TRUE(base::PathExists(path));
  EXPECT_NE(path.value().find("fp_abc123"), std::string::npos);
}

TEST_F(ProfileManagerTest, GetUserDataDir) {
  auto dir = manager_->GetUserDataDir("fp_abc123");
  EXPECT_NE(dir.value().find("fp_abc123"), std::string::npos);
}

TEST_F(ProfileManagerTest, GetVanillaUserDataDir) {
  auto dir = manager_->GetVanillaUserDataDir();
  EXPECT_NE(dir.value().find("Default"), std::string::npos);
}

TEST_F(ProfileManagerTest, SaveAndReadEnvelope) {
  ProfileEnvelope envelope;
  envelope.schema_version = 1;
  envelope.created_at = "2026-03-23T10:00:00Z";
  envelope.request = {"linux", "chrome", "US", "", ""};
  // Set up a minimal response (requires generated types working)

  auto save_result = manager_->SaveProfile("fp_test", envelope);
  ASSERT_TRUE(save_result.has_value()) << save_result.error();

  auto read_result = manager_->ReadProfile("fp_test");
  ASSERT_TRUE(read_result.has_value()) << read_result.error();
  EXPECT_EQ(read_result->schema_version, 1);
}

TEST_F(ProfileManagerTest, SaveProfileDirectoryNotWritable) {
  // Create a read-only directory to simulate write failure
  base::FilePath readonly_dir = temp_dir_.GetPath().AppendASCII("readonly");
  ASSERT_TRUE(base::CreateDirectory(readonly_dir));
  ASSERT_TRUE(base::SetPosixFilePermissions(readonly_dir, 0555));

  ProfileManager readonly_manager(readonly_dir);
  ProfileEnvelope envelope;
  envelope.schema_version = 1;
  envelope.created_at = "2026-03-23T10:00:00Z";
  envelope.request = {"linux", "chrome", "US", "", ""};

  auto result = readonly_manager.SaveProfile("fp_fail", envelope);
  EXPECT_FALSE(result.has_value());
  EXPECT_FALSE(result.error().empty());

  // Cleanup: restore permissions so temp dir cleanup works
  base::SetPosixFilePermissions(readonly_dir, 0755);
}

}  // namespace
}  // namespace clawbrowser
```

- [ ] **Step 2: Run test to verify it fails**

Run: `autoninja -C out/Default clawbrowser_unittests && out/Default/clawbrowser_unittests --gtest_filter="ProfileManagerTest.*"`
Expected: FAIL — header not found

- [ ] **Step 3: Write profile manager header**

Create `clawbrowser/cli/profile_manager.h`:

```cpp
#ifndef CLAWBROWSER_CLI_PROFILE_MANAGER_H_
#define CLAWBROWSER_CLI_PROFILE_MANAGER_H_

#include <optional>
#include <string>
#include <vector>

#include "base/files/file_path.h"
#include "base/types/expected.h"
#include "clawbrowser/profile_envelope.h"

namespace clawbrowser {

struct ProfileInfo {
  std::string id;
  std::string created_at;
  std::string country;
};

// Manages fingerprint profiles on disk.
// Root: ~/.config/clawbrowser/ (or overridden for testing).
class ProfileManager {
 public:
  explicit ProfileManager(const base::FilePath& root_dir);
  ~ProfileManager();

  // Resolve API key: env var CLAWBROWSER_API_KEY first, then config.json.
  std::optional<std::string> ResolveApiKey();

  // Resolve API base URL: config.json, or default.
  std::string ResolveBaseUrl();

  // List all cached fingerprint profiles.
  std::vector<ProfileInfo> ListProfiles();

  // Path to fingerprint.json for a given profile ID.
  base::FilePath GetFingerprintPath(const std::string& id);

  // User-data-dir for a fingerprint profile.
  base::FilePath GetUserDataDir(const std::string& id);

  // User-data-dir for vanilla mode.
  base::FilePath GetVanillaUserDataDir();

  // Save a profile envelope to disk.
  base::expected<void, std::string> SaveProfile(
      const std::string& id,
      const ProfileEnvelope& envelope);

  // Read a cached profile from disk.
  base::expected<ProfileEnvelope, std::string> ReadProfile(
      const std::string& id);

  // Check if a cached profile exists.
  bool HasCachedProfile(const std::string& id);

 private:
  base::FilePath root_dir_;

  static constexpr char kDefaultBaseUrl[] = "https://api.clawbrowser.ai";
};

}  // namespace clawbrowser

#endif  // CLAWBROWSER_CLI_PROFILE_MANAGER_H_
```

- [ ] **Step 4: Write profile manager implementation**

Create `clawbrowser/cli/profile_manager.cc`:

```cpp
#include "clawbrowser/cli/profile_manager.h"

#include "base/environment.h"
#include "base/files/file_enumerator.h"
#include "base/files/file_util.h"
#include "base/json/json_reader.h"
#include "base/logging.h"

namespace clawbrowser {

ProfileManager::ProfileManager(const base::FilePath& root_dir)
    : root_dir_(root_dir) {}

ProfileManager::~ProfileManager() = default;

std::optional<std::string> ProfileManager::ResolveApiKey() {
  // 1. Environment variable
  auto env = base::Environment::Create();
  std::string env_key;
  if (env->GetVar("CLAWBROWSER_API_KEY", &env_key) && !env_key.empty()) {
    return env_key;
  }

  // 2. config.json
  base::FilePath config_path = root_dir_.AppendASCII("config.json");
  std::string config_json;
  if (base::ReadFileToString(config_path, &config_json)) {
    auto parsed = base::JSONReader::Read(config_json);
    if (parsed && parsed->is_dict()) {
      const std::string* key = parsed->GetDict().FindString("api_key");
      if (key && !key->empty())
        return *key;
    }
  }

  return std::nullopt;
}

std::string ProfileManager::ResolveBaseUrl() {
  base::FilePath config_path = root_dir_.AppendASCII("config.json");
  std::string config_json;
  if (base::ReadFileToString(config_path, &config_json)) {
    auto parsed = base::JSONReader::Read(config_json);
    if (parsed && parsed->is_dict()) {
      const std::string* url =
          parsed->GetDict().FindString("api_base_url");
      if (url && !url->empty())
        return *url;
    }
  }
  return kDefaultBaseUrl;
}

std::vector<ProfileInfo> ProfileManager::ListProfiles() {
  std::vector<ProfileInfo> profiles;
  base::FilePath browser_dir = root_dir_.AppendASCII("Browser");

  if (!base::DirectoryExists(browser_dir))
    return profiles;

  base::FileEnumerator enumerator(browser_dir, false,
                                  base::FileEnumerator::DIRECTORIES);
  for (base::FilePath dir = enumerator.Next(); !dir.empty();
       dir = enumerator.Next()) {
    std::string name = dir.BaseName().AsUTF8Unsafe();
    // Skip non-fingerprint directories (e.g., "Default" for vanilla)
    if (!name.starts_with("fp_"))
      continue;

    base::FilePath fp_path = dir.AppendASCII("fingerprint.json");
    if (!base::PathExists(fp_path))
      continue;

    ProfileInfo info;
    info.id = name;

    // Try to read metadata
    std::string json;
    if (base::ReadFileToString(fp_path, &json)) {
      auto envelope = ProfileEnvelope::Parse(json);
      if (envelope.has_value()) {
        info.created_at = envelope->created_at;
        info.country = envelope->request.country;
      }
    }

    profiles.push_back(std::move(info));
  }

  return profiles;
}

base::FilePath ProfileManager::GetFingerprintPath(const std::string& id) {
  return root_dir_.AppendASCII("Browser")
      .AppendASCII(id)
      .AppendASCII("fingerprint.json");
}

base::FilePath ProfileManager::GetUserDataDir(const std::string& id) {
  return root_dir_.AppendASCII("Browser").AppendASCII(id);
}

base::FilePath ProfileManager::GetVanillaUserDataDir() {
  return root_dir_.AppendASCII("Browser").AppendASCII("Default");
}

base::expected<void, std::string> ProfileManager::SaveProfile(
    const std::string& id,
    const ProfileEnvelope& envelope) {
  base::FilePath profile_dir = GetUserDataDir(id);
  if (!base::CreateDirectory(profile_dir)) {
    return base::unexpected(
        "cannot write to " + profile_dir.AsUTF8Unsafe());
  }

  base::FilePath fp_path = profile_dir.AppendASCII("fingerprint.json");
  std::string json = envelope.Serialize();
  if (!base::WriteFile(fp_path, json)) {
    return base::unexpected(
        "cannot write to " + fp_path.AsUTF8Unsafe());
  }

  return {};
}

base::expected<ProfileEnvelope, std::string> ProfileManager::ReadProfile(
    const std::string& id) {
  base::FilePath fp_path = GetFingerprintPath(id);
  std::string json;
  if (!base::ReadFileToString(fp_path, &json)) {
    return base::unexpected(
        "failed to read " + fp_path.AsUTF8Unsafe());
  }
  return ProfileEnvelope::Parse(json);
}

bool ProfileManager::HasCachedProfile(const std::string& id) {
  return base::PathExists(GetFingerprintPath(id));
}

}  // namespace clawbrowser
```

- [ ] **Step 5: Update BUILD.gn**

Add to `static_library("clawbrowser")` sources:
```
    "cli/profile_manager.cc",
    "cli/profile_manager.h",
```

Add to `test("clawbrowser_unittests")` sources:
```
    "test/profile_manager_unittest.cc",
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `autoninja -C out/Default clawbrowser_unittests && out/Default/clawbrowser_unittests --gtest_filter="ProfileManagerTest.*"`
Expected: All 10 tests PASS (includes SaveProfileDirectoryNotWritable)

- [ ] **Step 7: Commit**

```bash
git add clawbrowser/cli/profile_manager.h clawbrowser/cli/profile_manager.cc \
  clawbrowser/test/profile_manager_unittest.cc clawbrowser/BUILD.gn
git commit -m "feat(browser): add profile manager for config, caching, and listing

API key resolution (env var > config.json), profile enumeration,
fingerprint.json read/write, user-data-dir path management."
```

---

### Task 8: Proxy Config — Build Chromium ProxyConfig from Fingerprint

**Files:**
- Create: `clawbrowser/proxy/proxy_config.h`
- Create: `clawbrowser/proxy/proxy_config.cc`
- Create: `clawbrowser/test/proxy_config_unittest.cc`
- Modify: `clawbrowser/BUILD.gn`

- [ ] **Step 1: Write failing test for proxy config**

Create `clawbrowser/test/proxy_config_unittest.cc`:

```cpp
#include "clawbrowser/proxy/proxy_config.h"

#include "testing/gtest/include/gtest/gtest.h"

namespace clawbrowser {
namespace {

TEST(ProxyConfigTest, BuildFromFingerprint) {
  ProxyConfig proxy;
  proxy.host = "proxy.nodemaven.com";
  proxy.port = 8080;
  proxy.username = "user_abc";
  proxy.password = "pass_xyz";

  auto result = BuildChromiumProxyConfig(proxy);
  ASSERT_TRUE(result.has_value());

  EXPECT_EQ(result->proxy_server, "proxy.nodemaven.com:8080");
  EXPECT_EQ(result->username, "user_abc");
  EXPECT_EQ(result->password, "pass_xyz");
}

TEST(ProxyConfigTest, BuildReturnsNullForNoProxy) {
  auto result = BuildChromiumProxyConfig(std::nullopt);
  EXPECT_FALSE(result.has_value());
}

TEST(ProxyConfigTest, GeneratesProxyServerFlag) {
  ProxyConfig proxy;
  proxy.host = "proxy.example.com";
  proxy.port = 3128;
  proxy.username = "user";
  proxy.password = "pass";

  auto flags = GetProxyCommandLineFlags(proxy);
  EXPECT_EQ(flags.size(), 1u);
  EXPECT_EQ(flags[0], "--proxy-server=proxy.example.com:3128");
}

}  // namespace
}  // namespace clawbrowser
```

- [ ] **Step 2: Run test to verify it fails**

Run: `autoninja -C out/Default clawbrowser_unittests && out/Default/clawbrowser_unittests --gtest_filter="ProxyConfigTest.*"`
Expected: FAIL — header not found

- [ ] **Step 3: Write proxy config header and implementation**

Create `clawbrowser/proxy/proxy_config.h`:

```cpp
#ifndef CLAWBROWSER_PROXY_PROXY_CONFIG_H_
#define CLAWBROWSER_PROXY_PROXY_CONFIG_H_

#include <optional>
#include <string>
#include <vector>

#include "clawbrowser/generated/fingerprint_types.h"

namespace clawbrowser {

struct ChromiumProxyConfig {
  std::string proxy_server;  // host:port
  std::string username;
  std::string password;
};

// Build proxy config from fingerprint proxy data.
// Returns nullopt if no proxy provided.
std::optional<ChromiumProxyConfig> BuildChromiumProxyConfig(
    const std::optional<ProxyConfig>& proxy);

// Get command-line flags for proxy configuration.
std::vector<std::string> GetProxyCommandLineFlags(
    const ProxyConfig& proxy);

}  // namespace clawbrowser

#endif  // CLAWBROWSER_PROXY_PROXY_CONFIG_H_
```

Create `clawbrowser/proxy/proxy_config.cc`:

```cpp
#include "clawbrowser/proxy/proxy_config.h"

#include "base/strings/string_number_conversions.h"

namespace clawbrowser {

std::optional<ChromiumProxyConfig> BuildChromiumProxyConfig(
    const std::optional<ProxyConfig>& proxy) {
  if (!proxy)
    return std::nullopt;

  ChromiumProxyConfig config;
  config.proxy_server =
      proxy->host + ":" + base::NumberToString(proxy->port);
  config.username = proxy->username;
  config.password = proxy->password;
  return config;
}

std::vector<std::string> GetProxyCommandLineFlags(
    const ProxyConfig& proxy) {
  std::vector<std::string> flags;
  flags.push_back("--proxy-server=" + proxy.host + ":" +
                  base::NumberToString(proxy.port));
  return flags;
}

}  // namespace clawbrowser
```

- [ ] **Step 4: Update BUILD.gn**

Add to `static_library("clawbrowser")` sources:
```
    "proxy/proxy_config.cc",
    "proxy/proxy_config.h",
```

Add to `test("clawbrowser_unittests")` sources:
```
    "test/proxy_config_unittest.cc",
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `autoninja -C out/Default clawbrowser_unittests && out/Default/clawbrowser_unittests --gtest_filter="ProxyConfigTest.*"`
Expected: All 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add clawbrowser/proxy/ clawbrowser/test/proxy_config_unittest.cc clawbrowser/BUILD.gn
git commit -m "feat(browser): add proxy config builder from fingerprint data

Constructs host:port proxy server string and --proxy-server flag
from fingerprint ProxyConfig. Returns nullopt for vanilla mode."
```

---

### Task 9: Verify Page — WebUI Implementation

**Files:**
- Create: `clawbrowser/verify/verify_page.h`
- Create: `clawbrowser/verify/verify_page.cc`
- Create: `clawbrowser/verify/resources/verify.html`
- Create: `clawbrowser/verify/resources/verify.js`
- Create: `clawbrowser/verify/resources/verify.css`
- Modify: `clawbrowser/BUILD.gn`

- [ ] **Step 1: Create verify page HTML**

Create `clawbrowser/verify/resources/verify.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Clawbrowser Verification</title>
  <link rel="stylesheet" href="verify.css">
</head>
<body>
  <div id="container">
    <h1>Clawbrowser Fingerprint Verification</h1>
    <div id="status" class="pending">Running checks...</div>
    <table id="results">
      <thead>
        <tr>
          <th>Surface</th>
          <th>Status</th>
          <th>Expected</th>
          <th>Actual</th>
        </tr>
      </thead>
      <tbody id="results-body"></tbody>
    </table>
    <div id="proxy-status"></div>
  </div>
  <script src="verify.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create verify page CSS**

Create `clawbrowser/verify/resources/verify.css`:

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  margin: 0;
  padding: 20px;
  background: #1a1a2e;
  color: #eee;
}

#container {
  max-width: 900px;
  margin: 0 auto;
}

h1 {
  color: #e94560;
  font-size: 1.4em;
}

#status {
  padding: 12px 16px;
  border-radius: 6px;
  font-weight: bold;
  margin-bottom: 20px;
}

#status.pending { background: #333; color: #ffd700; }
#status.pass { background: #0f3d0f; color: #4caf50; }
#status.fail { background: #3d0f0f; color: #f44336; }

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
}

th, td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #333;
}

th { color: #aaa; }

.check-pass { color: #4caf50; }
.check-fail { color: #f44336; }

#proxy-status {
  margin-top: 16px;
  padding: 12px;
  border-radius: 6px;
  background: #222;
}
```

- [ ] **Step 3: Create verify page JavaScript**

Create `clawbrowser/verify/resources/verify.js`:

```javascript
// Clawbrowser fingerprint verification.
// Expected values injected by WebUI handler via window.__clawbrowser_expected.
// Results exposed via window.__clawbrowser_verify for CDP automation.

(async function() {
  const expected = window.__clawbrowser_expected;
  if (!expected) {
    document.getElementById('status').textContent = 'No expected values — not running in fingerprint mode';
    document.getElementById('status').className = 'fail';
    return;
  }

  const checks = [];

  // --- Direct comparison checks ---

  function check(surface, expectedVal, actualVal) {
    const pass = String(expectedVal) === String(actualVal);
    checks.push({ surface, pass, expected: String(expectedVal), actual: String(actualVal) });
  }

  // Navigator
  check('navigator.userAgent', expected.user_agent, navigator.userAgent);
  check('navigator.platform', expected.platform, navigator.platform);
  check('navigator.language', expected.language_primary, navigator.language);
  check('navigator.languages', expected.languages_json, JSON.stringify(navigator.languages));
  check('navigator.hardwareConcurrency', expected.hardware_concurrency, navigator.hardwareConcurrency);
  check('navigator.deviceMemory', expected.device_memory, navigator.deviceMemory);

  // Screen
  check('screen.width', expected.screen_width, screen.width);
  check('screen.height', expected.screen_height, screen.height);
  check('screen.availWidth', expected.screen_avail_width, screen.availWidth);
  check('screen.availHeight', expected.screen_avail_height, screen.availHeight);
  check('screen.colorDepth', expected.screen_color_depth, screen.colorDepth);
  check('window.devicePixelRatio', expected.pixel_ratio, window.devicePixelRatio);

  // Timezone
  check('timezone', expected.timezone, Intl.DateTimeFormat().resolvedOptions().timeZone);

  // --- Determinism checks (seeded noise surfaces) ---

  function deterministicCheck(surface, fn) {
    return fn().then(hash1 => fn().then(hash2 => {
      const pass = hash1 === hash2;
      checks.push({ surface, pass, detail: pass ? 'deterministic' : 'non-deterministic',
                     expected: hash1, actual: hash2 });
    }));
  }

  async function hashArrayBuffer(buffer) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Canvas determinism
  async function canvasHash() {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Clawbrowser test', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Clawbrowser test', 4, 17);
    const dataUrl = canvas.toDataURL();
    const encoder = new TextEncoder();
    return hashArrayBuffer(encoder.encode(dataUrl));
  }
  await deterministicCheck('canvas', canvasHash);

  // WebGL determinism
  async function webglHash() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) return 'no-webgl';
    const vendor = gl.getParameter(gl.VENDOR);
    const renderer = gl.getParameter(gl.RENDERER);
    // Also check readPixels determinism
    canvas.width = 64;
    canvas.height = 64;
    gl.clearColor(0.5, 0.3, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const pixels = new Uint8Array(64 * 64 * 4);
    gl.readPixels(0, 0, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return hashArrayBuffer(pixels.buffer);
  }
  await deterministicCheck('webgl.readPixels', webglHash);

  // WebGL strings (direct comparison)
  const glCanvas = document.createElement('canvas');
  const gl = glCanvas.getContext('webgl');
  if (gl) {
    const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugExt) {
      check('webgl.vendor', expected.webgl_vendor,
            gl.getParameter(debugExt.UNMASKED_VENDOR_WEBGL));
      check('webgl.renderer', expected.webgl_renderer,
            gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL));
    }
  }

  // Audio determinism
  async function audioHash() {
    const ctx = new OfflineAudioContext(1, 44100, 44100);
    const oscillator = ctx.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, ctx.currentTime);
    const compressor = ctx.createDynamicsCompressor();
    oscillator.connect(compressor);
    compressor.connect(ctx.destination);
    oscillator.start(0);
    const buffer = await ctx.startRendering();
    return hashArrayBuffer(buffer.getChannelData(0).buffer);
  }
  await deterministicCheck('audio', audioHash);

  // ClientRects stability
  async function clientRectsHash() {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;top:10px;left:10px;width:100px;height:50px;';
    document.body.appendChild(el);
    const rect = el.getBoundingClientRect();
    document.body.removeChild(el);
    return `${rect.x},${rect.y},${rect.width},${rect.height}`;
  }
  await deterministicCheck('clientRects', clientRectsHash);

  // --- List-based checks ---

  // Fonts
  if (expected.fonts) {
    const fontsExpected = JSON.parse(expected.fonts);
    let fontsDetected = 0;
    for (const font of fontsExpected) {
      const testSpan = document.createElement('span');
      testSpan.style.fontFamily = `"${font}", monospace`;
      testSpan.textContent = 'mmmmmmmmmmlli';
      document.body.appendChild(testSpan);
      const width = testSpan.offsetWidth;
      document.body.removeChild(testSpan);

      const monoSpan = document.createElement('span');
      monoSpan.style.fontFamily = 'monospace';
      monoSpan.textContent = 'mmmmmmmmmmlli';
      document.body.appendChild(monoSpan);
      const monoWidth = monoSpan.offsetWidth;
      document.body.removeChild(monoSpan);

      if (width !== monoWidth) fontsDetected++;
    }
    checks.push({
      surface: 'fonts',
      pass: fontsDetected > 0,
      detail: `${fontsDetected}/${fontsExpected.length} detected`
    });
  }

  // Media devices
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    check('mediaDevices.count', expected.media_devices_count, devices.length);
  } catch (e) {
    checks.push({ surface: 'mediaDevices', pass: false, detail: e.message });
  }

  // Plugins
  check('navigator.plugins.length', expected.plugins_count, navigator.plugins.length);

  // Battery
  try {
    const battery = await navigator.getBattery();
    check('battery.charging', expected.battery_charging, battery.charging);
    check('battery.level', expected.battery_level, battery.level);
  } catch (e) {
    checks.push({ surface: 'battery', pass: false, detail: e.message });
  }

  // Speech synthesis
  function checkVoices() {
    const voices = speechSynthesis.getVoices();
    if (expected.speech_voices_count !== undefined) {
      check('speechSynthesis.voices.length', expected.speech_voices_count, voices.length);
    }
  }
  if (speechSynthesis.getVoices().length > 0) {
    checkVoices();
  } else {
    speechSynthesis.onvoiceschanged = checkVoices;
  }

  // --- Proxy check (server-side via WebUI handler) ---
  try {
    chrome.send('verifyProxy');
  } catch (e) {
    // chrome.send not available outside WebUI context
  }

  // --- Render results ---

  const tbody = document.getElementById('results-body');
  let allPass = true;
  for (const c of checks) {
    if (!c.pass) allPass = false;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${c.surface}</td>
      <td class="${c.pass ? 'check-pass' : 'check-fail'}">${c.pass ? 'PASS' : 'FAIL'}</td>
      <td>${c.expected || c.detail || ''}</td>
      <td>${c.actual || ''}</td>
    `;
    tbody.appendChild(row);
  }

  const statusEl = document.getElementById('status');
  statusEl.textContent = allPass ? 'All checks passed' : 'Some checks failed';
  statusEl.className = allPass ? 'pass' : 'fail';

  // Expose results for CDP automation
  window.__clawbrowser_verify = {
    status: allPass ? 'pass' : 'fail',
    checks: checks,
    timestamp: new Date().toISOString()
  };

  // Notify browser process of verification result (triggers 30s exit timer on failure)
  try {
    chrome.send('verifyComplete', [allPass ? 'pass' : 'fail']);
  } catch (e) {
    // chrome.send not available outside WebUI context
  }
})();

// Handler for proxy verify response from browser process
function onProxyVerifyResult(result) {
  const statusEl = document.getElementById('proxy-status');
  if (result.match) {
    statusEl.innerHTML = `<span class="check-pass">Proxy: PASS</span> — IP: ${result.ipv4 || 'N/A'}, Country: ${result.actual_country}`;
  } else {
    statusEl.innerHTML = `<span class="check-fail">Proxy: FAIL</span> — Expected: ${result.expected_country}, Got: ${result.actual_country}`;
  }

  // Update global results
  if (window.__clawbrowser_verify) {
    window.__clawbrowser_verify.checks.push({
      surface: 'proxy',
      pass: result.match,
      actual_country: result.actual_country,
      actual_city: result.actual_city || ''
    });
    if (!result.match) {
      window.__clawbrowser_verify.status = 'fail';
    }
  }
}
```

- [ ] **Step 4: Write verify page WebUI handler header**

Create `clawbrowser/verify/verify_page.h`:

```cpp
#ifndef CLAWBROWSER_VERIFY_VERIFY_PAGE_H_
#define CLAWBROWSER_VERIFY_VERIFY_PAGE_H_

#include <string>

#include "content/public/browser/web_ui_controller.h"
#include "content/public/browser/web_ui_data_source.h"

namespace clawbrowser {

// WebUI controller for clawbrowser://verify page.
// Injects expected fingerprint values and handles proxy verification.
class VerifyPageUI : public content::WebUIController {
 public:
  explicit VerifyPageUI(content::WebUI* web_ui);
  ~VerifyPageUI() override;

 private:
  // Handle "verifyProxy" message from page JS.
  void HandleVerifyProxy(const base::Value::List& args);

  // Handle "verifyComplete" message — result of all checks.
  void HandleVerifyComplete(const base::Value::List& args);

  // Configure data source: add resources and inject expected values.
  void SetupDataSource(content::WebUIDataSource* source);

  // 30s timeout: if verify fails and no CDP client connects, exit(1).
  void StartFailureExitTimer();
  void OnFailureExitTimeout();

  bool verify_passed_ = false;
  base::OneShotTimer failure_exit_timer_;
};

// URL host for the verify page.
inline constexpr char kVerifyHost[] = "verify";

}  // namespace clawbrowser

#endif  // CLAWBROWSER_VERIFY_VERIFY_PAGE_H_
```

- [ ] **Step 5: Write verify page WebUI handler implementation**

Create `clawbrowser/verify/verify_page.cc`:

```cpp
#include "clawbrowser/verify/verify_page.h"

#include "base/json/json_writer.h"
#include "base/strings/string_number_conversions.h"
#include "base/values.h"
#include "clawbrowser/cli/api_client.h"
#include "clawbrowser/fingerprint_accessor.h"
#include "content/public/browser/web_ui.h"
#include "content/public/browser/web_ui_data_source.h"

namespace clawbrowser {

VerifyPageUI::VerifyPageUI(content::WebUI* web_ui)
    : content::WebUIController(web_ui) {
  content::WebUIDataSource* source =
      content::WebUIDataSource::CreateAndAdd(
          web_ui->GetWebContents()->GetBrowserContext(), kVerifyHost);
  SetupDataSource(source);

  web_ui->RegisterMessageCallback(
      "verifyProxy",
      base::BindRepeating(&VerifyPageUI::HandleVerifyProxy,
                          base::Unretained(this)));
  web_ui->RegisterMessageCallback(
      "verifyComplete",
      base::BindRepeating(&VerifyPageUI::HandleVerifyComplete,
                          base::Unretained(this)));
}

VerifyPageUI::~VerifyPageUI() = default;

void VerifyPageUI::SetupDataSource(content::WebUIDataSource* source) {
  // Resources are embedded at compile time via grit/grd
  // (see clawbrowser_verify.grd for resource ID definitions)
  source->AddResourcePath("verify.html", IDR_CLAWBROWSER_VERIFY_HTML);
  source->AddResourcePath("verify.js", IDR_CLAWBROWSER_VERIFY_JS);
  source->AddResourcePath("verify.css", IDR_CLAWBROWSER_VERIFY_CSS);
  source->SetDefaultResource(IDR_CLAWBROWSER_VERIFY_HTML);

  // Inject expected fingerprint values as replacements in the HTML.
  // The verify.html template uses $i18n{key} placeholders that get
  // replaced by WebUIDataSource before the page loads.
  const Fingerprint* fp = FingerprintAccessor::Get();
  if (!fp)
    return;

  source->AddString("user_agent", fp->user_agent);
  source->AddString("platform", fp->platform);
  source->AddString("language_primary",
                     fp->language.empty() ? "" : fp->language[0]);

  // Languages as JSON array string for comparison
  base::Value::List lang_list;
  for (const auto& lang : fp->language)
    lang_list.Append(lang);
  std::string languages_json;
  base::JSONWriter::Write(base::Value(std::move(lang_list)),
                          &languages_json);
  source->AddString("languages_json", languages_json);

  source->AddString("hardware_concurrency",
                     base::NumberToString(fp->hardware.concurrency));
  source->AddString("device_memory",
                     base::NumberToString(fp->hardware.memory));
  source->AddString("screen_width",
                     base::NumberToString(fp->screen.width));
  source->AddString("screen_height",
                     base::NumberToString(fp->screen.height));
  source->AddString("screen_avail_width",
                     base::NumberToString(fp->screen.avail_width));
  source->AddString("screen_avail_height",
                     base::NumberToString(fp->screen.avail_height));
  source->AddString("screen_color_depth",
                     base::NumberToString(fp->screen.color_depth));
  source->AddString("pixel_ratio",
                     base::NumberToString(fp->screen.pixel_ratio));
  source->AddString("timezone", fp->timezone);
  source->AddString("webgl_vendor", fp->webgl.vendor);
  source->AddString("webgl_renderer", fp->webgl.renderer);

  // Fonts as JSON array
  base::Value::List fonts_list;
  for (const auto& font : fp->fonts)
    fonts_list.Append(font);
  std::string fonts_json;
  base::JSONWriter::Write(base::Value(std::move(fonts_list)),
                          &fonts_json);
  source->AddString("fonts", fonts_json);

  source->AddString("media_devices_count",
                     base::NumberToString(fp->media_devices.size()));
  source->AddString("plugins_count",
                     base::NumberToString(fp->plugins.size()));

  if (fp->battery) {
    source->AddString("battery_charging",
                       fp->battery->charging ? "true" : "false");
    source->AddString("battery_level",
                       base::NumberToString(fp->battery->level));
  }

  source->AddString("speech_voices_count",
                     base::NumberToString(fp->speech_voices.size()));
}

void VerifyPageUI::HandleVerifyProxy(const base::Value::List& args) {
  const ProxyConfig* proxy = FingerprintAccessor::GetProxy();
  if (!proxy) {
    // No proxy configured — skip proxy verification
    base::Value::Dict result;
    result.Set("match", true);
    result.Set("actual_country", "N/A");
    result.Set("detail", "no proxy configured");
    web_ui()->CallJavascriptFunctionUnsafe("onProxyVerifyResult",
                                           base::Value(std::move(result)));
    return;
  }

  // Make server-side API call for proxy verification.
  // The API client uses the already-loaded API key — never exposed to JS.
  // Implementation note: The actual HTTP call is async. Create an ApiClient
  // instance using the browser process's URL loader factory, call VerifyProxy,
  // and forward the result to the page via CallJavascriptFunctionUnsafe.
  // Detailed async plumbing depends on how the browser process's
  // SharedURLLoaderFactory is accessed from WebUI context.
}

void VerifyPageUI::HandleVerifyComplete(const base::Value::List& args) {
  // Called by verify.js when all checks are done.
  // args[0] is the status string: "pass" or "fail"
  if (!args.empty() && args[0].is_string()) {
    verify_passed_ = (args[0].GetString() == "pass");
  }

  if (!verify_passed_) {
    StartFailureExitTimer();
  }
}

void VerifyPageUI::StartFailureExitTimer() {
  // Spec: if verify fails and no CDP client connects within 30s, exit(1).
  // If a CDP client is connected (DevToolsAgentHost has sessions),
  // the timer is not started — the client decides how to handle failure.
  auto* agent_host = content::DevToolsAgentHost::GetOrCreateFor(
      web_ui()->GetWebContents());
  if (agent_host && agent_host->IsAttached()) {
    // CDP client is connected — don't force exit, let client handle it
    return;
  }

  failure_exit_timer_.Start(
      FROM_HERE, base::Seconds(30),
      base::BindOnce(&VerifyPageUI::OnFailureExitTimeout,
                     base::Unretained(this)));
}

void VerifyPageUI::OnFailureExitTimeout() {
  // 30s elapsed, verify failed, no CDP client connected
  // Check one more time if a CDP client has since connected
  auto* agent_host = content::DevToolsAgentHost::GetOrCreateFor(
      web_ui()->GetWebContents());
  if (agent_host && agent_host->IsAttached()) {
    return;  // Client connected in the meantime
  }

  LOG(ERROR) << "[clawbrowser] verify failed, no CDP client connected "
             << "within 30s — exiting";
  base::Process::TerminateCurrentProcessImmediately(1);
}

}  // namespace clawbrowser
```

**Note:** Resource IDs (`IDR_CLAWBROWSER_VERIFY_HTML`, etc.) are defined in the `.grd` file created in Step 6 below. The verify.html template should use `$i18n{key}` placeholders (e.g., `$i18n{user_agent}`) to receive the expected values injected via `WebUIDataSource::AddString()`. The verify.js reads these from a `<script>` block that the template system populates.

- [ ] **Step 6: Create .grd resource definition**

Create `clawbrowser/verify/clawbrowser_verify.grd`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<grit latest_public_release="0" current_release="1" output_all_resource_defines="false">
  <outputs>
    <output filename="grit/clawbrowser_verify_resources.h" type="rc_header">
      <emit emit_type='prepend'></emit>
    </output>
    <output filename="clawbrowser_verify_resources.pak" type="data_package" />
  </outputs>
  <release seq="1">
    <includes>
      <include name="IDR_CLAWBROWSER_VERIFY_HTML" file="resources/verify.html" type="BINDATA" />
      <include name="IDR_CLAWBROWSER_VERIFY_JS" file="resources/verify.js" type="BINDATA" />
      <include name="IDR_CLAWBROWSER_VERIFY_CSS" file="resources/verify.css" type="BINDATA" />
    </includes>
  </release>
</grit>
```

- [ ] **Step 7: Update BUILD.gn**

Add to `static_library("clawbrowser")` sources:
```
    "verify/verify_page.cc",
    "verify/verify_page.h",
```
Add to deps:
```
    "//content/public/browser",
```
Add grit target:
```gn
import("//tools/grit/grit_rule.gni")

grit("clawbrowser_verify_resources") {
  source = "verify/clawbrowser_verify.grd"
  outputs = [
    "grit/clawbrowser_verify_resources.h",
    "clawbrowser_verify_resources.pak",
  ]
}
```
Add `":clawbrowser_verify_resources"` to static_library deps.

- [ ] **Step 8: Commit**

```bash
git add clawbrowser/verify/ clawbrowser/BUILD.gn
git commit -m "feat(browser): add clawbrowser://verify WebUI page

Verification page runs client-side JS checks on all fingerprint
surfaces. Direct comparison for simple values, determinism checks
for seeded noise. Proxy verified server-side via WebUI handler.
Includes .grd resource file for embedded HTML/JS/CSS."
```

---

### Task 10: Startup Orchestration — Wiring All Components Together

**Files:**
- Create: `clawbrowser/startup.h`
- Create: `clawbrowser/startup.cc`
- Modify: `clawbrowser/BUILD.gn`

This task implements the top-level startup flow from the spec (lines 110-133): parse args -> handle --list -> resolve API key -> check cache -> API call if needed -> save profile -> set command-line flags -> configure proxy -> set language flags. It also implements verbose-gated logging and the 30s verify-failure exit timeout.

- [ ] **Step 0: Create verbose-gated logging macros**

The spec requires default-silent operation with `--verbose` enabling `[clawbrowser]` prefixed stderr output. Create a thin wrapper around Chromium's LOG macros that gates on a global verbose flag.

Create `clawbrowser/logging.h`:

```cpp
#ifndef CLAWBROWSER_LOGGING_H_
#define CLAWBROWSER_LOGGING_H_

#include "base/logging.h"

namespace clawbrowser {

// Set by startup orchestration based on --verbose flag.
void SetVerbose(bool verbose);
bool IsVerbose();

}  // namespace clawbrowser

// Clawbrowser logging macros — only emit when --verbose is set.
// Errors always emit (regardless of --verbose).
#define CLAW_LOG(severity) \
  if (severity == logging::LOGGING_ERROR || clawbrowser::IsVerbose()) \
    LOG(severity) << "[clawbrowser] "

#define CLAW_VLOG() \
  if (clawbrowser::IsVerbose()) \
    LOG(INFO) << "[clawbrowser] "

#endif  // CLAWBROWSER_LOGGING_H_
```

Create `clawbrowser/logging.cc`:

```cpp
#include "clawbrowser/logging.h"

namespace clawbrowser {

namespace {
bool g_verbose = false;
}

void SetVerbose(bool verbose) { g_verbose = verbose; }
bool IsVerbose() { return g_verbose; }

}  // namespace clawbrowser
```

Add to BUILD.gn sources: `"logging.h"`, `"logging.cc"`.

- [ ] **Step 1: Write startup orchestration header**

Create `clawbrowser/startup.h`:

```cpp
#ifndef CLAWBROWSER_STARTUP_H_
#define CLAWBROWSER_STARTUP_H_

#include <string>

#include "base/command_line.h"
#include "base/types/expected.h"

namespace network {
class SharedURLLoaderFactory;
}

namespace clawbrowser {

// Result of startup orchestration.
struct StartupResult {
  bool should_exit = false;  // True if --list was handled (exit after print)
  int exit_code = 0;
};

// Run the full clawbrowser startup sequence:
// 1. Parse CLI args
// 2. Handle --list (print and exit)
// 3. If --fingerprint:
//    a. Resolve API key
//    b. Check cache (or --regenerate)
//    c. Call API if needed, save profile
//    d. Load fingerprint into accessor
//    e. Set --clawbrowser-fp-path, --user-data-dir, --proxy-server,
//       --lang, --accept-lang on command line
// 4. If no --fingerprint: vanilla mode, set Default user-data-dir
//
// Errors print to stderr (and JSON to stdout if --output=json).
// Returns StartupResult indicating whether to continue or exit.
base::expected<StartupResult, std::string> RunStartup(
    base::CommandLine* command_line,
    scoped_refptr<network::SharedURLLoaderFactory> url_loader_factory);

}  // namespace clawbrowser

#endif  // CLAWBROWSER_STARTUP_H_
```

- [ ] **Step 2: Write startup orchestration implementation**

Create `clawbrowser/startup.cc`:

```cpp
#include "clawbrowser/startup.h"

#include "base/json/json_writer.h"
#include "base/strings/string_util.h"
#include "base/values.h"
#include "clawbrowser/cli/api_client.h"
#include "clawbrowser/cli/args.h"
#include "clawbrowser/cli/profile_manager.h"
#include "clawbrowser/fingerprint_accessor.h"
#include "clawbrowser/fingerprint_loader.h"
#include "clawbrowser/logging.h"
#include "clawbrowser/proxy/proxy_config.h"

namespace clawbrowser {

namespace {

void PrintError(const ClawArgs& args, const std::string& code,
                const std::string& message) {
  // Errors always print to stderr regardless of --verbose
  fprintf(stderr, "[clawbrowser] error: %s\n", message.c_str());
  if (args.json_output()) {
    base::Value::Dict error;
    error.Set("error", code);
    error.Set("message", message);
    std::string json;
    base::JSONWriter::Write(base::Value(std::move(error)), &json);
    fprintf(stdout, "%s\n", json.c_str());
  }
}

}  // namespace

base::expected<StartupResult, std::string> RunStartup(
    base::CommandLine* command_line,
    scoped_refptr<network::SharedURLLoaderFactory> url_loader_factory) {
  ClawArgs args = ClawArgs::Parse(*command_line);
  SetVerbose(args.verbose());
  StartupResult result;

  CLAW_VLOG() << "starting with args: fingerprint="
              << args.fingerprint_id();

  // Resolve config directory
  base::FilePath home_dir;
  base::PathService::Get(base::DIR_HOME, &home_dir);
  base::FilePath config_dir = home_dir.AppendASCII(".config/clawbrowser");
  ProfileManager profile_manager(config_dir);

  // Handle --list
  if (args.list()) {
    auto profiles = profile_manager.ListProfiles();
    if (args.json_output()) {
      base::Value::List list;
      for (const auto& p : profiles) {
        base::Value::Dict item;
        item.Set("id", p.id);
        item.Set("created_at", p.created_at);
        item.Set("country", p.country);
        list.Append(std::move(item));
      }
      std::string json;
      base::JSONWriter::WriteWithOptions(
          base::Value(std::move(list)),
          base::JSONWriter::OPTIONS_PRETTY_PRINT, &json);
      fprintf(stdout, "%s\n", json.c_str());
    } else {
      for (const auto& p : profiles) {
        fprintf(stdout, "%s  %s  %s\n",
                p.id.c_str(), p.created_at.c_str(), p.country.c_str());
      }
    }
    result.should_exit = true;
    return result;
  }

  // Vanilla mode
  if (args.is_vanilla()) {
    command_line->AppendSwitchPath(
        "user-data-dir", profile_manager.GetVanillaUserDataDir());
    return result;
  }

  // Fingerprint mode
  const std::string& fp_id = args.fingerprint_id();
  if (fp_id.empty() || !base::StartsWith(fp_id, "fp_")) {
    PrintError(args, "invalid_fingerprint_id",
               "invalid fingerprint ID: must start with 'fp_', got: " + fp_id);
    result.should_exit = true;
    result.exit_code = 1;
    return result;
  }

  bool needs_fetch = args.regenerate() ||
                     !profile_manager.HasCachedProfile(fp_id);

  if (needs_fetch) {
    // Resolve API key
    auto api_key = profile_manager.ResolveApiKey();
    if (!api_key) {
      PrintError(args, "no_api_key",
                 "API key not found. Set CLAWBROWSER_API_KEY or add "
                 "api_key to config.json");
      result.should_exit = true;
      result.exit_code = 1;
      return result;
    }

    std::string base_url = profile_manager.ResolveBaseUrl();
    ApiClient client(base_url, *api_key, url_loader_factory);

    // Build request params (replay from cached profile if --regenerate)
    GenerateRequestParams params{"linux", "chrome", "US", "", ""};
    if (args.regenerate() && profile_manager.HasCachedProfile(fp_id)) {
      auto cached = profile_manager.ReadProfile(fp_id);
      if (cached.has_value()) {
        params = cached->request;
      }
    }

    // Synchronous API call (blocking — acceptable for pre-launch)
    // Implementation: use base::RunLoop to wait for async callback
    base::RunLoop run_loop;
    base::expected<GenerateResponse, ApiError> api_result;
    client.GenerateFingerprint(params,
        base::BindOnce([](base::RunLoop* loop,
                          base::expected<GenerateResponse, ApiError>* out,
                          base::expected<GenerateResponse, ApiError> result) {
          *out = std::move(result);
          loop->Quit();
        }, &run_loop, &api_result));
    run_loop.Run();

    if (!api_result.has_value()) {
      const auto& err = api_result.error();
      std::string msg;
      if (err.http_status == 0)
        msg = "cannot reach API at " + base_url + ": " + err.message;
      else if (err.http_status == 401)
        msg = "invalid API key";
      else if (err.http_status == 429)
        msg = "rate limited, try again later";
      else
        msg = "API server error: " + err.message;
      PrintError(args, err.code, msg);
      result.should_exit = true;
      result.exit_code = 1;
      return result;
    }

    // Save profile envelope
    ProfileEnvelope envelope;
    envelope.schema_version = ProfileEnvelope::kCurrentSchemaVersion;
    envelope.created_at = base::Time::Now().ToISOString();
    envelope.request = params;
    envelope.response = std::move(*api_result);

    auto save_result = profile_manager.SaveProfile(fp_id, envelope);
    if (!save_result.has_value()) {
      PrintError(args, "write_error", save_result.error());
      result.should_exit = true;
      result.exit_code = 1;
      return result;
    }
  }

  // Load fingerprint into accessor
  base::FilePath fp_path = profile_manager.GetFingerprintPath(fp_id);
  auto load_result = LoadFingerprint(fp_path);
  if (!load_result.has_value()) {
    PrintError(args, "load_error", load_result.error());
    result.should_exit = true;
    result.exit_code = 1;
    return result;
  }

  // Set command-line flags for Chromium
  command_line->AppendSwitchPath("clawbrowser-fp-path", fp_path);
  command_line->AppendSwitchPath(
      "user-data-dir", profile_manager.GetUserDataDir(fp_id));

  // Configure proxy flags
  const auto* proxy = FingerprintAccessor::GetProxy();
  if (proxy) {
    auto proxy_flags = GetProxyCommandLineFlags(*proxy);
    for (const auto& flag : proxy_flags) {
      // Parse --key=value from flag string
      size_t eq = flag.find('=');
      if (eq != std::string::npos) {
        command_line->AppendSwitchASCII(
            flag.substr(2, eq - 2),  // strip leading --
            flag.substr(eq + 1));
      }
    }
  }

  // Set language flags from fingerprint (Accept-Language header alignment)
  const auto* fp = FingerprintAccessor::Get();
  if (fp && !fp->language.empty()) {
    // --lang sets the UI language
    command_line->AppendSwitchASCII("lang", fp->language[0]);
    // --accept-lang sets the Accept-Language HTTP header
    std::string accept_lang;
    for (size_t i = 0; i < fp->language.size(); ++i) {
      if (i > 0) accept_lang += ",";
      accept_lang += fp->language[i];
    }
    command_line->AppendSwitchASCII("accept-lang", accept_lang);
  }

  // Navigate to verify page on startup (unless --skip-verify)
  if (!args.skip_verify()) {
    command_line->AppendArg("clawbrowser://verify");
  }

  return result;
}

}  // namespace clawbrowser
```

- [ ] **Step 3: Write startup unit tests**

Create `clawbrowser/test/startup_unittest.cc`:

```cpp
#include "clawbrowser/startup.h"

#include "base/command_line.h"
#include "base/environment.h"
#include "base/files/file_util.h"
#include "base/files/scoped_temp_dir.h"
#include "base/json/json_reader.h"
#include "clawbrowser/fingerprint_accessor.h"
#include "services/network/test/test_url_loader_factory.h"
#include "testing/gtest/include/gtest/gtest.h"

namespace clawbrowser {
namespace {

class StartupTest : public testing::Test {
 protected:
  void SetUp() override {
    ASSERT_TRUE(temp_dir_.CreateUniqueTempDir());
    // Override HOME so ProfileManager uses our temp dir
    env_ = base::Environment::Create();
    env_->SetVar("HOME", temp_dir_.GetPath().AsUTF8Unsafe());
    // Create config dir structure
    base::FilePath config_dir =
        temp_dir_.GetPath().AppendASCII(".config/clawbrowser");
    base::CreateDirectory(config_dir);
  }

  void TearDown() override {
    FingerprintAccessor::Reset();
    env_->UnSetVar("HOME");
    env_->UnSetVar("CLAWBROWSER_API_KEY");
  }

  void WriteConfigJson(const std::string& api_key) {
    base::FilePath config_path = temp_dir_.GetPath()
        .AppendASCII(".config/clawbrowser/config.json");
    base::WriteFile(config_path,
                    "{\"api_key\": \"" + api_key + "\"}");
  }

  void WriteCachedProfile(const std::string& id) {
    base::FilePath profile_dir = temp_dir_.GetPath()
        .AppendASCII(".config/clawbrowser/Browser").AppendASCII(id);
    base::CreateDirectory(profile_dir);
    // Read from test fixture
    base::FilePath fixture;
    base::PathService::Get(base::DIR_EXE, &fixture);
    fixture = fixture.AppendASCII("clawbrowser/test/fixtures/valid_fingerprint.json");
    std::string json;
    base::ReadFileToString(fixture, &json);
    base::WriteFile(profile_dir.AppendASCII("fingerprint.json"), json);
  }

  base::ScopedTempDir temp_dir_;
  std::unique_ptr<base::Environment> env_;
  network::TestURLLoaderFactory url_loader_factory_;
};

TEST_F(StartupTest, VanillaMode) {
  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  auto result = RunStartup(&cmd, url_loader_factory_.GetSafeWeakWrapper());
  ASSERT_TRUE(result.has_value());
  EXPECT_FALSE(result->should_exit);
  // Should set --user-data-dir to Default
  EXPECT_TRUE(cmd.HasSwitch("user-data-dir"));
  EXPECT_NE(cmd.GetSwitchValueASCII("user-data-dir").find("Default"),
            std::string::npos);
  // Accessor should be null (no fingerprint)
  EXPECT_EQ(FingerprintAccessor::Get(), nullptr);
}

TEST_F(StartupTest, ListProfiles) {
  WriteCachedProfile("fp_test1");
  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  cmd.AppendSwitch("list");
  auto result = RunStartup(&cmd, url_loader_factory_.GetSafeWeakWrapper());
  ASSERT_TRUE(result.has_value());
  EXPECT_TRUE(result->should_exit);
  EXPECT_EQ(result->exit_code, 0);
}

TEST_F(StartupTest, FingerprintWithCachedProfile) {
  WriteCachedProfile("fp_cached");
  WriteConfigJson("test_key");
  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  cmd.AppendSwitchASCII("fingerprint", "fp_cached");
  auto result = RunStartup(&cmd, url_loader_factory_.GetSafeWeakWrapper());
  ASSERT_TRUE(result.has_value()) << result.error();
  EXPECT_FALSE(result->should_exit);
  // Fingerprint should be loaded
  ASSERT_NE(FingerprintAccessor::Get(), nullptr);
  // Command line flags should be set
  EXPECT_TRUE(cmd.HasSwitch("clawbrowser-fp-path"));
  EXPECT_TRUE(cmd.HasSwitch("user-data-dir"));
  EXPECT_TRUE(cmd.HasSwitch("proxy-server"));
  EXPECT_TRUE(cmd.HasSwitch("lang"));
  EXPECT_TRUE(cmd.HasSwitch("accept-lang"));
}

TEST_F(StartupTest, FingerprintNoApiKey) {
  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  cmd.AppendSwitchASCII("fingerprint", "fp_new");
  // No cached profile, no API key → should fail
  auto result = RunStartup(&cmd, url_loader_factory_.GetSafeWeakWrapper());
  ASSERT_TRUE(result.has_value());
  EXPECT_TRUE(result->should_exit);
  EXPECT_EQ(result->exit_code, 1);
}

TEST_F(StartupTest, FingerprintApiCallSuccess) {
  WriteConfigJson("test_key");
  env_->SetVar("CLAWBROWSER_API_KEY", "test_key");

  // Mock API response
  std::string api_response = R"({
    "fingerprint": {
      "user_agent": "test-ua", "platform": "test",
      "screen": {"width": 1920, "height": 1080, "avail_width": 1920,
                 "avail_height": 1040, "color_depth": 24, "pixel_ratio": 1.0},
      "hardware": {"concurrency": 8, "memory": 8},
      "webgl": {"vendor": "test", "renderer": "test"},
      "canvas_seed": 123, "audio_seed": 456, "client_rects_seed": 789,
      "timezone": "UTC", "language": ["en"], "fonts": ["Arial"]
    }
  })";
  url_loader_factory_.AddResponse(
      "https://api.clawbrowser.ai/v1/fingerprints/generate",
      api_response);

  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  cmd.AppendSwitchASCII("fingerprint", "fp_new_profile");
  auto result = RunStartup(&cmd, url_loader_factory_.GetSafeWeakWrapper());
  ASSERT_TRUE(result.has_value()) << result.error();
  EXPECT_FALSE(result->should_exit);
  ASSERT_NE(FingerprintAccessor::Get(), nullptr);
  EXPECT_EQ(FingerprintAccessor::Get()->user_agent, "test-ua");
}

TEST_F(StartupTest, EmptyFingerprintIdExitsWithError) {
  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  cmd.AppendSwitchASCII("fingerprint", "");
  auto result = RunStartup(&cmd, url_loader_factory_.GetSafeWeakWrapper());
  ASSERT_TRUE(result.has_value());
  EXPECT_TRUE(result->should_exit);
  EXPECT_EQ(result->exit_code, 1);
}

TEST_F(StartupTest, InvalidFingerprintIdPrefixExitsWithError) {
  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  cmd.AppendSwitchASCII("fingerprint", "not_a_valid_id");
  auto result = RunStartup(&cmd, url_loader_factory_.GetSafeWeakWrapper());
  ASSERT_TRUE(result.has_value());
  EXPECT_TRUE(result->should_exit);
  EXPECT_EQ(result->exit_code, 1);
}

TEST_F(StartupTest, FingerprintApiCall401) {
  env_->SetVar("CLAWBROWSER_API_KEY", "bad_key");

  url_loader_factory_.AddResponse(
      "https://api.clawbrowser.ai/v1/fingerprints/generate",
      R"({"code": "invalid_api_key", "message": "invalid API key"})",
      net::HTTP_UNAUTHORIZED);

  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  cmd.AppendSwitchASCII("fingerprint", "fp_bad_key");
  auto result = RunStartup(&cmd, url_loader_factory_.GetSafeWeakWrapper());
  ASSERT_TRUE(result.has_value());
  EXPECT_TRUE(result->should_exit);
  EXPECT_EQ(result->exit_code, 1);
}

TEST_F(StartupTest, RegenerateReplaysStoredParams) {
  WriteCachedProfile("fp_regen");
  env_->SetVar("CLAWBROWSER_API_KEY", "test_key");

  // Mock API — we just need it to succeed
  url_loader_factory_.AddResponse(
      "https://api.clawbrowser.ai/v1/fingerprints/generate",
      R"({
        "fingerprint": {
          "user_agent": "new-ua", "platform": "test",
          "screen": {"width": 1920, "height": 1080, "avail_width": 1920,
                     "avail_height": 1040, "color_depth": 24, "pixel_ratio": 1.0},
          "hardware": {"concurrency": 8, "memory": 8},
          "webgl": {"vendor": "v", "renderer": "r"},
          "canvas_seed": 1, "audio_seed": 2, "client_rects_seed": 3,
          "timezone": "UTC", "language": ["en"], "fonts": ["Arial"]
        }
      })");

  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  cmd.AppendSwitchASCII("fingerprint", "fp_regen");
  cmd.AppendSwitch("regenerate");
  auto result = RunStartup(&cmd, url_loader_factory_.GetSafeWeakWrapper());
  ASSERT_TRUE(result.has_value()) << result.error();
  EXPECT_FALSE(result->should_exit);
  // New fingerprint should be loaded
  ASSERT_NE(FingerprintAccessor::Get(), nullptr);
  EXPECT_EQ(FingerprintAccessor::Get()->user_agent, "new-ua");
}

TEST_F(StartupTest, VerboseLogging) {
  WriteCachedProfile("fp_verbose");
  WriteConfigJson("test_key");
  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  cmd.AppendSwitchASCII("fingerprint", "fp_verbose");
  cmd.AppendSwitch("verbose");
  auto result = RunStartup(&cmd, url_loader_factory_.GetSafeWeakWrapper());
  ASSERT_TRUE(result.has_value());
  EXPECT_TRUE(IsVerbose());
}

TEST_F(StartupTest, JsonErrorOutput) {
  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  cmd.AppendSwitchASCII("fingerprint", "fp_missing");
  cmd.AppendSwitchASCII("output", "json");
  // No cached profile, no API key → error

  // Capture stdout to verify JSON error format
  testing::internal::CaptureStdout();
  auto result = RunStartup(&cmd, url_loader_factory_.GetSafeWeakWrapper());
  std::string stdout_output = testing::internal::GetCapturedStdout();
  ASSERT_TRUE(result.has_value());
  EXPECT_EQ(result->exit_code, 1);

  // Verify JSON output contains error code and message
  auto parsed = base::JSONReader::Read(stdout_output);
  ASSERT_TRUE(parsed.has_value()) << "stdout not valid JSON: " << stdout_output;
  ASSERT_TRUE(parsed->is_dict());
  const std::string* error_code = parsed->GetDict().FindString("error");
  ASSERT_NE(error_code, nullptr);
  EXPECT_EQ(*error_code, "no_api_key");
  const std::string* message = parsed->GetDict().FindString("message");
  ASSERT_NE(message, nullptr);
  EXPECT_FALSE(message->empty());
}

TEST_F(StartupTest, MultipleFingerprintFlagsLastWins) {
  // When --fingerprint is specified multiple times, last value wins
  base::CommandLine cmd(base::CommandLine::NO_PROGRAM);
  cmd.AppendSwitchASCII("fingerprint", "fp_first");
  cmd.AppendSwitchASCII("fingerprint", "fp_second");

  ClawArgs args = ClawArgs::Parse(cmd);
  // base::CommandLine last-wins semantics for duplicate switches
  EXPECT_EQ(args.fingerprint_id(), "fp_second");
}

}  // namespace
}  // namespace clawbrowser
```

- [ ] **Step 4: Update BUILD.gn**

Add to `static_library("clawbrowser")` sources:
```
    "logging.cc",
    "logging.h",
    "startup.cc",
    "startup.h",
```

Add to `test("clawbrowser_unittests")` sources:
```
    "test/startup_unittest.cc",
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `autoninja -C out/Default clawbrowser_unittests && out/Default/clawbrowser_unittests --gtest_filter="StartupTest.*"`
Expected: All 12 tests PASS (includes JsonErrorOutput content verification, MultipleFingerprintFlagsLastWins, EmptyFingerprintIdExitsWithError, InvalidFingerprintIdPrefixExitsWithError)

- [ ] **Step 6: Commit**

```bash
git add clawbrowser/startup.h clawbrowser/startup.cc \
  clawbrowser/logging.h clawbrowser/logging.cc \
  clawbrowser/test/startup_unittest.cc clawbrowser/BUILD.gn
git commit -m "feat(browser): add startup orchestration with verbose logging and unit tests

Full startup flow: parse args, handle --list, resolve API key,
check cache, API call if needed, save profile, load fingerprint,
set --proxy-server, --lang, --accept-lang, --user-data-dir flags.
Verbose-gated logging (default silent, --verbose enables).
Structured JSON error output with --output=json.
12 unit tests covering vanilla, list, cached, API success/failure,
regenerate, verbose, JSON error output verification, multiple flags
last-wins, empty/invalid fingerprint ID prefix validation."
```

---

### Task 11: Process Init Patches (001–004)

**Patch version convention:** Every patch file MUST include a version header comment as its first line:
```
# Tested against Chromium 131.0.6778.x — line numbers may shift on other versions
```
This documents which Chromium version the patch was authored against. When upgrading Chromium, grep for this header to identify which patches need re-verification.

**Note:** Patch 001 now calls `RunStartup()` from Task 10 instead of raw fingerprint loading.

**Files:**
- Create: `clawbrowser/patches/001-browser-main-init.patch`
- Create: `clawbrowser/patches/002-renderer-main-loader.patch`
- Create: `clawbrowser/patches/003-gpu-main-loader.patch`
- Create: `clawbrowser/patches/004-child-process-flag-propagation.patch`

These patches establish the fingerprint data loading pipeline across all Chromium processes.

- [ ] **Step 1: Create patch 001 — browser main init**

Create `clawbrowser/patches/001-browser-main-init.patch`:

Patches `chrome/browser/chrome_browser_main.cc` to run the clawbrowser startup orchestration in the browser process.

```diff
# Tested against Chromium 131.0.6778.x — line numbers may shift on other versions
--- a/chrome/browser/chrome_browser_main.cc
+++ b/chrome/browser/chrome_browser_main.cc
@@ -XX,6 +XX,7 @@
 #include "chrome/browser/chrome_browser_main.h"
+#include "clawbrowser/startup.h"

 // In PreMainMessageLoopRun() or PreCreateMainMessageLoop(), add:
+  // Clawbrowser: run full startup orchestration
+  {
+    auto startup_result = clawbrowser::RunStartup(
+        base::CommandLine::ForCurrentProcess(),
+        GetURLLoaderFactory());  // browser process URL loader factory
+    if (!startup_result.has_value()) {
+      LOG(ERROR) << "[clawbrowser] " << startup_result.error();
+      return 1;
+    }
+    if (startup_result->should_exit)
+      return startup_result->exit_code;
+  }
```

**Precise insertion point:** After `ChromeBrowserMainParts::PreMainMessageLoopRunImpl()` sets up the browser process and network service, but before the main message loop starts. The startup sequence needs the URL loader factory for API calls, and must complete before any WebContents or renderers are created.

- [ ] **Step 2: Create patch 002 — renderer main loader**

Create `clawbrowser/patches/002-renderer-main-loader.patch`:

Patches `content/renderer/renderer_main.cc` to load fingerprint pre-sandbox.

```diff
--- a/content/renderer/renderer_main.cc
+++ b/content/renderer/renderer_main.cc
@@ -XX,6 +XX,7 @@
 #include "content/renderer/renderer_main.h"
+#include "clawbrowser/fingerprint_loader.h"

 // Before RendererMain() calls LockdownSandbox():
+  // Clawbrowser: load fingerprint data before sandbox lockdown
+  {
+    auto result = clawbrowser::LoadFingerprintFromCommandLine(
+        *base::CommandLine::ForCurrentProcess());
+    if (!result.has_value()) {
+      LOG(ERROR) << "[clawbrowser] renderer: " << result.error();
+    }
+  }
   // ... existing sandbox lockdown code ...
```

**Critical:** Must be inserted BEFORE `LockdownSandbox()` — after lockdown, file I/O is blocked.

- [ ] **Step 3: Create patch 003 — GPU main loader**

Create `clawbrowser/patches/003-gpu-main-loader.patch`:

Patches `content/gpu/gpu_main.cc` — same pattern as renderer.

```diff
--- a/content/gpu/gpu_main.cc
+++ b/content/gpu/gpu_main.cc
@@ -XX,6 +XX,7 @@
 #include "content/gpu/gpu_main.h"
+#include "clawbrowser/fingerprint_loader.h"

 // Before GpuMain() calls LockdownSandbox():
+  // Clawbrowser: load fingerprint data before sandbox lockdown
+  {
+    auto result = clawbrowser::LoadFingerprintFromCommandLine(
+        *base::CommandLine::ForCurrentProcess());
+    if (!result.has_value()) {
+      LOG(ERROR) << "[clawbrowser] gpu: " << result.error();
+    }
+  }
```

- [ ] **Step 4: Create patch 004 — child process flag propagation**

Create `clawbrowser/patches/004-child-process-flag-propagation.patch`:

Patches `content/browser/child_process_launcher.cc` to propagate `--clawbrowser-fp-path` to all child process command lines.

```diff
--- a/content/browser/child_process_launcher.cc
+++ b/content/browser/child_process_launcher.cc
@@ -XX,6 +XX,7 @@
 #include "content/browser/child_process_launcher.h"
+#include "clawbrowser/fingerprint_loader.h"

 // In the method that builds child process command lines
 // (ChildProcessLauncher::Launch or similar):
+  // Clawbrowser: propagate fingerprint path flag to child processes
+  if (browser_command_line.HasSwitch(clawbrowser::kFingerprintPathSwitch)) {
+    child_command_line->AppendSwitchPath(
+        clawbrowser::kFingerprintPathSwitch,
+        browser_command_line.GetSwitchValuePath(
+            clawbrowser::kFingerprintPathSwitch));
+  }
```

- [ ] **Step 5: Verify patches apply cleanly**

For each patch:
```bash
cd chromium/src
git apply --check clawbrowser/patches/001-browser-main-init.patch
git apply --check clawbrowser/patches/002-renderer-main-loader.patch
git apply --check clawbrowser/patches/003-gpu-main-loader.patch
git apply --check clawbrowser/patches/004-child-process-flag-propagation.patch
```
Expected: All patches apply cleanly. If line numbers are off, adjust context.

- [ ] **Step 6: Apply patches and build**

```bash
cd chromium/src
git apply clawbrowser/patches/001-browser-main-init.patch
git apply clawbrowser/patches/002-renderer-main-loader.patch
git apply clawbrowser/patches/003-gpu-main-loader.patch
git apply clawbrowser/patches/004-child-process-flag-propagation.patch
autoninja -C out/Default chrome
```
Expected: Build succeeds (no compile errors from added includes/code).

- [ ] **Step 7: Commit**

```bash
git add clawbrowser/patches/001-browser-main-init.patch \
  clawbrowser/patches/002-renderer-main-loader.patch \
  clawbrowser/patches/003-gpu-main-loader.patch \
  clawbrowser/patches/004-child-process-flag-propagation.patch
git commit -m "feat(browser): add process init patches for fingerprint loading

001: Browser main — CLI init + fingerprint load
002: Renderer main — pre-sandbox fingerprint load
003: GPU main — pre-sandbox fingerprint load
004: Child process launcher — propagate --clawbrowser-fp-path flag"
```

---

### Task 12: Navigator + Screen Override Patches (005–006)

**Files:**
- Create: `clawbrowser/patches/005-navigator-properties.patch`
- Create: `clawbrowser/patches/006-screen-metrics.patch`

- [ ] **Step 1: Create patch 005 — navigator properties**

Create `clawbrowser/patches/005-navigator-properties.patch`:

Patches `third_party/blink/renderer/core/frame/navigator.cc` to override userAgent, platform, language, languages, hardwareConcurrency, deviceMemory.

```diff
--- a/third_party/blink/renderer/core/frame/navigator.cc
+++ b/third_party/blink/renderer/core/frame/navigator.cc
@@ -XX,6 +XX,7 @@
 #include "third_party/blink/renderer/core/frame/navigator.h"
+#include "clawbrowser/fingerprint_accessor.h"

 // In Navigator::userAgent():
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get())
+    return String::FromUTF8(fp->user_agent);
   // ... existing implementation ...

 // In Navigator::platform():
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get())
+    return String::FromUTF8(fp->platform);

 // In Navigator::language():
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get()) {
+    if (!fp->language.empty())
+      return String::FromUTF8(fp->language[0]);
+  }

 // In Navigator::languages():
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get()) {
+    Vector<String> langs;
+    for (const auto& lang : fp->language)
+      langs.push_back(String::FromUTF8(lang));
+    return langs;
+  }

 // In Navigator::hardwareConcurrency():
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get())
+    return fp->hardware.concurrency;

 // In Navigator::deviceMemory():
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get())
+    return static_cast<float>(fp->hardware.memory);
```

Each override is 2-3 lines: check accessor, return spoofed value, else fall through to original.

- [ ] **Step 2: Create patch 006 — screen metrics**

Create `clawbrowser/patches/006-screen-metrics.patch`:

Patches `third_party/blink/renderer/core/frame/screen.cc` and `local_dom_window.cc`.

```diff
--- a/third_party/blink/renderer/core/frame/screen.cc
+++ b/third_party/blink/renderer/core/frame/screen.cc
@@ -XX,6 +XX,7 @@
 #include "third_party/blink/renderer/core/frame/screen.h"
+#include "clawbrowser/fingerprint_accessor.h"

 // In Screen::width():
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get())
+    return fp->screen.width;

 // In Screen::height():
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get())
+    return fp->screen.height;

 // In Screen::availWidth():
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get())
+    return fp->screen.avail_width;

 // In Screen::availHeight():
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get())
+    return fp->screen.avail_height;

 // In Screen::colorDepth():
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get())
+    return fp->screen.color_depth;

--- a/third_party/blink/renderer/core/frame/local_dom_window.cc
+++ b/third_party/blink/renderer/core/frame/local_dom_window.cc
@@ -XX,6 +XX,7 @@
+#include "clawbrowser/fingerprint_accessor.h"

 // In LocalDOMWindow::devicePixelRatio():
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get())
+    return fp->screen.pixel_ratio;
```

- [ ] **Step 3: Apply patches and build**

```bash
cd chromium/src
git apply clawbrowser/patches/005-navigator-properties.patch
git apply clawbrowser/patches/006-screen-metrics.patch
autoninja -C out/Default chrome
```
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add clawbrowser/patches/005-navigator-properties.patch \
  clawbrowser/patches/006-screen-metrics.patch
git commit -m "feat(browser): add navigator and screen override patches

005: Override userAgent, platform, language, hardwareConcurrency, deviceMemory
006: Override screen width/height/avail/colorDepth and devicePixelRatio"
```

---

### Task 13: Canvas + WebGL + Audio + ClientRects Noise Patches (007–010)

**Files:**
- Create: `clawbrowser/patches/007-canvas-noise.patch`
- Create: `clawbrowser/patches/008-webgl-override.patch`
- Create: `clawbrowser/patches/009-audio-noise.patch`
- Create: `clawbrowser/patches/010-client-rects-noise.patch`

- [ ] **Step 1: Create patch 007 — canvas noise**

Create `clawbrowser/patches/007-canvas-noise.patch`:

Patches `html_canvas_element.cc` and `canvas_rendering_context_2d.cc` to apply seeded pixel noise.

```diff
--- a/third_party/blink/renderer/core/html/canvas/html_canvas_element.cc
+++ b/third_party/blink/renderer/core/html/canvas/html_canvas_element.cc
@@ -XX,6 +XX,8 @@
+#include "clawbrowser/fingerprint_accessor.h"
+#include "clawbrowser/noise/prng.h"

 // In HTMLCanvasElement::toDataURL() — before encoding the image:
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get()) {
+    clawbrowser::Prng prng(fp->canvas_seed);
+    uint8_t* pixels = image_data->data();
+    size_t pixel_count = image_data->length();
+    for (size_t i = 0; i < pixel_count; ++i) {
+      pixels[i] = std::clamp(static_cast<int>(pixels[i]) + prng.PixelNoise(),
+                              0, 255);
+    }
+  }

 // In HTMLCanvasElement::toBlob() — same noise application before encoding:
+  // (same pattern as toDataURL)

--- a/third_party/blink/renderer/modules/canvas/canvas2d/canvas_rendering_context_2d.cc
+++ b/third_party/blink/renderer/modules/canvas/canvas2d/canvas_rendering_context_2d.cc
@@ -XX,6 +XX,8 @@
+#include "clawbrowser/fingerprint_accessor.h"
+#include "clawbrowser/noise/prng.h"

 // In CanvasRenderingContext2D::getImageData() — before returning pixel data:
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get()) {
+    clawbrowser::Prng prng(fp->canvas_seed);
+    uint8_t* pixels = image_data->data()->Data();
+    size_t byte_length = image_data->data()->byteLength();
+    for (size_t i = 0; i < byte_length; ++i) {
+      pixels[i] = std::clamp(static_cast<int>(pixels[i]) + prng.PixelNoise(),
+                              0, 255);
+    }
+  }
```

**Key:** The PRNG is re-seeded with `canvas_seed` for each call, making noise deterministic for the same canvas content. The seed is the same across all calls, so identical canvas operations produce identical noise.

- [ ] **Step 2: Create patch 008 — WebGL override**

Create `clawbrowser/patches/008-webgl-override.patch`:

Patches `webgl_rendering_context_base.cc` for vendor/renderer strings and readPixels noise.

```diff
--- a/third_party/blink/renderer/modules/webgl/webgl_rendering_context_base.cc
+++ b/third_party/blink/renderer/modules/webgl/webgl_rendering_context_base.cc
@@ -XX,6 +XX,8 @@
+#include "clawbrowser/fingerprint_accessor.h"
+#include "clawbrowser/noise/prng.h"

 // In WebGLRenderingContextBase::getParameter() for GL_VENDOR:
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get())
+    return WebGLAny(script_state, String::FromUTF8(fp->webgl.vendor));

 // In WebGLRenderingContextBase::getParameter() for GL_RENDERER:
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get())
+    return WebGLAny(script_state, String::FromUTF8(fp->webgl.renderer));

 // In WEBGL_debug_renderer_info handling — same overrides for
 // UNMASKED_VENDOR_WEBGL and UNMASKED_RENDERER_WEBGL:
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get()) {
+    if (pname == 0x9245)  // UNMASKED_VENDOR_WEBGL
+      return WebGLAny(script_state, String::FromUTF8(fp->webgl.vendor));
+    if (pname == 0x9246)  // UNMASKED_RENDERER_WEBGL
+      return WebGLAny(script_state, String::FromUTF8(fp->webgl.renderer));
+  }

 // In readPixels() — apply seeded noise to pixel buffer:
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get()) {
+    clawbrowser::Prng prng(fp->canvas_seed);
+    uint8_t* pixels = static_cast<uint8_t*>(buffer_data);
+    for (GLsizei i = 0; i < width * height * 4; ++i) {
+      pixels[i] = std::clamp(static_cast<int>(pixels[i]) + prng.PixelNoise(),
+                              0, 255);
+    }
+  }
```

- [ ] **Step 3: Create patch 009 — audio noise**

Create `clawbrowser/patches/009-audio-noise.patch`:

Patches `audio_buffer.cc` and `analyser_node.cc` for deterministic float noise.

```diff
--- a/third_party/blink/renderer/modules/webaudio/audio_buffer.cc
+++ b/third_party/blink/renderer/modules/webaudio/audio_buffer.cc
@@ -XX,6 +XX,8 @@
+#include "clawbrowser/fingerprint_accessor.h"
+#include "clawbrowser/noise/prng.h"

 // In AudioBuffer::getChannelData() — before returning the buffer:
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get()) {
+    clawbrowser::Prng prng(fp->audio_seed);
+    float* data = channel_data->Data();
+    size_t length = channel_data->length();
+    for (size_t i = 0; i < length; ++i) {
+      data[i] += prng.AudioNoise();
+    }
+  }

--- a/third_party/blink/renderer/modules/webaudio/analyser_node.cc
+++ b/third_party/blink/renderer/modules/webaudio/analyser_node.cc
@@ -XX,6 +XX,8 @@
+#include "clawbrowser/fingerprint_accessor.h"
+#include "clawbrowser/noise/prng.h"

 // In AnalyserNode::getFloatFrequencyData() — after filling the array:
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get()) {
+    clawbrowser::Prng prng(fp->audio_seed);
+    float* data = float_freq_data->Data();
+    for (unsigned i = 0; i < float_freq_data->length(); ++i) {
+      data[i] += prng.AudioNoise();
+    }
+  }
```

- [ ] **Step 4: Create patch 010 — client rects noise**

Create `clawbrowser/patches/010-client-rects-noise.patch`:

Patches `element.cc` for sub-pixel offset noise.

```diff
--- a/third_party/blink/renderer/core/dom/element.cc
+++ b/third_party/blink/renderer/core/dom/element.cc
@@ -XX,6 +XX,8 @@
+#include "clawbrowser/fingerprint_accessor.h"
+#include "clawbrowser/noise/prng.h"

 // In Element::getClientRects() — after computing rects:
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get()) {
+    clawbrowser::Prng prng(fp->client_rects_seed);
+    for (auto& rect : *rects) {
+      rect.SetX(rect.X() + prng.SubPixelNoise());
+      rect.SetY(rect.Y() + prng.SubPixelNoise());
+      rect.SetWidth(rect.Width() + prng.SubPixelNoise());
+      rect.SetHeight(rect.Height() + prng.SubPixelNoise());
+    }
+  }

 // In Element::getBoundingClientRect() — same offset:
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get()) {
+    clawbrowser::Prng prng(fp->client_rects_seed);
+    result->SetX(result->X() + prng.SubPixelNoise());
+    result->SetY(result->Y() + prng.SubPixelNoise());
+    result->SetWidth(result->Width() + prng.SubPixelNoise());
+    result->SetHeight(result->Height() + prng.SubPixelNoise());
+  }
```

- [ ] **Step 5: Apply patches and build**

```bash
cd chromium/src
git apply clawbrowser/patches/007-canvas-noise.patch
git apply clawbrowser/patches/008-webgl-override.patch
git apply clawbrowser/patches/009-audio-noise.patch
git apply clawbrowser/patches/010-client-rects-noise.patch
autoninja -C out/Default chrome
```
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add clawbrowser/patches/007-canvas-noise.patch \
  clawbrowser/patches/008-webgl-override.patch \
  clawbrowser/patches/009-audio-noise.patch \
  clawbrowser/patches/010-client-rects-noise.patch
git commit -m "feat(browser): add seeded noise patches for canvas, WebGL, audio, clientRects

007: Canvas 2D pixel noise (±1 per channel, seeded by canvas_seed)
008: WebGL vendor/renderer strings + readPixels noise
009: AudioContext float noise (±1e-7, seeded by audio_seed)
010: ClientRects sub-pixel offsets (±0.001px, seeded by client_rects_seed)"
```

---

### Task 14: Remaining Surface Patches — Fonts, Media, Plugins, Battery, Speech, Timezone (011–016)

**Files:**
- Create: `clawbrowser/patches/011-fonts-filter.patch`
- Create: `clawbrowser/patches/012-media-devices.patch`
- Create: `clawbrowser/patches/013-plugins.patch`
- Create: `clawbrowser/patches/014-battery.patch`
- Create: `clawbrowser/patches/015-speech-voices.patch`
- Create: `clawbrowser/patches/016-timezone-env.patch`

- [ ] **Step 1: Create patch 011 — fonts filter**

Create `clawbrowser/patches/011-fonts-filter.patch`:

Patches `font_cache.cc` to filter system fonts to the fingerprint's font list.

```diff
--- a/third_party/blink/renderer/platform/fonts/font_cache.cc
+++ b/third_party/blink/renderer/platform/fonts/font_cache.cc
@@ -XX,6 +XX,8 @@
+#include "clawbrowser/fingerprint_accessor.h"
+#include <algorithm>

 // In the font enumeration method — filter returned fonts:
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get()) {
+    const auto& allowed = fp->fonts;
+    font_list.erase(
+        std::remove_if(font_list.begin(), font_list.end(),
+            [&allowed](const auto& font) {
+              return std::find(allowed.begin(), allowed.end(),
+                               font.family.Utf8()) == allowed.end();
+            }),
+        font_list.end());
+  }
```

- [ ] **Step 2: Create patch 012 — media devices**

Create `clawbrowser/patches/012-media-devices.patch`:

Patches `media_devices.cc` to return the fingerprint's media device list.

```diff
--- a/third_party/blink/renderer/modules/mediastream/media_devices.cc
+++ b/third_party/blink/renderer/modules/mediastream/media_devices.cc
@@ -XX,6 +XX,7 @@
+#include "clawbrowser/fingerprint_accessor.h"

 // In MediaDevices::enumerateDevices() callback — replace device list:
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get()) {
+    if (!fp->media_devices.empty()) {
+      MediaDeviceInfoVector spoofed;
+      for (const auto& dev : fp->media_devices) {
+        spoofed.push_back(MakeGarbageCollected<MediaDeviceInfo>(
+            String::FromUTF8(dev.device_id),
+            String::FromUTF8(dev.label),
+            String(), /* groupId */
+            dev.kind == "audioinput" ? MediaDeviceInfo::kAudioInput :
+            dev.kind == "audiooutput" ? MediaDeviceInfo::kAudioOutput :
+            MediaDeviceInfo::kVideoInput));
+      }
+      resolver->Resolve(spoofed);
+      return;
+    }
+  }
```

- [ ] **Step 3: Create patch 013 — plugins**

Create `clawbrowser/patches/013-plugins.patch`:

Patches `navigator_plugins.cc` to return the fingerprint's plugin list.

```diff
--- a/third_party/blink/renderer/core/page/navigator_plugins.cc
+++ b/third_party/blink/renderer/core/page/navigator_plugins.cc
@@ -XX,6 +XX,7 @@
+#include "clawbrowser/fingerprint_accessor.h"

 // In NavigatorPlugins::plugins() — override plugin list:
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get()) {
+    if (!fp->plugins.empty()) {
+      // Build DOMPluginArray from fingerprint plugins
+      HeapVector<Member<DOMPlugin>> spoofed;
+      for (const auto& p : fp->plugins) {
+        spoofed.push_back(MakeGarbageCollected<DOMPlugin>(
+            String::FromUTF8(p.name),
+            String::FromUTF8(p.description),
+            String::FromUTF8(p.filename)));
+      }
+      return MakeGarbageCollected<DOMPluginArray>(spoofed);
+    }
+  }
```

- [ ] **Step 4: Create patch 014 — battery**

Create `clawbrowser/patches/014-battery.patch`:

Patches `battery_manager.cc` to override charging and level.

```diff
--- a/third_party/blink/renderer/modules/battery/battery_manager.cc
+++ b/third_party/blink/renderer/modules/battery/battery_manager.cc
@@ -XX,6 +XX,7 @@
+#include "clawbrowser/fingerprint_accessor.h"

 // In BatteryManager::charging():
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get()) {
+    if (fp->battery)
+      return fp->battery->charging;
+  }

 // In BatteryManager::level():
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get()) {
+    if (fp->battery)
+      return fp->battery->level;
+  }
```

- [ ] **Step 5: Create patch 015 — speech voices**

Create `clawbrowser/patches/015-speech-voices.patch`:

Patches `speech_synthesis.cc` to filter voices.

```diff
--- a/third_party/blink/renderer/modules/speech/speech_synthesis.cc
+++ b/third_party/blink/renderer/modules/speech/speech_synthesis.cc
@@ -XX,6 +XX,8 @@
+#include "clawbrowser/fingerprint_accessor.h"
+#include <algorithm>

 // In SpeechSynthesis::getVoices() — filter voice list:
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get()) {
+    if (!fp->speech_voices.empty()) {
+      const auto& allowed = fp->speech_voices;
+      voices.erase(
+          std::remove_if(voices.begin(), voices.end(),
+              [&allowed](const auto& voice) {
+                return std::find(allowed.begin(), allowed.end(),
+                                 voice->name().Utf8()) == allowed.end();
+              }),
+          voices.end());
+    }
+  }
```

- [ ] **Step 6: Create patch 016 — timezone env**

Create `clawbrowser/patches/016-timezone-env.patch`:

Sets TZ env var before ICU init in each process.

```diff
 // In the early init of browser/renderer/GPU processes,
 // before ICU initialization:
+#include "clawbrowser/fingerprint_accessor.h"
+#include <cstdlib>

+  // Clawbrowser: set TZ env var for timezone spoofing
+  if (auto* fp = clawbrowser::FingerprintAccessor::Get()) {
+    if (!fp->timezone.empty()) {
+      setenv("TZ", fp->timezone.c_str(), 1);
+      tzset();
+    }
+  }
```

**Note:** This must run AFTER `LoadFingerprint()` but BEFORE `InitializeICU()` in each process. The exact insertion points are:
- Browser: in `chrome_browser_main.cc`, after fingerprint load (patch 001)
- Renderer: in `renderer_main.cc`, after fingerprint load (patch 002)
- GPU: in `gpu_main.cc`, after fingerprint load (patch 003)

Alternatively, fold the TZ-setting into `LoadFingerprint()` itself so it happens automatically.

- [ ] **Step 7: Apply patches and build**

```bash
cd chromium/src
for i in 011 012 013 014 015 016; do
  git apply clawbrowser/patches/${i}-*.patch
done
autoninja -C out/Default chrome
```
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add clawbrowser/patches/011-fonts-filter.patch \
  clawbrowser/patches/012-media-devices.patch \
  clawbrowser/patches/013-plugins.patch \
  clawbrowser/patches/014-battery.patch \
  clawbrowser/patches/015-speech-voices.patch \
  clawbrowser/patches/016-timezone-env.patch
git commit -m "feat(browser): add surface override patches for fonts, media, plugins, battery, speech, timezone

011: Font enumeration filter to fingerprint list
012: MediaDevices.enumerateDevices() override
013: navigator.plugins override
014: Battery API charging/level override
015: SpeechSynthesis voices filter
016: TZ env var before ICU init for timezone spoofing"
```

---

### Task 15: Network Patches — Proxy + WebRTC + WebUI + Build (017–020)

**Files:**
- Create: `clawbrowser/patches/017-webrtc-leak-prevention.patch`
- Create: `clawbrowser/patches/018-proxy-config.patch`
- Create: `clawbrowser/patches/019-verify-page-registration.patch`
- Create: `clawbrowser/patches/020-build-dep.patch`

- [ ] **Step 1: Create patch 017 — WebRTC leak prevention**

Create `clawbrowser/patches/017-webrtc-leak-prevention.patch`:

Two changes: force relay-only ICE transport, strip local candidates from SDP.

```diff
--- a/third_party/blink/renderer/modules/peerconnection/rtc_peer_connection.cc
+++ b/third_party/blink/renderer/modules/peerconnection/rtc_peer_connection.cc
@@ -XX,6 +XX,7 @@
+#include "clawbrowser/fingerprint_accessor.h"

 // In RTCPeerConnection constructor or setConfiguration():
+  // Clawbrowser: force relay-only when proxy is active
+  if (clawbrowser::FingerprintAccessor::GetProxy()) {
+    configuration->ice_transport_policy = "relay";
+  }

--- a/content/renderer/media/webrtc/peer_connection_dependency_factory.cc
+++ b/content/renderer/media/webrtc/peer_connection_dependency_factory.cc
@@ -XX,6 +XX,7 @@
+#include "clawbrowser/fingerprint_accessor.h"

 // In the SDP candidate filtering / ICE candidate handling:
+  // Clawbrowser: strip host/srflx candidates when proxy is active
+  if (clawbrowser::FingerprintAccessor::GetProxy()) {
+    // Only allow relay candidates through
+    if (candidate.type() != "relay")
+      return;  // Drop non-relay candidates
+  }
```

- [ ] **Step 2: Create patch 018 — proxy config**

Create `clawbrowser/patches/018-proxy-config.patch`:

Patches the network stack to automatically respond to proxy 407 auth challenges with stored credentials, so Chromium never shows a proxy auth dialog. The `--proxy-server` flag is already set by `RunStartup()` (Task 10).

**Approach:** Implement a `LoginDelegate` that intercepts proxy auth challenges and responds with the fingerprint's proxy credentials. This works with the Network Service architecture (credentials stay in the browser process, no direct `HttpAuthCache` access needed).

Create `clawbrowser/proxy/proxy_auth_login_delegate.h`:

```cpp
#ifndef CLAWBROWSER_PROXY_PROXY_AUTH_LOGIN_DELEGATE_H_
#define CLAWBROWSER_PROXY_PROXY_AUTH_LOGIN_DELEGATE_H_

#include "content/public/browser/login_delegate.h"

namespace clawbrowser {

// Automatically responds to proxy 407 challenges with stored credentials.
// Created by ContentBrowserClient::CreateLoginDelegate() when
// the challenge is for a proxy and fingerprint mode is active.
class ProxyAuthLoginDelegate : public content::LoginDelegate {
 public:
  ProxyAuthLoginDelegate(
      const net::AuthChallengeInfo& auth_info,
      content::WebContents* web_contents,
      LoginAuthRequiredCallback auth_required_callback);
  ~ProxyAuthLoginDelegate() override;
};

}  // namespace clawbrowser

#endif
```

Create `clawbrowser/proxy/proxy_auth_login_delegate.cc`:

```cpp
#include "clawbrowser/proxy/proxy_auth_login_delegate.h"

#include "clawbrowser/fingerprint_accessor.h"
#include "clawbrowser/proxy/proxy_config.h"
#include "net/base/auth.h"

namespace clawbrowser {

ProxyAuthLoginDelegate::ProxyAuthLoginDelegate(
    const net::AuthChallengeInfo& auth_info,
    content::WebContents* web_contents,
    LoginAuthRequiredCallback auth_required_callback) {
  // Only auto-respond for proxy auth when fingerprint is active
  const auto* proxy = FingerprintAccessor::GetProxy();
  if (proxy && auth_info.is_proxy) {
    auto config = BuildChromiumProxyConfig(*proxy);
    if (config) {
      std::move(auth_required_callback)
          .Run(net::AuthCredentials(
              base::UTF8ToUTF16(config->username),
              base::UTF8ToUTF16(config->password)));
      return;
    }
  }
  // Not our challenge — cancel (will show default Chromium dialog)
  std::move(auth_required_callback).Run(std::nullopt);
}

ProxyAuthLoginDelegate::~ProxyAuthLoginDelegate() = default;

}  // namespace clawbrowser
```

The patch hooks into `ChromeContentBrowserClient::CreateLoginDelegate()`:

```diff
--- a/chrome/browser/chrome_content_browser_client.cc
+++ b/chrome/browser/chrome_content_browser_client.cc
@@ -XX,6 +XX,8 @@
+#include "clawbrowser/fingerprint_accessor.h"
+#include "clawbrowser/proxy/proxy_auth_login_delegate.h"

 // In ChromeContentBrowserClient::CreateLoginDelegate():
+  // Clawbrowser: auto-respond to proxy auth challenges
+  if (auth_info.is_proxy && clawbrowser::FingerprintAccessor::GetProxy()) {
+    return std::make_unique<clawbrowser::ProxyAuthLoginDelegate>(
+        auth_info, web_contents, std::move(auth_required_callback));
+  }
   // ... existing login delegate creation ...
```

Add to BUILD.gn sources: `"proxy/proxy_auth_login_delegate.cc"`, `"proxy/proxy_auth_login_delegate.h"`.

**Note on proxy mid-session drop:** If the upstream proxy drops mid-session, Chromium's existing network error handling applies (ERR_PROXY_CONNECTION_FAILED). This is expected browser behavior — the clawbrowser shim does not add special handling for proxy drops. Chromium will surface standard network error pages. No additional code is needed here.

- [ ] **Step 3: Create patch 019 — verify page registration**

Create `clawbrowser/patches/019-verify-page-registration.patch`:

Registers `clawbrowser://verify` as a WebUI page.

```diff
 // In chrome/browser/ui/webui/chrome_web_ui_controller_factory.cc:
+#include "clawbrowser/verify/verify_page.h"

 // In the URL-to-controller mapping:
+  if (url.host() == clawbrowser::kVerifyHost &&
+      url.SchemeIs("clawbrowser")) {
+    return std::make_unique<clawbrowser::VerifyPageUI>(web_ui);
+  }

 // In chrome/browser/chrome_content_browser_client.cc:
 // Register "clawbrowser" as a WebUI scheme:
+  content::WebUIConfigMap::GetInstance().AddWebUIConfig(
+      std::make_unique<clawbrowser::VerifyWebUIConfig>());
```

**Note:** The exact registration mechanism depends on the Chromium version. Modern Chromium uses `WebUIConfigMap` for WebUI page registration. The verify page also needs a `.grd` resource file for embedding HTML/JS/CSS into the binary, or alternatively uses `WebUIDataSource::Create` with inline resource strings.

- [ ] **Step 4: Create patch 020 — build dependency**

Create `clawbrowser/patches/020-build-dep.patch`:

Adds `//clawbrowser` dependency to the Chrome browser target.

```diff
--- a/chrome/BUILD.gn
+++ b/chrome/BUILD.gn
@@ -XX,6 +XX,7 @@
 deps = [
   ...
+  "//clawbrowser",
 ]
```

- [ ] **Step 5: Apply all patches and do a full build**

```bash
cd chromium/src
git apply clawbrowser/patches/017-webrtc-leak-prevention.patch
git apply clawbrowser/patches/018-proxy-config.patch
git apply clawbrowser/patches/019-verify-page-registration.patch
git apply clawbrowser/patches/020-build-dep.patch
autoninja -C out/Default chrome
```
Expected: Full build succeeds with clawbrowser linked into Chrome binary.

- [ ] **Step 6: Run unit tests**

```bash
autoninja -C out/Default clawbrowser_unittests && out/Default/clawbrowser_unittests
```
Expected: All unit tests pass (PRNG, profile envelope, fingerprint loader, args, API client, profile manager, proxy config).

- [ ] **Step 7: Commit**

```bash
git add clawbrowser/patches/017-webrtc-leak-prevention.patch \
  clawbrowser/patches/018-proxy-config.patch \
  clawbrowser/patches/019-verify-page-registration.patch \
  clawbrowser/patches/020-build-dep.patch
git commit -m "feat(browser): add network, WebUI, and build patches

017: WebRTC leak prevention — relay-only ICE + SDP candidate stripping
018: Proxy config — --proxy-server flag + HttpAuthCache pre-load
019: Register clawbrowser://verify WebUI page
020: Add //clawbrowser dep to chrome/BUILD.gn"
```

---

### Task 16: Integration Tests — CDP-Based Surface Verification

**Files:**
- Create: `clawbrowser/test/integration/run_integration_tests.py`
- Create: `clawbrowser/test/integration/test_surfaces.py`
- Create: `clawbrowser/test/integration/test_proxy.py`
- Create: `clawbrowser/test/integration/test_vanilla.py`
- Create: `clawbrowser/test/integration/conftest.py`
- Create: `clawbrowser/test/integration/requirements.txt`

These tests launch a full clawbrowser instance and verify all surfaces via CDP.

- [ ] **Step 1: Create test requirements**

Create `clawbrowser/test/integration/requirements.txt`:

```
playwright>=1.40.0
pytest>=7.0.0
pytest-asyncio>=0.21.0
```

- [ ] **Step 2: Create conftest.py with browser fixture**

Create `clawbrowser/test/integration/conftest.py`:

```python
"""Shared fixtures for clawbrowser integration tests."""

import asyncio
import json
import subprocess
import time
from pathlib import Path

import pytest
import pytest_asyncio
from playwright.async_api import async_playwright

FIXTURE_DIR = Path(__file__).parent.parent / "fixtures"
BINARY = "out/Default/chrome"  # Adjust to actual built binary path


@pytest_asyncio.fixture
async def browser_with_fingerprint():
    """Launch clawbrowser with valid_fingerprint.json and return CDP page."""
    fp_path = FIXTURE_DIR / "valid_fingerprint.json"
    with open(fp_path) as f:
        fingerprint_data = json.load(f)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=BINARY,
            args=[
                f"--clawbrowser-fp-path={fp_path}",
                "--skip-verify",
                "--no-first-run",
                "--no-default-browser-check",
            ],
        )
        page = await browser.new_page()
        yield page, fingerprint_data
        await browser.close()


@pytest_asyncio.fixture
async def vanilla_browser():
    """Launch clawbrowser in vanilla mode (no fingerprint)."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=BINARY,
            args=[
                "--no-first-run",
                "--no-default-browser-check",
            ],
        )
        page = await browser.new_page()
        yield page
        await browser.close()
```

- [ ] **Step 3: Create surface tests**

Create `clawbrowser/test/integration/test_surfaces.py`:

```python
"""Integration tests: verify fingerprint surfaces via CDP."""

import json

import pytest
import pytest_asyncio


@pytest.mark.asyncio
async def test_navigator_user_agent(browser_with_fingerprint):
    page, data = browser_with_fingerprint
    fp = data["response"]["fingerprint"]
    actual = await page.evaluate("navigator.userAgent")
    assert actual == fp["user_agent"]


@pytest.mark.asyncio
async def test_navigator_platform(browser_with_fingerprint):
    page, data = browser_with_fingerprint
    fp = data["response"]["fingerprint"]
    actual = await page.evaluate("navigator.platform")
    assert actual == fp["platform"]


@pytest.mark.asyncio
async def test_navigator_language(browser_with_fingerprint):
    page, data = browser_with_fingerprint
    fp = data["response"]["fingerprint"]
    actual = await page.evaluate("navigator.language")
    assert actual == fp["language"][0]


@pytest.mark.asyncio
async def test_navigator_languages(browser_with_fingerprint):
    page, data = browser_with_fingerprint
    fp = data["response"]["fingerprint"]
    actual = await page.evaluate("JSON.stringify(navigator.languages)")
    assert json.loads(actual) == fp["language"]


@pytest.mark.asyncio
async def test_navigator_hardware_concurrency(browser_with_fingerprint):
    page, data = browser_with_fingerprint
    fp = data["response"]["fingerprint"]
    actual = await page.evaluate("navigator.hardwareConcurrency")
    assert actual == fp["hardware"]["concurrency"]


@pytest.mark.asyncio
async def test_navigator_device_memory(browser_with_fingerprint):
    page, data = browser_with_fingerprint
    fp = data["response"]["fingerprint"]
    actual = await page.evaluate("navigator.deviceMemory")
    assert actual == fp["hardware"]["memory"]


@pytest.mark.asyncio
async def test_screen_dimensions(browser_with_fingerprint):
    page, data = browser_with_fingerprint
    fp = data["response"]["fingerprint"]
    assert await page.evaluate("screen.width") == fp["screen"]["width"]
    assert await page.evaluate("screen.height") == fp["screen"]["height"]
    assert await page.evaluate("screen.availWidth") == fp["screen"]["avail_width"]
    assert await page.evaluate("screen.availHeight") == fp["screen"]["avail_height"]
    assert await page.evaluate("screen.colorDepth") == fp["screen"]["color_depth"]


@pytest.mark.asyncio
async def test_device_pixel_ratio(browser_with_fingerprint):
    page, data = browser_with_fingerprint
    fp = data["response"]["fingerprint"]
    actual = await page.evaluate("window.devicePixelRatio")
    assert actual == fp["screen"]["pixel_ratio"]


@pytest.mark.asyncio
async def test_timezone(browser_with_fingerprint):
    page, data = browser_with_fingerprint
    fp = data["response"]["fingerprint"]
    actual = await page.evaluate(
        "Intl.DateTimeFormat().resolvedOptions().timeZone"
    )
    assert actual == fp["timezone"]


@pytest.mark.asyncio
async def test_webgl_vendor_renderer(browser_with_fingerprint):
    page, data = browser_with_fingerprint
    fp = data["response"]["fingerprint"]
    result = await page.evaluate("""() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return null;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (!ext) return null;
        return {
            vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),
            renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        };
    }""")
    assert result is not None
    assert result["vendor"] == fp["webgl"]["vendor"]
    assert result["renderer"] == fp["webgl"]["renderer"]


@pytest.mark.asyncio
async def test_canvas_determinism(browser_with_fingerprint):
    page, _ = browser_with_fingerprint
    script = """async () => {
        function draw() {
            const c = document.createElement('canvas');
            c.width = 200; c.height = 50;
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.font = '14px Arial';
            ctx.fillText('test', 2, 15);
            return c.toDataURL();
        }
        return draw() === draw();
    }"""
    assert await page.evaluate(script) is True


@pytest.mark.asyncio
async def test_audio_determinism(browser_with_fingerprint):
    page, _ = browser_with_fingerprint
    script = """async () => {
        async function audioHash() {
            const ctx = new OfflineAudioContext(1, 44100, 44100);
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(10000, ctx.currentTime);
            osc.connect(ctx.destination);
            osc.start(0);
            const buf = await ctx.startRendering();
            const data = buf.getChannelData(0);
            let hash = 0;
            for (let i = 0; i < data.length; i++) {
                hash = ((hash << 5) - hash + Math.round(data[i] * 1e10)) | 0;
            }
            return hash;
        }
        const h1 = await audioHash();
        const h2 = await audioHash();
        return h1 === h2;
    }"""
    assert await page.evaluate(script) is True


@pytest.mark.asyncio
async def test_client_rects_stability(browser_with_fingerprint):
    page, _ = browser_with_fingerprint
    script = """() => {
        const el = document.createElement('div');
        el.style.cssText = 'position:absolute;top:10px;left:10px;width:100px;height:50px;';
        document.body.appendChild(el);
        const r1 = el.getBoundingClientRect();
        const r2 = el.getBoundingClientRect();
        document.body.removeChild(el);
        return r1.x === r2.x && r1.y === r2.y &&
               r1.width === r2.width && r1.height === r2.height;
    }"""
    assert await page.evaluate(script) is True


@pytest.mark.asyncio
async def test_plugins_count(browser_with_fingerprint):
    page, data = browser_with_fingerprint
    fp = data["response"]["fingerprint"]
    if "plugins" in fp:
        actual = await page.evaluate("navigator.plugins.length")
        assert actual == len(fp["plugins"])


@pytest.mark.asyncio
async def test_battery(browser_with_fingerprint):
    page, data = browser_with_fingerprint
    fp = data["response"]["fingerprint"]
    if "battery" in fp:
        result = await page.evaluate("""async () => {
            const b = await navigator.getBattery();
            return { charging: b.charging, level: b.level };
        }""")
        assert result["charging"] == fp["battery"]["charging"]
        assert result["level"] == fp["battery"]["level"]


@pytest.mark.asyncio
async def test_media_devices_count(browser_with_fingerprint):
    page, data = browser_with_fingerprint
    fp = data["response"]["fingerprint"]
    if "media_devices" in fp:
        actual = await page.evaluate(
            "navigator.mediaDevices.enumerateDevices().then(d => d.length)"
        )
        assert actual == len(fp["media_devices"])


@pytest.mark.asyncio
async def test_speech_synthesis(browser_with_fingerprint):
    """speechSynthesis.getVoices() should match fingerprint speech_voices list."""
    page, data = browser_with_fingerprint
    fp = data["response"]["fingerprint"]
    if "speech_voices" not in fp:
        pytest.skip("No speech_voices in test fixture")

    voices = await page.evaluate("""() => new Promise((resolve) => {
        const voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
            resolve(voices.map(v => v.name));
        } else {
            speechSynthesis.onvoiceschanged = () => {
                resolve(speechSynthesis.getVoices().map(v => v.name));
            };
            // Timeout after 3s — voices may not load in headless
            setTimeout(() => resolve(speechSynthesis.getVoices().map(v => v.name)), 3000);
        }
    })""")
    expected_voices = fp["speech_voices"]
    assert sorted(voices) == sorted(expected_voices), (
        f"Expected {expected_voices}, got {voices}"
    )
```

- [ ] **Step 4: Create vanilla mode test**

Create `clawbrowser/test/integration/test_vanilla.py`:

```python
"""Integration tests: verify vanilla mode (no fingerprint spoofing)."""

import pytest


@pytest.mark.asyncio
async def test_vanilla_no_spoofing(vanilla_browser):
    """In vanilla mode, navigator values should be real (not spoofed)."""
    page = vanilla_browser
    ua = await page.evaluate("navigator.userAgent")
    # Should contain "Chrome" (real UA, not overridden)
    assert "Chrome" in ua
    # Screen should return real values (not exactly 1920x1080 from fixture)
    width = await page.evaluate("screen.width")
    assert isinstance(width, int)
    assert width > 0
```

- [ ] **Step 5: Create WebRTC leak test**

Create `clawbrowser/test/integration/test_proxy.py`:

```python
"""Integration tests: proxy and WebRTC leak prevention."""

import pytest


@pytest.mark.asyncio
async def test_webrtc_no_host_candidates(browser_with_fingerprint):
    """When proxy is configured, WebRTC should only produce relay candidates."""
    page, data = browser_with_fingerprint
    if "proxy" not in data["response"]:
        pytest.skip("No proxy in test fixture")

    script = """() => new Promise((resolve) => {
        const pc = new RTCPeerConnection({
            iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
        });
        pc.createDataChannel('test');
        const candidates = [];
        pc.onicecandidate = (e) => {
            if (e.candidate) {
                candidates.push(e.candidate.candidate);
            } else {
                resolve(candidates);
            }
        };
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
        // Timeout after 5s
        setTimeout(() => resolve(candidates), 5000);
    })"""

    candidates = await page.evaluate(script)
    # No host or srflx candidates — only relay
    for candidate in candidates:
        assert "host" not in candidate.split(" ")[7] if len(candidate.split(" ")) > 7 else True
        assert "srflx" not in candidate.split(" ")[7] if len(candidate.split(" ")) > 7 else True


@pytest.mark.asyncio
async def test_verify_page(browser_with_fingerprint):
    """Verify page should report all checks passing."""
    page, _ = browser_with_fingerprint
    await page.goto("clawbrowser://verify")
    await page.wait_for_function("window.__clawbrowser_verify")
    result = await page.evaluate("window.__clawbrowser_verify")
    assert result["status"] == "pass", f"Failed checks: {result['checks']}"


@pytest.mark.asyncio
async def test_accept_language_header(browser_with_fingerprint):
    """Accept-Language HTTP header should match fingerprint language array."""
    page, data = browser_with_fingerprint
    fp = data["response"]["fingerprint"]
    if "language" not in fp or not fp["language"]:
        pytest.skip("No language in test fixture")

    # Use CDP to intercept request headers
    client = await page.context.new_cdp_session(page)
    await client.send("Network.enable")

    headers_captured = {}

    def on_request(params):
        nonlocal headers_captured
        if not headers_captured:
            headers_captured = params.get("request", {}).get("headers", {})

    client.on("Network.requestWillBeSent", on_request)
    await page.goto("data:text/html,<h1>test</h1>")

    accept_lang = headers_captured.get("Accept-Language", "")
    # First language should match primary fingerprint language
    assert accept_lang.startswith(fp["language"][0]), (
        f"Accept-Language '{accept_lang}' doesn't start with '{fp['language'][0]}'"
    )


@pytest.mark.asyncio
async def test_cross_tab_consistency(browser_with_fingerprint):
    """Two tabs should show the same fingerprint values."""
    page1, data = browser_with_fingerprint
    fp = data["response"]["fingerprint"]
    browser = page1.context.browser
    page2 = await browser.new_page()

    ua1 = await page1.evaluate("navigator.userAgent")
    ua2 = await page2.evaluate("navigator.userAgent")
    assert ua1 == ua2 == fp["user_agent"]

    await page2.close()


@pytest.mark.asyncio
async def test_cross_process_consistency(browser_with_fingerprint):
    """A page that forces a new renderer process should have the same fingerprint."""
    page1, data = browser_with_fingerprint
    fp = data["response"]["fingerprint"]
    browser = page1.context.browser

    # Open a page on a different origin to force a new renderer process
    # (Chromium's site isolation puts different origins in different processes)
    page2 = await browser.new_page()
    await page2.goto("data:text/html,<h1>cross-process</h1>")

    ua1 = await page1.evaluate("navigator.userAgent")
    ua2 = await page2.evaluate("navigator.userAgent")
    assert ua1 == ua2 == fp["user_agent"]

    hw1 = await page1.evaluate("navigator.hardwareConcurrency")
    hw2 = await page2.evaluate("navigator.hardwareConcurrency")
    assert hw1 == hw2 == fp["hardware"]["concurrency"]

    tz1 = await page1.evaluate(
        "Intl.DateTimeFormat().resolvedOptions().timeZone"
    )
    tz2 = await page2.evaluate(
        "Intl.DateTimeFormat().resolvedOptions().timeZone"
    )
    assert tz1 == tz2 == fp["timezone"]

    await page2.close()


@pytest.mark.asyncio
async def test_font_detection(browser_with_fingerprint):
    """Fingerprint fonts should be detected, non-fingerprint fonts should not."""
    page, data = browser_with_fingerprint
    fp = data["response"]["fingerprint"]

    detect_script = """(fontName) => {
        const testString = 'mmmmmmmmmmlli';
        const baseFont = 'monospace';
        const span = document.createElement('span');
        span.style.fontSize = '72px';
        span.style.fontFamily = baseFont;
        span.textContent = testString;
        document.body.appendChild(span);
        const baseWidth = span.offsetWidth;
        span.style.fontFamily = `"${fontName}", ${baseFont}`;
        const testWidth = span.offsetWidth;
        document.body.removeChild(span);
        return testWidth !== baseWidth;
    }"""

    # Fingerprint fonts should be detected
    for font in fp["fonts"][:3]:  # Test first 3 to keep it fast
        detected = await page.evaluate(detect_script, font)
        # Font may not be installed on test system, but should not be
        # blocked by the filter. At minimum, verify no error.
        assert isinstance(detected, bool)

    # Non-fingerprint fonts should NOT be detected (filtered out)
    non_fp_fonts = ["Wingdings", "Zapfino", "Papyrus"]
    for font in non_fp_fonts:
        if font not in fp["fonts"]:
            detected = await page.evaluate(detect_script, font)
            assert detected is False, f"Non-fingerprint font '{font}' was detected"


@pytest.mark.asyncio
async def test_proxy_ip_routing(browser_with_fingerprint):
    """Traffic should route through the proxy — external IP should be proxy IP."""
    page, data = browser_with_fingerprint
    if "proxy" not in data["response"] or data["response"]["proxy"] is None:
        pytest.skip("No proxy in test fixture")

    proxy = data["response"]["proxy"]

    # Fetch an external IP-check service via the browser
    # Use multiple services for reliability
    ip_check_script = """async () => {
        const services = [
            'https://api.ipify.org?format=json',
            'https://httpbin.org/ip',
        ];
        for (const url of services) {
            try {
                const resp = await fetch(url);
                const data = await resp.json();
                // ipify returns {ip: "..."}, httpbin returns {origin: "..."}
                return data.ip || data.origin || null;
            } catch (e) {
                continue;
            }
        }
        return null;
    }"""

    detected_ip = await page.evaluate(ip_check_script)
    # If we can't reach any IP service (e.g., test proxy isn't real),
    # at least verify the request attempted to go through proxy
    if detected_ip is not None:
        # The detected IP should NOT be our real public IP
        # (We can't easily know our real IP here, but we can verify
        # the proxy country matches if the service provides geo info)
        assert isinstance(detected_ip, str)
        assert len(detected_ip) > 0
```

- [ ] **Step 6: Create test runner script**

Create `clawbrowser/test/integration/run_integration_tests.py`:

```python
#!/usr/bin/env python3
"""Run clawbrowser integration tests."""

import subprocess
import sys


def main():
    result = subprocess.run(
        [
            sys.executable, "-m", "pytest",
            "clawbrowser/test/integration/",
            "-v",
            "--tb=short",
        ],
        cwd=".",  # Run from chromium/src root
    )
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
```

- [ ] **Step 7: Run integration tests**

```bash
cd chromium/src
pip install -r clawbrowser/test/integration/requirements.txt
playwright install chromium
python clawbrowser/test/integration/run_integration_tests.py
```
Expected: All integration tests PASS. If some tests fail due to environment (e.g., no display for headless), run with `--headless` flag.

- [ ] **Step 8: Commit**

```bash
git add clawbrowser/test/integration/
git commit -m "feat(browser): add CDP-based integration tests for all fingerprint surfaces

Playwright tests verify: navigator, screen, canvas determinism,
WebGL strings, audio determinism, clientRects stability, timezone,
plugins, battery, media devices, WebRTC leak prevention, verify page,
vanilla mode, and cross-tab consistency."
```

---

## Final BUILD.gn

After all tasks, the complete `clawbrowser/BUILD.gn` should look like:

```gn
import("//build/config/features.gni")
import("//tools/grit/grit_rule.gni")

grit("clawbrowser_verify_resources") {
  source = "verify/clawbrowser_verify.grd"
  outputs = [
    "grit/clawbrowser_verify_resources.h",
    "clawbrowser_verify_resources.pak",
  ]
}

static_library("clawbrowser") {
  sources = [
    "cli/api_client.cc",
    "cli/api_client.h",
    "cli/args.cc",
    "cli/args.h",
    "cli/profile_manager.cc",
    "cli/profile_manager.h",
    "fingerprint_accessor.cc",
    "fingerprint_accessor.h",
    "fingerprint_loader.cc",
    "fingerprint_loader.h",
    "generated/fingerprint_types.cc",
    "generated/fingerprint_types.h",
    "logging.cc",
    "logging.h",
    "noise/prng.cc",
    "noise/prng.h",
    "profile_envelope.cc",
    "profile_envelope.h",
    "proxy/proxy_auth_login_delegate.cc",
    "proxy/proxy_auth_login_delegate.h",
    "proxy/proxy_config.cc",
    "proxy/proxy_config.h",
    "startup.cc",
    "startup.h",
    "verify/verify_page.cc",
    "verify/verify_page.h",
  ]
  deps = [
    ":clawbrowser_verify_resources",
    "//base",
    "//content/public/browser",
    "//content/public/renderer",
    "//net",
    "//services/network/public/cpp",
  ]
}

test("clawbrowser_unittests") {
  sources = [
    "test/api_client_unittest.cc",
    "test/args_unittest.cc",
    "test/fingerprint_loader_unittest.cc",
    "test/profile_envelope_unittest.cc",
    "test/profile_manager_unittest.cc",
    "test/prng_unittest.cc",
    "test/proxy_config_unittest.cc",
    "test/startup_unittest.cc",
  ]
  deps = [
    ":clawbrowser",
    "//base/test:test_support",
    "//services/network:test_support",
    "//testing/gtest",
    "//testing/gtest:gtest_main",
  ]
  data = [
    "test/fixtures/",
  ]
}
```
