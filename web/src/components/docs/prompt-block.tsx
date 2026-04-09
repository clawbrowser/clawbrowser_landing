"use client";

import { useState } from "react";

const agentPrompt = `# Task: Install and Deploy Clawbrowser

You are an AI agent. Your task is to install and configure Clawbrowser on the target system so it is ready for browser automation.

## What is Clawbrowser?
Clawbrowser is an anti-detect browser built on Chromium that provides:
- Managed browser fingerprints (unique, realistic, cached locally)
- Proxy routing (one proxy per session for realistic behavior)
- Standard Chrome DevTools Protocol (CDP) interface
- Machine-readable JSON output mode for AI agents

## Prerequisites
Before starting, confirm:
- Operating system: [TARGET_OS] (e.g., Ubuntu 22.04, macOS 14, Windows 11)
- Architecture: [ARCH] (e.g., x86_64, arm64)
- Clawbrowser API key: [CLAWBROWSER_API_KEY] — obtain one at https://clawbrowser.ai
- Internet access available: yes/no

## Installation Steps

### 1. Download Clawbrowser
Download the appropriate binary for [TARGET_OS]/[ARCH] from:
[DOWNLOAD_URL] (check https://clawbrowser.ai/download for the latest release)

### 2. Install
[INSTALL_INSTRUCTIONS] (e.g., extract archive, move binary to /usr/local/bin, set permissions)

### 3. Set API key
export CLAWBROWSER_API_KEY=[CLAWBROWSER_API_KEY]

Add to shell profile (~/.bashrc, ~/.zshrc, or equivalent) to persist across sessions.

### 4. Verify installation
clawbrowser --version

### 5. Launch with a fingerprint profile
clawbrowser --fingerprint=my_agent_profile --remote-debugging-port=9222

Expected output:
[clawbrowser] Profile my_agent_profile loaded
[clawbrowser] Proxy verified
[clawbrowser] Fingerprint verified
[clawbrowser] CDP listening on ws://127.0.0.1:9222
[clawbrowser] Browser ready

### 6. Connect your automation framework
# Playwright (Python)
browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222")

# Playwright (Node.js)
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');

# Puppeteer
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });

## Notes
- Profile IDs can be any descriptive string (e.g., "us_agent_1", "scraper_main")
- First launch generates and caches the fingerprint; subsequent launches reuse it
- Use --output=json for machine-readable events (parse "ready" event before attaching)
- Use --headless for headless operation
- Run multiple agents on different ports: --remote-debugging-port=9223, 9224, etc.
- Profiles are isolated: separate cookies, localStorage, and browser history

## Done
Confirm Clawbrowser is running and the CDP endpoint is reachable at http://127.0.0.1:9222.
`;

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function PromptBlock() {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(agentPrompt.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-cyan-200 bg-cyan-50 shadow-sm">
      <div className="flex items-center justify-between border-b border-cyan-200 px-4 py-3">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
            Pre-built prompt
          </p>
          <p className="text-sm font-medium text-zinc-800">
            Use this prompt to get started faster
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-700 active:bg-cyan-800"
        >
          <CopyIcon />
          {copied ? "Copied!" : "Copy prompt"}
        </button>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs leading-relaxed text-zinc-500">
          Drop this into any AI agent (Claude, GPT-4, Gemini, etc.) to have it
          automatically install and deploy Clawbrowser. Fill in the{" "}
          <code className="rounded bg-cyan-100 px-1 py-0.5 text-cyan-800">
            [BRACKETED]
          </code>{" "}
          placeholders before sending — or let the agent ask you for them.
        </p>
      </div>
    </div>
  );
}
