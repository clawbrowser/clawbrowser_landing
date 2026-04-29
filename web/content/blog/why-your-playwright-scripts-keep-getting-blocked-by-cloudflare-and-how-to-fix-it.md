---
title: "Why Your Playwright Scripts Keep Getting Blocked by Cloudflare (And How To Fix It)"
excerpt: "What Cloudflare actually reads from Playwright sessions, why most stealth fixes stop working, and the structural answer that holds up in production."
date: "2026-04-28"
author: "Clawbrowser Team"
authorName: "Clawbrowser Team"
authorRole: "Engineering"
authorGithub: "https://github.com/clawbrowser"
authorTwitter: "https://x.com/clawbrowser"
tags: ["playwright", "cloudflare", "anti-bot", "troubleshooting"]
coverImage: "/blog/playwright-cloudflare-blocked-cover-dark.png"
---

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="/blog/playwright-cloudflare-blocked-cover-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="/blog/playwright-cloudflare-blocked-cover-light.png">
  <img src="/blog/playwright-cloudflare-blocked-cover-light.png" alt="Cover illustration: Playwright automation hitting a Cloudflare challenge">
</picture>

If your Playwright script was working last week and is now hitting Cloudflare's challenge page — or returning HTTP 403 with `error 1020` — the problem is almost never your code. The problem is that your browser is identifying itself as automation through a stack of signals you may not even know it's emitting.

This guide explains why Playwright scripts get blocked by Cloudflare, what specifically Cloudflare is reading, and the four classes of fix ranked by how reliable they actually are in production. The TL;DR: page-level patches buy you a few weeks; a coherent identity at the browser-binary level is the only durable fix.

## Why Playwright Triggers Cloudflare Bot Detection

Cloudflare blocks Playwright sessions because the default Playwright-driven Chromium browser emits a coherent set of signals that Cloudflare's bot management system has been trained to recognize as automation. The block is not random and it is not based on rate-limiting alone — it is based on identity classification that happens before your script's first interaction with the page.

The first 200 milliseconds of a Cloudflare-protected page load involve a stack of fingerprint and behavioral checks that run before your code can act. By the time your `page.goto()` resolves, the session is often already classified.

### Why this gets worse over time

