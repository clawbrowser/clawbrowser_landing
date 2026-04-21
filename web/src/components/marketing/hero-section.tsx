"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
      width="13"
      height="13"
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

export function HeroSection() {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(agentPrompt.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section
      className="relative w-full overflow-hidden px-6 py-28 text-center md:py-36"
      aria-labelledby="hero-heading"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,183,250,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 20%, rgba(67,10,240,0.05) 0%, transparent 60%), #FAFAF8",
      }}
    >
      <div className="relative mx-auto max-w-4xl space-y-7">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-medium text-zinc-500 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
          Early access — now open
        </div>

        <h1
          id="hero-heading"
          className="text-4xl font-semibold tracking-tight text-zinc-950 md:text-6xl lg:text-[4.5rem]"
          style={{ letterSpacing: "-1.5px" }}
        >
          Browser built for AI agents
        </h1>

        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-zinc-500 md:text-xl">
          Clawbrowser is a Chromium fork with built-in fingerprint management
          and transparent proxy routing. Stop fighting captchas and bot detection at scale.
        </p>

        {/* Pre-built prompt block */}
        <div className="relative mx-auto max-w-xl">
          <div
            className="absolute -inset-6 -z-10 rounded-3xl blur-3xl"
            style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,183,250,0.28) 0%, rgba(67,10,240,0.10) 55%, transparent 80%)" }}
          />
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-6 py-6 shadow-md">
            <button
              type="button"
              onClick={copy}
              className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full bg-zinc-950 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-zinc-700 active:scale-95"
            >
              <CopyIcon />
              {copied ? "Copied!" : "Copy prompt"}
            </button>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-700">Let your agent install Clawbrowser</p>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">Pre-built prompt</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-zinc-400">
          Works with Playwright, Puppeteer, and any CDP-compatible tool
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" variant="outline" href="/docs">Documentation</Button>
        </div>
      </div>
    </section>
  );
}
