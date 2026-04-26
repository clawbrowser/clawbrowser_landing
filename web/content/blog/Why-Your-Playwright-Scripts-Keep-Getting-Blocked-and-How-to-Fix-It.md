---
title: "Why Your Playwright Scripts Keep Getting Blocked (and How to Fix It)"
excerpt: "Modern anti-bot systems detect Playwright across four signal layers. Here's why your scripts keep failing — and the fix stack that actually works in production."
date: "2026-04-16"
author: "Clawbrowser Team"
authorName: "Clawbrowser Team"
authorRole: "Engineering"
authorGithub: "https://github.com/clawbrowser"
authorTwitter: "https://x.com/clawbrowser"
tags: ["playwright", "browser-automation", "how-to"]
coverImage: "/covers/cover-automation.svg"
---

Playwright is the most popular tool for browser automation in 2026, but production Playwright scripts get blocked constantly. Even on sites that worked perfectly in testing, they hit captcha walls, get stuck in redirect loops, or quietly return empty pages. If this is happening to your AI agent or scraping job, the problem is almost never your logic — it's that modern anti-bot systems have a lot of signals to detect a Playwright-driven browser, and the default Playwright configuration trips most of them.

This article explains why Playwright gets blocked, the specific signals anti-bot systems correlate, and the fix stack that actually works in production for AI agents and automation operators.

---

## Why does Playwright get detected so easily?

Short answer: Playwright emits telltale signals across four layers — JavaScript environment, browser fingerprint, network (TLS) fingerprint, and behavioral patterns. Modern anti-bot systems like Cloudflare Turnstile, Akamai Bot Manager, and DataDome correlate these signals and flag the session if any one layer contradicts the others. Patching a single layer is not enough.

The rest of this article unpacks each layer and the corresponding fix.

---

## Layer 1: JavaScript environment signals

*The direct answer:* Playwright drives Chromium via the Chrome DevTools Protocol (CDP). CDP leaves detectable traces in the JavaScript environment — `navigator.webdriver`, empty plugin arrays, missing `window.chrome` properties, and runtime artifacts — that anti-bot scripts check in the first few hundred milliseconds after page load.

The classic tells:

- `navigator.webdriver === true` — a real user's browser returns `false` or `undefined`. This is the first check every anti-bot script runs.
- `navigator.plugins.length === 0` — a real Chrome has at least the built-in PDF viewer plugin.
- `window.chrome` is missing or incomplete when running headless.
- `navigator.permissions.query({name: 'notifications'})` returns denied behavior that's inconsistent with a real browser.
- Runtime artifacts from CDP (`cdc_*` variables, bound function signatures on core prototypes) if certain wrappers are used.

**Fix:** a `playwright-stealth` plugin handles the obvious ones. Expect this to get you past maybe 20–40% of sites — the ones using off-the-shelf open-source bot detection. For anything past that, keep reading.

---

## Layer 2: Browser fingerprint signals

*The direct answer:* Even with JavaScript flags patched, a stock Chromium running Playwright has a distinctive fingerprint across 20+ surfaces — Canvas 2D, WebGL, AudioContext, Navigator properties, screen metrics, timezone, fonts, media devices, plugins, speech voices, WebRTC policy, and client rects. Anti-bot systems hash these surfaces and compare against known bot signatures.

The failure modes here:

- Canvas fingerprint hash matches millions of known headless Chromium sessions. Default Chromium rendering produces a deterministic bitmap.
- WebGL renderer returns `"SwiftShader"` (software renderer) in headless mode — a huge tell, since real users have GPU-backed rendering.
- AudioContext produces deterministic waveforms across the same platform/version.
- Fonts list is too short — a real browser has hundreds installed, while Playwright containers often have under 50.
- Timezone, locale, and screen size don't match the IP geolocation.

**Fix:** this is where patching falls apart. Per-call JavaScript overrides for each surface introduce timing inconsistencies and are themselves detectable. A stealth browser runtime is the structural answer. Tools like Clawbrowser generate a coherent fingerprint profile at startup and load it into shared memory, so every renderer and GPU sub-process reads identical values without per-call IPC overhead. Steel Browser and Anchor Browser take similar approaches (see our comparison below).

---

## Layer 3: Network fingerprint signals (JA3/TLS)

*The direct answer:* The TLS handshake between your browser and the target site produces a JA3 hash — a fingerprint of the cipher suites, extensions, and curves your client advertises, in the order it advertises them. Anti-bot systems like Cloudflare and Akamai maintain blocklists of JA3 hashes associated with automation tools. Your browser layer can be perfect and still be blocked at the TLS layer before a page even renders.

This is the hardest layer. You can patch every JavaScript flag and spoof every fingerprint surface and still fail here because the signal is emitted below the browser, at the TCP/TLS layer.

Mitigations today:

- Run through a proxy service that performs TLS rewriting (Bright Data offers this as a paid feature).
- Use a browser build that mirrors an exact Chrome release's TLS pattern.
- Accept that the most aggressive Cloudflare/Akamai protections may still detect the TLS layer until stealth browsers close this gap.

> **Note:** Clawbrowser does not currently handle JA3/TLS fingerprinting — this is documented as a known limitation. Steel Browser, Anchor Browser, and Browserbase also do not fully solve this. It's an open problem in the category.

---

## Layer 4: Behavioral signals

*The direct answer:* Modern anti-bot systems watch how the session behaves — mouse movement curvature, typing cadence, scroll velocity, tab-switching patterns, dwell time between interactions. Perfectly deterministic behavior (click, wait exactly 2000ms, click) is itself a tell. Behavioral analysis runs after the session passes Layers 1–3 and catches bots that got past technical detection.

