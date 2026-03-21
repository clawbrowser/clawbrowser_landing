# Clawbrowser.ai — AI Agent Integration Guide

## Overview

Clawbrowser.ai is an anti-detect browser that provides managed fingerprint identities and proxy routing. AI agents connect via standard CDP (Chrome DevTools Protocol) using Playwright or Puppeteer. All fingerprint spoofing and proxy routing is transparent — agents interact with a normal browser.

## Quick Start

### 1. Set API Key

```bash
export CLAWBROWSER_API_KEY=clawbrowser_xxxxx
```

### 2. Launch Browser with a Fingerprint Profile

```bash
# First launch with a new profile (auto-detected, generates fingerprint via API)
clawbrowser --fingerprint=my_agent_profile --remote-debugging-port=9222
```

On first use, clawbrowser detects the profile doesn't exist, calls the backend API to generate a fingerprint, saves it locally, and launches with full identity spoofing and proxy routing.

Subsequent launches with the same profile ID reuse the cached fingerprint — same identity, same cookies, same session state.

### 3. Connect Your Agent

**Playwright (Python):**

```python
from playwright.async_api import async_playwright

async with async_playwright() as p:
    browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222")
    page = browser.contexts[0].pages[0]
    await page.goto("https://example.com")
    content = await page.content()
```

**Playwright (Node.js):**

```javascript
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts()[0].pages()[0];
await page.goto('https://example.com');
```

**Puppeteer:**

```javascript
const puppeteer = require('puppeteer');

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
const [page] = await browser.pages();
await page.goto('https://example.com');
```

## CLI Reference

```bash
# Launch with fingerprint profile
clawbrowser --fingerprint=<profile_id>

# Launch with CDP port for automation
clawbrowser --fingerprint=<profile_id> --remote-debugging-port=9222

# Launch in headless mode
clawbrowser --fingerprint=<profile_id> --headless

# Launch vanilla (no fingerprint, no proxy)
clawbrowser

# List all local profiles
clawbrowser --list

# Regenerate a fingerprint (new identity, preserves cookies/history)
clawbrowser --fingerprint=<profile_id> --regenerate
```

## Stdout Modes

### Default (clean)

Suppresses Chromium noise. Only outputs clawbrowser status messages:

```
[clawbrowser] Profile my_agent_profile loaded
[clawbrowser] Proxy verified
[clawbrowser] Fingerprint verified
[clawbrowser] CDP listening on ws://127.0.0.1:9222
[clawbrowser] Browser ready
```

### JSON mode (for machine consumption)

```bash
clawbrowser --fingerprint=my_agent_profile --output=json
```

```json
{"event":"profile_loaded","profile_id":"my_agent_profile"}
{"event":"proxy_verified"}
{"event":"fingerprint_verified"}
{"event":"cdp_ready","url":"ws://127.0.0.1:9222"}
{"event":"ready"}
```

Parse the `ready` event to know when the browser is available for automation.

### Verbose mode (debugging)

```bash
clawbrowser --fingerprint=my_agent_profile --verbose
```

Outputs full Chromium logs alongside clawbrowser messages.

## Multi-Profile Management

Each profile is a complete browser identity:

- Unique fingerprint (canvas, WebGL, audio, navigator, screen, fonts, etc.)
- Separate proxy (country, city, connection type)
- Isolated browser state (cookies, localStorage, history, bookmarks)

```bash
# Run multiple profiles simultaneously on different ports
clawbrowser --fingerprint=agent_us_1 --remote-debugging-port=9222 &
clawbrowser --fingerprint=agent_de_1 --remote-debugging-port=9223 &
clawbrowser --fingerprint=agent_uk_1 --remote-debugging-port=9224 &
```

## Tips for AI Agents

- **Reuse profiles** for session continuity — cookies and login state persist across launches
- **Use `--output=json`** to programmatically detect when the browser is ready
- **Use `--skip-verify`** if your agent handles verification and you want faster startup
- **One proxy per session** — proxy does not rotate mid-session, which is more realistic
- **Don't override fingerprint properties via CDP** — clawbrowser handles all spoofing at the engine level. CDP-level overrides may conflict and create detectable inconsistencies
- **Profile ID naming** — use descriptive IDs (`us_residential_1`, `de_scraper_main`) for easier management

## Error Handling

Monitor stdout (or JSON events) for errors:

```
[clawbrowser] Error: CLAWBROWSER_API_KEY not set
[clawbrowser] Error: cannot reach fingerprint API
[clawbrowser] Error: proxy connection failed
[clawbrowser] Error: fingerprint verification failed
[clawbrowser] Error: out of credits, please top up at clawbrowser.ai
```

On error, the process exits with a non-zero exit code. Agents should check the exit code and parse the error message to decide whether to retry or alert.
