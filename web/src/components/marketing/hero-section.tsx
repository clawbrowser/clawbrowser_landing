"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const agentPrompt = `Install Clawbrowser automatically.

Primary install path:
curl -fsSL https://raw.githubusercontent.com/clawbrowser/clawbrowser/main/scripts/install.sh | bash -s -- <target>

Targets:
- claude for Claude Code and Claude Desktop
- codex for Codex
- gemini for Gemini CLI
- all for Cursor, other agents, or multi-target install

Fallback references:
- GitHub repo: https://github.com/clawbrowser/clawbrowser
- Latest release: https://github.com/clawbrowser/clawbrowser/releases/latest
- Container image: docker.io/clawbrowser/clawbrowser:latest (for VPS/headless only)
- API key dashboard: https://app.clawbrowser.ai

Requirements:
- Detect the current agent/client and choose the correct install target.
- Do not manually clone the repo.
- On VPS, server, or headless/no-display systems, use the container image for the browser itself.
- On desktop/macOS, the launcher uses Clawbrowser.app automatically.
- Install the correct client integration automatically for the detected target.
- Before asking for an API key, check ~/.config/clawbrowser/config.json — if api_key is already present, skip the prompt entirely.
- Ask for the API key only if first startup actually requires it.
- After obtaining the API key, persist it immediately to browser-managed config:
    CONFIG_DIR="\${XDG_CONFIG_HOME:-\$HOME/.config}/clawbrowser"
    mkdir -p "\$CONFIG_DIR"
    python3 -c "
import json, pathlib, sys
p = pathlib.Path('\$CONFIG_DIR/config.json')
p.write_text(json.dumps({'api_key': sys.argv[1]}, separators=(',',':')) + '\\n')
p.chmod(0o600)
" "THE_KEY"
  This ensures the key is never prompted again.
- Never store the API key in shell rc files, environment variables, or agent config.
- Verify by starting Clawbrowser and confirming a live CDP endpoint responds.
- Only ask for manual action if automation truly cannot complete.
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
          "radial-gradient(ellipse 90% 70% at 50% 48%, rgba(0,183,250,0.13) 0%, transparent 65%), radial-gradient(ellipse 55% 80% at 42% 52%, rgba(0,183,250,0.08) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 58% 44%, rgba(67,10,240,0.06) 0%, transparent 55%), radial-gradient(ellipse 40% 60% at 53% 56%, rgba(0,183,250,0.06) 0%, transparent 50%)",
      }}
    >
      <div className="relative mx-auto max-w-4xl space-y-7">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
          Early access — now open
        </div>

        <h1
          id="hero-heading"
          className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-6xl lg:text-[4.5rem]"
          style={{ letterSpacing: "-1.5px" }}
        >
          Browser built for AI agents
        </h1>

        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-zinc-500 dark:text-zinc-400 md:text-xl">
          Clawbrowser is a Chromium fork with built-in fingerprint management
          and transparent proxy routing. Stop fighting captchas and bot detection at scale.
        </p>

        {/* Pre-built prompt block */}
        <div className="relative mx-auto max-w-xl">
          <div
            className="absolute -inset-6 -z-10 rounded-3xl blur-3xl"
            style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,183,250,0.28) 0%, rgba(67,10,240,0.10) 55%, transparent 80%)" }}
          />
          <div
            role="button"
            tabIndex={0}
            onClick={copy}
            onKeyDown={(e) => e.key === "Enter" && copy()}
            className="group flex cursor-pointer flex-col items-center gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-6 shadow-md transition-shadow hover:shadow-lg active:scale-[0.99]"
          >
            <div className="flex w-full items-center justify-center gap-2.5 rounded-full bg-zinc-950 px-8 py-4 text-base font-semibold text-white transition-all group-hover:bg-zinc-800 group-hover:shadow-[0_0_24px_rgba(0,183,250,0.35)] dark:group-hover:shadow-[0_0_28px_rgba(0,183,250,0.25)]">
              <CopyIcon />
              {copied ? "Copied!" : "Copy prompt"}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Let your agent install Clawbrowser</p>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Pre-built prompt</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          Works with Playwright, Puppeteer, and any CDP-compatible tool
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" variant="outline" href="/docs">Documentation</Button>
          <Button size="lg" variant="outline" href="https://github.com/clawbrowser/clawbrowser/releases">Download</Button>
          <a
            href="https://github.com/clawbrowser/clawbrowser"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 transition-colors hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-950 dark:hover:text-zinc-100"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
