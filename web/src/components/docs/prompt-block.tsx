"use client";

import { useState } from "react";

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
          className="flex items-center gap-1.5 rounded-md bg-cyan-600 dark:bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-700 dark:hover:bg-cyan-400 active:bg-cyan-800"
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