**Fix:** add jitter to wait times, use realistic mouse paths (Playwright's `page.mouse.move` with interpolation), vary typing speed, scroll naturally before interacting. Libraries like `ghost-cursor` help for high-security sites.

---

## The Coherence Principle: why most fixes fail

*The direct answer:* These four signal layers are correlated. Anti-bot systems don't ask "is this a bot?" from any single signal — they ask "is this session coherent?" A Mac user agent with a Linux canvas fingerprint, a US timezone but a Frankfurt IP, and a `navigator.webdriver` patched to `false` but a stock Chromium JA3 hash fails the coherence check. Individual fixes are meaningless if the combination contradicts itself.

We call this the **Coherence Principle**: a browser session passes modern anti-bot detection not because any single signal is "stealthy," but because every signal agrees with every other signal about the same claimed identity.

This is why most DIY Playwright stealth stacks fail after the first few weeks. People patch one signal, ship it, then wonder why a site started blocking again after a provider rotated its detection model to check coherence between two signals that were previously checked independently.

---

<!-- CTA -->

## The fix stack: what actually works in production

The ordered set of interventions, by marginal return:

### Step 1: Patch the easy JavaScript flags

Use `playwright-stealth` (or the Puppeteer equivalent). This handles `navigator.webdriver`, plugin stubs, `chrome.runtime`, and the permissions API. Necessary but not sufficient.

### Step 2: Align viewport, user agent, locale, and timezone

Don't ship a Playwright script with the default 800×600 viewport. Match a realistic screen (1920×1080 for desktop). Ensure `navigator.language`, `Accept-Language`, timezone, and the IP's geolocation all agree — these are coherence checkpoints.

### Step 3: Use a stealth browser runtime

For any site using Cloudflare Turnstile, Akamai Bot Manager, DataDome, or PerimeterX, a stealth runtime is required. Clawbrowser, Steel Browser, and Anchor Browser all offer this; they differ in deployment model and depth of integration. See our head-to-head comparison.

The practical test: if a vendor ships fingerprint control as a binary-level feature (Clawbrowser, Anchor) rather than a runtime plugin (Steel's plugin approach), coherence is easier to maintain under load.

### Step 4: Pair the runtime with sticky residential or mobile proxies

Datacenter IPs are blocklisted everywhere. For serious anti-bot targets, use residential or mobile proxies, and tie each browser profile to a stable IP for the duration of the session. Rotating the IP mid-session breaks continuity — a coherence failure.

Cost is real here: residential proxies typically run $5–15/GB. Budget proxy consumption into your per-task cost model.

### Step 5: Add behavioral realism

Only necessary for top-tier targets (major e-commerce, social platforms, banking UIs). Add jitter, use curved mouse paths, vary typing cadence, simulate realistic dwell time.

### Step 6: For JA3-sensitive sites, accept current limitations or route through a TLS-rewriting proxy

Most stealth browsers haven't closed this gap yet. Plan accordingly.

---

## Common mistakes to avoid

- **Patching only Layer 1.** Almost everyone starts and stops at `navigator.webdriver = false`. Necessary, not sufficient.
- **Changing user agent alone.** Sets up an immediate coherence failure if fingerprint and timezone don't follow.
- **Sharing one proxy across many profiles.** Links the profiles together in the site's backend graph; one blocked profile can torch the rest.
- **Running headless on sites that care.** `headless: true` still has detectable signals on modern Chromium. Use `headless: 'new'` or full headful via a stealth runtime.
- **Reusing a profile that was flagged.** Once a fingerprint has been associated with blocked behavior, even a perfect stack won't save it. Rotate.
- **Using Puppeteer instead of Playwright "to avoid detection."** Both are CDP clients and produce identical detection signals. The library doesn't matter; the runtime does.

---

## Frequently asked questions

### Why does my Playwright script work locally but fail in production?

The production environment usually has a datacenter IP, different system locale, a different font set, or runs headless when your local test was headful. Any of those creates a coherence failure.

### Can I use playwright-stealth and be done?

For low-defense sites, yes. For Cloudflare Turnstile, Akamai, DataDome, or PerimeterX, you need more — specifically, a stealth browser runtime plus sticky residential proxies.

### Does switching to Puppeteer help?

No. Playwright and Puppeteer are both CDP clients. Same detection signals. Same problem.

### Is undetected-chromedriver still a good option?

`undetected-chromedriver` is a Selenium patch that handles some Layer 1 signals. It's better than nothing for simple cases but doesn't address Layers 2–4 at all.

### What's the fastest path to a working setup for AI agents?

Start with a stealth browser runtime (Clawbrowser, Steel Browser, or Anchor Browser) paired with sticky residential proxies. That gets you past most Layer 1–3 detection. Add behavioral realism only if you still hit issues.

### How much should I expect to spend on proxies?

Plan on $5–15/GB for residential proxies with serious providers. A typical AI agent session (login + 20 page navigations with content loading) runs 20–80 MB, so per-session cost sits around $0.15–1.00 before volume discounts. Budget accordingly.

---

## Conclusion: stop patching, start stacking

Playwright detection isn't a problem you solve with one setting. It's solved by stacking coherent defenses across all four signal layers and making sure every signal agrees with every other signal about the same identity — the Coherence Principle.

For AI agents that need reliable browser execution across many sites and many sessions, a stealth browser runtime with integrated proxy routing is almost always cheaper than continuing to patch Playwright scripts. The operational cost of a flaky automation layer — retries, manual intervention, missed tasks — is always higher than it looks.

**Next steps:** if you're evaluating runtimes, start with our three-way comparison of Clawbrowser, Steel Browser, and Anchor Browser. If you want the deeper technical foundation, read our pillar on browser fingerprinting and the 20+ signals anti-bot systems use.
