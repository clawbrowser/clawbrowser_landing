"use client";

import { useState } from "react";
import Link from "next/link";
import { APP_LOGIN_URL } from "@/lib/links";

const agentPrompt = `Install Clawbrowser and clawctl by following the official Clawbrowser install documentation.

Primary docs:
- https://raw.githubusercontent.com/clawbrowser/clawbrowser/main/INSTALL.md
- https://github.com/clawbrowser/clawbrowser

Instructions:
1. Read INSTALL.md first.
2. Follow the documented installation flow exactly.
3. Start from the standalone clawctl archive for the current OS/arch.
4. Do not download the browser archive manually as the bootstrap path.
5. Do not download the portable runtime manually unless INSTALL.md explicitly documents that as an offline/pre-extracted runtime path.
6. Do not use npm, npx, curl-piped installers, or a raw source checkout as the install path.
7. Run clawctl install so it can install or reuse Clawbrowser and install the portable runtime when needed.
8. Use the documented target/integration selection from INSTALL.md.
9. After installation, verify the browser using the verification steps documented in INSTALL.md.

API key:
- First check \${XDG_CONFIG_HOME:-$HOME/.config}/clawbrowser/config.json.
- If api_key already exists, do not ask again.
- If api_key is missing, ask once for the real API key from https://app.clawbrowser.ai.
- Save it using the documented clawctl config command.
- Never store the API key in shell rc files, environment variables, MCP config, agent config, project files, or logs.

Expected result:
- Standalone clawctl is installed and available.
- clawctl install has completed successfully.
- Clawbrowser is installed or reused.
- The portable Linux runtime is installed only when the host requires it.
- The selected agent integration is configured according to INSTALL.md.
- clawctl start works.
- Browser verification passes according to INSTALL.md.
`;

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function UseCaseCTA() {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(agentPrompt.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="mt-16 rounded-2xl p-px"
      style={{
        background: "linear-gradient(135deg, rgba(6,182,212,0.3) 0%, rgba(99,102,241,0.15) 50%, transparent 100%)",
      }}
    >
      <div className="rounded-2xl border-0 bg-white dark:bg-zinc-900 px-8 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
          Ready to start?
        </p>
        <h3 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 mb-2" style={{ letterSpacing: "-0.3px" }}>
          Give your agent a browser
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 max-w-sm mx-auto leading-relaxed">
          Clawbrowser handles fingerprints, proxies, and session isolation. Your agent focuses on the task.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={copy}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 shadow-sm transition-colors hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          >
            <CopyIcon />
            {copied ? "Copied!" : "Copy install prompt"}
          </button>
          <Link
            href={APP_LOGIN_URL}
            className="inline-flex items-center rounded-full bg-zinc-950 dark:bg-zinc-50 px-5 py-2.5 text-sm font-medium text-white dark:text-zinc-950 transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-200"
          >
            Get started free →
          </Link>
        </div>
        <p className="mt-5 text-xs text-zinc-400 dark:text-zinc-500">
          Works with Playwright, Puppeteer, Claude Code, and any CDP-compatible tool
        </p>
      </div>
    </div>
  );
}
