# Clawbrowser.ai - AI Agent Integration Guide

## Overview

Clawbrowser.ai is a Chromium-based browser for managed sessions, browser fingerprint profiles, and profile-bound proxy routing. AI agents connect through standard CDP (Chrome DevTools Protocol) using Playwright, Puppeteer, or another CDP client.

The current public launcher manages named sessions. Browser-level fingerprint and geo flags still pass through after `--` when an identity-sensitive workflow needs them.

## Quick Start

### 1. Provide an API key when needed

The launcher can prompt once and save the key to browser-managed config:

```bash
~/.config/clawbrowser/config.json
```

For non-interactive automation, a temporary environment variable is also supported:

```bash
export CLAWBROWSER_API_KEY=clawbrowser_xxxxx
```

Do not store the API key in shell startup files or agent config.

### 2. Start a managed session

```bash
clawbrowser start --session work -- https://example.com
```

The command prints a local CDP endpoint after the browser is ready:

```text
http://127.0.0.1:9222
```

Read the endpoint later with:

```bash
clawbrowser endpoint --session work
```

### 3. Use a fingerprint-backed profile when identity matters

```bash
clawbrowser start --session identity -- --fingerprint=fp_work --country=US https://example.com
```

On first use of a fingerprint ID, the browser calls the backend API, saves the generated profile locally, and reuses it on later starts. For proxy-backed profiles, proxy credentials are part of the generated profile.

### 4. Connect your agent

Use the endpoint printed by `start` or `endpoint`.

**Playwright (Python):**

```python
from playwright.async_api import async_playwright

async with async_playwright() as p:
    endpoint = "http://127.0.0.1:9222"  # from: clawbrowser endpoint --session work
    browser = await p.chromium.connect_over_cdp(endpoint)
    page = browser.contexts[0].pages[0]
    await page.goto("https://example.com")
```

**Playwright (Node.js):**

```javascript
const { chromium } = require('playwright');

const endpoint = 'http://127.0.0.1:9222'; // from: clawbrowser endpoint --session work
const browser = await chromium.connectOverCDP(endpoint);
const page = browser.contexts()[0].pages()[0];
await page.goto('https://example.com');
```

**Puppeteer:**

```javascript
const puppeteer = require('puppeteer');

const endpoint = 'http://127.0.0.1:9222'; // from: clawbrowser endpoint --session work
const browser = await puppeteer.connect({ browserURL: endpoint });
const [page] = await browser.pages();
await page.goto('https://example.com');
```

## CLI Reference

```bash
# Start or reattach to a managed browser session
clawbrowser start --session work -- https://example.com

# Print the CDP endpoint
clawbrowser endpoint --session work

# Show session status
clawbrowser status --session work

# Restart the managed session and pass --regenerate to the browser
clawbrowser rotate --session work

# Stop the session
clawbrowser stop --session work

# List cached browser profiles as JSON
clawbrowser list --session work

# Choose a CDP port
clawbrowser start --session work --port 9222 -- https://example.com

# Pass browser-level fingerprint and geo flags
clawbrowser start --session us -- --fingerprint=fp_us --country=US --connection-type=residential https://example.com

# Keep the internal verification page enabled
clawbrowser start --session work --verify -- https://example.com
```

## Launcher Output

`start` prints the local HTTP CDP endpoint when readiness checks pass.

```text
$ clawbrowser start --session work -- https://example.com
http://127.0.0.1:9222

$ clawbrowser status --session work
session=work status=running endpoint=http://127.0.0.1:9222 backend=app
```

`list` prints cached fingerprint profiles as JSON. It is not a streaming readiness event feed.

```text
$ clawbrowser list --session work
[
   {
      "id": "fp_work",
      "created_at": "2026-04-27T10:00:00Z",
      "country": "US"
   }
]
```

## Multi-Session Management

Each named session has its own tracked CDP endpoint. For identity separation, use distinct fingerprint IDs.

```bash
clawbrowser start --session agent-us --port 9222 -- https://example.com
clawbrowser start --session agent-de --port 9223 -- https://example.com
clawbrowser start --session agent-uk --port 9224 -- https://example.com
```

## Tips for AI Agents

- Reuse session names for endpoint continuity, and reuse fingerprint IDs when you need the same generated profile data.
- Use `clawbrowser endpoint --session <name>` to reconnect to a running session.
- The launcher skips the verification page by default for faster startup. Pass `--verify` when you need to inspect it.
- For fingerprint-backed sessions, `clawbrowser rotate --session <name>` passes `--regenerate` to the browser.
- One proxy identity is used per browser session; proxy routing does not rotate mid-session.
- Do not override fingerprint properties via CDP. Browser-level fingerprint patches and CDP-level overrides can conflict.

## Error Handling

The launcher exits non-zero on startup failures. Check the exit code and the error line to decide whether to retry, restart the session, or alert a human.

Common errors include:

```text
[clawbrowser] ERROR: API key cannot be empty.
[clawbrowser] ERROR: Timed out waiting for CDP on port 9222
[clawbrowser] error: invalid API key
[clawbrowser] error: cannot reach API at https://api.clawbrowser.ai
```
