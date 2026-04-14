"use client";

import { useState } from "react";
import Link from "next/link";

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

### 4. Verify installation
clawbrowser --version

### 5. Launch with a fingerprint profile
clawbrowser --fingerprint=my_agent_profile --remote-debugging-port=9222

### 6. Connect your automation framework
browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222")

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

export function BlogCTA() {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(agentPrompt.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-16 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
        Ready to start?
      </p>
      <h3 className="text-xl font-semibold text-zinc-950 mb-2">
        Give your agent a browser
      </h3>
      <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">
        Clawbrowser handles fingerprints, proxies, and sessions. Your agent focuses on the task.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50"
        >
          <CopyIcon />
          {copied ? "Copied!" : "Copy prompt"}
        </button>
        <Link
          href="https://app.qa.clawbrowser.ai/login"
          className="inline-flex items-center rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Get started free
        </Link>
      </div>
    </div>
  );
}
