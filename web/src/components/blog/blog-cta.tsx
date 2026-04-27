"use client";

import { useState } from "react";
import Link from "next/link";
import { APP_LOGIN_URL } from "@/lib/links";

const agentPrompt = `# Task: Install and Deploy Clawbrowser

You are an AI agent. Your task is to install and configure Clawbrowser on the target system so it is ready for browser automation.

## What is Clawbrowser?
Clawbrowser is a Chromium-based browser built for automation that provides:
- Managed browser sessions with reusable browser state
- Browser fingerprint profiles with profile-bound residential/datacenter proxy routing
- Standard Chrome DevTools Protocol (CDP) interface

## Prerequisites
Before starting, confirm:
- Operating system: [TARGET_OS] (macOS or Linux)
- Architecture: [ARCH] (e.g., x86_64, arm64)
- Clawbrowser API key: [CLAWBROWSER_API_KEY] - obtain one at https://app.clawbrowser.ai
- Internet access available: yes/no

## Installation Steps

### 1. Install Clawbrowser
Use the official install script for this agent:

curl -fsSL https://raw.githubusercontent.com/clawbrowser/clawbrowser/main/scripts/install.sh | bash -s -- <target>

Targets: claude, codex, gemini, all.

### 2. Set API key
export CLAWBROWSER_API_KEY=[CLAWBROWSER_API_KEY]

Use this as a temporary environment variable for the current automation run. If the launcher prompts for the key, let it save the key to ~/.config/clawbrowser/config.json.

### 3. Start a managed session
clawbrowser start --session work -- https://example.com

### 4. Read the CDP endpoint
clawbrowser endpoint --session work

### 5. Connect your automation framework
endpoint = "http://127.0.0.1:9222"  # replace with the endpoint returned by clawbrowser endpoint
browser = await p.chromium.connect_over_cdp(endpoint)

## Done
Confirm Clawbrowser is running and the CDP endpoint returned by the launcher is reachable.
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
    <div className="mt-16 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
        Ready to start?
      </p>
      <h3 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50 mb-2">
        Give your agent a browser
      </h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm mx-auto">
        Clawbrowser handles fingerprints, proxies, and sessions. Your agent focuses on the task.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 shadow-sm transition-colors hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700"
        >
          <CopyIcon />
          {copied ? "Copied!" : "Copy prompt"}
        </button>
        <Link
          href={APP_LOGIN_URL}
          className="inline-flex items-center rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Get started free
        </Link>
      </div>
    </div>
  );
}
