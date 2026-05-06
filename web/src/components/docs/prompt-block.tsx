"use client";

import { useState } from "react";

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
    <div className="mt-6 overflow-hidden rounded-2xl border border-cyan-200 dark:border-cyan-900 bg-cyan-50 dark:bg-cyan-950/20 shadow-sm">
      <div className="flex items-center justify-between border-b border-cyan-200 dark:border-cyan-900 px-4 py-3">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
            Pre-built prompt
          </p>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Use this prompt to get started faster
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex cursor-pointer items-center gap-1.5 rounded-md bg-cyan-600 dark:bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-700 dark:hover:bg-cyan-400 active:bg-cyan-800"
        >
          <CopyIcon />
          {copied ? "Copied!" : "Copy prompt"}
        </button>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Drop this into any AI agent (Claude, GPT-4, Gemini, etc.) to have it
          automatically install and deploy Clawbrowser. Fill in the{" "}
          <code className="rounded bg-cyan-100 dark:bg-cyan-900/40 px-1 py-0.5 text-cyan-800 dark:text-cyan-300">
            [BRACKETED]
          </code>{" "}
          placeholders before sending — or let the agent ask you for them.
        </p>
      </div>
    </div>
  );
}