Cloudflare's bot management updates its detection models continuously. According to [Cloudflare's bot management documentation](https://developers.cloudflare.com/bots/concepts/bot/), the system uses machine learning trained on traffic patterns across millions of sites — meaning the signature your stealth setup emits today may be benign, but the signature it emits next month might be flagged because Cloudflare's model has updated. This is why "it stopped working" is the most common pattern in Playwright + Cloudflare debugging threads.

## The Six Signals Cloudflare Reads From Playwright

To fix Playwright's Cloudflare problem, you need to know what Cloudflare is actually checking. There are six high-impact signals.

### 1. The `navigator.webdriver` flag

The most basic signal. A vanilla Playwright-controlled Chromium sets `navigator.webdriver = true`. Detection systems read this on the first script execution. Most stealth plugins handle this, but some patches are themselves detectable.

### 2. TLS fingerprint (JA3 / JA4)

Playwright's underlying Chromium produces a TLS Client Hello with a specific cipher order, extension list, and elliptic curve set. This forms a JA3 or JA4 hash that Cloudflare can match against known automation client signatures. As [Salesforce's open-sourced JA3 specification](https://github.com/salesforce/ja3) explains, the TLS handshake itself is fingerprintable independent of the user agent.

### 3. HTTP/2 frame ordering

The order in which a browser sends HTTP/2 SETTINGS, WINDOW_UPDATE, and HEADERS frames is consistent within a Chrome version but differs from automation libraries that build HTTP/2 differently. Cloudflare reads this layer.

### 4. Canvas, WebGL, and audio fingerprints

When the page runs the Cloudflare challenge JavaScript, it renders test content to canvas and WebGL contexts and reads back the pixel data. A stock Playwright Chromium produces deterministic, repeatable readbacks. The same readback appearing across thousands of sessions is itself a bot signal.

### 5. Timezone × locale × IP geo coherence

If your browser presents `en-US` and `America/New_York` while your IP routes through a Frankfurt datacenter, the mismatch is a near-certain bot signal. Cloudflare cross-references all three.

### 6. Behavioral signals after page load

If the challenge passes the fingerprint stage, behavioral checks begin: mouse movement entropy, scroll patterns, keystroke cadence. Pure programmatic interactions (immediate clicks at exact coordinates) are detectable here.

## The Four Classes of Fix, Ranked

There are four real categories of fix for Playwright + Cloudflare blocking. They differ enormously in how long they keep working.

### Tier 4 (least reliable): User-agent and basic flag manipulation

This is the first thing most developers try: setting a custom user agent, removing the `--enable-automation` flag, and overriding `navigator.webdriver` via `addInitScript`. It addresses a single one of the six signals above.

**Lifespan in production:** Days to weeks. Cloudflare's basic detection is far past this layer.

**When it's appropriate:** Sites with no real bot detection, where you only need to suppress the most obvious flag.

### Tier 3 (limited reliability): Stealth plugins

The `puppeteer-extra-stealth` family of plugins, ported to Playwright via libraries like `playwright-stealth`. These patch a dozen or more navigator properties, override canvas readbacks with noise, and handle several of the signals above through page-level JavaScript injection.

**Lifespan in production:** Weeks to a few months. The patches themselves have signatures detection systems can identify, and the patches operate on a different layer than Chromium's underlying rendering pipeline — so canvas and WebGL readbacks still betray the browser when challenged with edge cases.

**When it's appropriate:** Light scraping of moderately protected sites, prototypes, environments where occasional failures are acceptable.

**Why it eventually fails:** Page-level patching is a known pattern. According to [research published on the detection of headless browsers](https://arxiv.org/abs/1905.10141), automated browsers can be identified by the timing and behavior of their patches even when those patches successfully spoof property values.

### Tier 2 (moderate reliability): Stealth plugins + residential proxy + careful behavior

Adding a residential proxy and instrumenting your script with realistic timing — variable delays, mouse movement curves, scroll patterns — to the stealth plugin stack. This addresses the IP-geo signal and the behavioral signal.

**Lifespan in production:** Months. This is where most automation teams settle for reasonably protected sites.

**The remaining failure mode:** The locale × timezone × IP coherence problem. You buy a residential proxy in Germany; you forget to set the browser timezone to Europe/Berlin; the language headers still send `en-US`. The mismatch is silent — your script doesn't error — but Cloudflare's challenge rate climbs steadily over weeks.

### Tier 1 (most reliable): Engine-level identity coherence

This means a Chromium build where the fingerprint surfaces are patched inside the browser binary itself, not via JavaScript injection. It means a profile where canvas, WebGL, audio, navigator properties, screen, fonts, timezone, and locale are generated to match each other and the proxy IP geography. And it means the proxy is bound to the profile, so the alignment is automatic rather than something the operator has to remember.

This is what a [browser runtime for AI agents](https://clawbrowser.ai/) provides. Engine-level patching means detection systems can't pattern-match the stealth itself, because there's no stealth code running on the page — the values are simply what the browser reports natively. Profile-bound proxies eliminate the locale/timezone/IP mismatch class of failure.

**Lifespan in production:** Indefinite, with periodic profile regeneration. The approach degrades gracefully because each profile is unique rather than carrying a known stealth signature.

**When it's appropriate:** Any production workflow where reliability matters more than the convenience of staying on stock Chromium. AI agent workloads particularly, because the orchestration layer can keep working unchanged when the runtime layer is swapped underneath.

## Step-by-Step Implementation: The Tier 1 Fix

Moving from a stock Playwright + stealth plugin setup to an engine-level runtime takes four steps and a one-line code change.

### Step 1: Identify what your existing stack looks like

Before changing anything, run your existing setup against a public fingerprint inspector like [browserleaks.com](https://browserleaks.com) or creepjs. Note which surfaces are flagged. Most stealth-plugin setups fail on at least canvas, WebGL, and TLS.

### Step 2: Install the runtime

For Clawbrowser, the install script handles setup:

```bash
curl -fsSL https://raw.githubusercontent.com/clawbrowser/clawbrowser/main/scripts/install.sh | bash -s -- claude
```

Targets are available for `claude`, `codex`, `gemini`, and `all`. Set your API key:

```bash
export CLAWBROWSER_API_KEY=clawbrowser_xxxxx
```

### Step 3: Start a managed session with a fingerprint profile

```bash
clawbrowser start --session work -- --fingerprint=fp_us --country=US --connection-type=residential
clawbrowser endpoint --session work
# prints: http://127.0.0.1:9222
```

The `--fingerprint`, `--country`, and `--connection-type` flags select a profile where the canvas, WebGL, navigator, screen, fonts, timezone, locale, *and* the bound residential proxy IP all align with US identity.

### Step 4: Change one line in your Playwright script

Before:

```python
browser = await p.chromium.launch(headless=False)
```

After:

```python
endpoint = "http://127.0.0.1:9222"
browser = await p.chromium.connect_over_cdp(endpoint)
page = browser.contexts[0].pages[0]
```

Everything downstream — locators, navigation, assertions — works unchanged. The agent or automation logic is untouched. Only the connection pattern changes.

### Step 5: Verify before running production traffic

Run the verification page that ships with the runtime to confirm the outward-facing identity is what you expect:

```bash
clawbrowser start --session work --verify -- https://example.com
```

This is the step most teams skip and most teams later regret. Verifying once after profile generation catches the silent locale-mismatch class of bug.

For the complete CDP integration patterns including multi-session deployment, see the [Clawbrowser documentation](https://clawbrowser.ai/docs/).

<!-- CTA -->

## Expected Results and Benefits

After moving from stealth-plugin-based stealth to engine-level identity coherence, the metrics that change in production are:

- **CAPTCHA rate** drops from ~30–60% on Cloudflare-protected sites (typical with stealth plugins) to single-digit percentages, with the remaining CAPTCHAs being legitimately triggered by behavioral patterns rather than identity classification.
- **Session lifespan** extends from hours to days or weeks, because the session does not get progressively flagged after the first dozen actions.
- **Maintenance overhead** drops because patches don't need to be updated every time Cloudflare's detection model evolves.
- **Multi-account workflows** become reliable because each session has a coherent and distinct identity rather than the same stealth-patch signature shared across all sessions.

The honest caveat: no browser bypasses CAPTCHA universally. Sites that issue an Interactive Challenge to every new session will continue to do so, and any CAPTCHAs that do appear still need to be handled — either by adjusting the workflow, using a CAPTCHA solver, or accepting that some workflows will require human-in-the-loop intervention.

## Common Mistakes to Avoid

### Layering CDP overrides on top of engine-level patches

If your runtime handles fingerprint at the binary level, do not also use Playwright's CDP commands to override navigator properties or canvas behavior. The two layers can disagree, producing detectable inconsistencies that the engine-level approach was specifically designed to avoid.

### Mid-session proxy rotation

Rotating proxies during an active session — switching IP halfway through a workflow — is a strong bot signal because real humans don't change IP every 30 seconds. Use one proxy per session; for new identities, start a new session with a regenerated profile.

### Ignoring the timezone/locale alignment

If you manually configure proxies, you must also manually align the browser's timezone, locale, and accepted languages with the proxy's geography. Forgetting any one of these is the most common silent failure mode. Profile-bound proxy systems eliminate this class of bug.

### Reusing the same fingerprint across "different" identities

Two sessions with the same canvas fingerprint and the same WebGL renderer string are the same identity to Cloudflare, regardless of what user agent they each present. Distinct identities require distinct fingerprint profiles, not just distinct cookies.

### Treating headless mode as identical to headful

Headless Chrome has additional fingerprint tells (different audio output, different default plugin list, different rendering paths in some cases). If your local debugging is in headful mode and your production deployment is headless, validate the production identity separately.

## Frequently Asked Questions

### Why does my Playwright script work locally but get blocked in production?

The most common reason is environmental difference: local development uses your residential IP, your real timezone, and your developer-machine fingerprint, while production runs in a Linux container behind a datacenter or proxy IP, with potentially different timezone, locale, and fingerprint surfaces. The orchestration code is identical; the identity layer is completely different. The fix is using a runtime that produces consistent identity in both environments.

### Does using a residential proxy alone fix the Cloudflare problem?

No. A residential proxy fixes the IP-geo signal but leaves canvas, WebGL, TLS, navigator, and timezone signals unchanged. If those still emit automation patterns, Cloudflare still detects the session. The fix has to address all signals together, not just the IP.

### Is `playwright-stealth` enough for Cloudflare-protected sites?

For lightly protected sites, often yes. For sites with active Cloudflare Bot Management or any moderately recent enterprise bot solution, typically no — and reliability degrades over months as Cloudflare's models update. For production workflows where reliability matters, plugin-level stealth has a known ceiling.

### What about Cloudflare's "Verified Bot" program — should I just register my bot?

If your use case qualifies (search engine crawlers, monitoring services, accessibility tools), [Cloudflare's Verified Bots program](https://developers.cloudflare.com/bots/concepts/bot/verified-bots/) is the legitimate path and the right answer. Most automation and AI agent workflows do not qualify for verified bot status, and unverified automation has to handle detection on its own merits.

### Will this approach work against other anti-bot vendors (DataDome, Akamai, PerimeterX)?

The same principles apply: the more coherent your identity at the binary level, the less easily detection systems can flag the session as automation. The specific signals each vendor weighs differently — DataDome leans heavily on behavioral patterns, Akamai on TLS, PerimeterX on a mix — but engine-level identity coherence is the structural answer across all of them.

## Conclusion: Stop Patching, Start Aligning

The pattern is consistent: Playwright + stock Chromium produces detectable signals, page-level patches address some signals while themselves becoming detectable, and the only durable answer is identity coherence inside the browser binary plus proxy egress that matches.

If your script keeps getting blocked by Cloudflare, the highest-leverage change is moving from "bolt stealth onto Chromium" to "use a Chromium build where stealth is the default and the proxy is bound to a coherent profile." That's the structural fix, and it's the difference between scripts that work for two weeks and scripts that work for two years.

[Clawbrowser](https://clawbrowser.ai/) is built for exactly this layer. It speaks standard CDP, so your existing Playwright script changes by one line — and the underlying browser handles the fingerprint, proxy binding, and identity coherence that no plugin-based approach can match.
