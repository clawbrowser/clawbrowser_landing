---
title: "Browser Fingerprinting Explained: What It Is and Why Agents Get Blocked"
excerpt: "Websites identify bots not just by IP — they build a fingerprint from dozens of browser signals. Here's what's in that fingerprint and how to control it."
date: "2025-02-10"
author: "Clawbrowser Team"
tags: ["fingerprinting", "explainer", "anti-bot"]
---

Every time a browser visits a website, it leaks a staggering amount of information. Not through cookies — those can be cleared. Through the browser itself.

This collection of signals is called a **browser fingerprint**, and it's how modern bot detection systems tell humans from automated traffic — often with over 99% accuracy.

## What's in a fingerprint

A fingerprint is assembled from dozens of attributes collected silently via JavaScript:

| Signal | Example value |
|--------|--------------|
| User-Agent | `Mozilla/5.0 (Windows NT 10.0; Win64; x64)` |
| Screen resolution | `1920x1080` |
| Timezone | `Europe/Berlin` |
| Installed fonts | Arial, Helvetica, Times New Roman... |
| Canvas fingerprint | Hash of rendered pixel data |
| WebGL renderer | `ANGLE (Intel, UHD Graphics 620)` |
| Audio context | Hash of oscillator output |
| Navigator properties | `hardwareConcurrency: 8`, `deviceMemory: 8` |
| Battery API | `charging: true, level: 0.94` |

No single signal is definitive. Combined, they create a near-unique identifier — even across incognito windows.

## Why headless browsers fail instantly

A default Playwright or Puppeteer instance has a broken fingerprint. It announces itself:

```javascript
// Headless Chrome leaks these:
navigator.webdriver === true        // dead giveaway
navigator.plugins.length === 0      // no plugins installed
screen.width === 0                  // no real screen
WebGL vendor === "Google SwiftShader" // software renderer
```

Any anti-bot system checking these properties will block the session within milliseconds — before your agent executes a single action.

## Canvas fingerprinting in detail

Canvas fingerprinting works by drawing text and shapes to a hidden canvas element, then reading the pixel data as a hash. Different hardware + software combinations produce subtly different renders.

The same drawing on:
- MacBook M2 + Safari → `d4e8f2a1...`
- Windows i7 + Chrome → `9b3c7f44...`
- Linux headless Chrome → `00000000...` (blank — dead giveaway)

## How Clawbrowser handles it

Clawbrowser injects consistent, realistic fingerprints at the browser level — not just HTTP headers. Every session presents as a real, coherent device:

```bash
# Create a profile with a specific device fingerprint
claw profile create --name research \
  --os windows \
  --browser chrome \
  --screen 1920x1080 \
  --timezone America/New_York
```

The fingerprint is consistent across the entire session. Canvas, WebGL, audio — all return values that match the declared hardware. No contradictions for bot detectors to catch.

## The consistency problem

Even a perfect fingerprint fails if it's inconsistent. A Chrome browser claiming to run on macOS but returning Windows-style font metrics will be flagged.

This is where most DIY solutions break down. Getting each individual signal right is table stakes. Getting them to agree with each other is the hard part.

Clawbrowser manages the full signal graph — so your agents don't have to.
