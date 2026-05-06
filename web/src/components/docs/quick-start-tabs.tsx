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
- Browser verification passes according to INSTALL.md.`;

const AGENTS = [
  {
    id: "claude",
    label: "Claude Code",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
      </svg>
    ),
    instruction: "Paste this prompt into Claude Code or Claude Desktop to install automatically.",
  },
  {
    id: "codex",
    label: "Codex",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
      </svg>
    ),
    instruction: "Paste this prompt into Codex CLI to install automatically.",
  },
  {
    id: "gemini",
    label: "Gemini CLI",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M11.9985 0C6.7192 7.0758 4.0798 10.7691 4.0798 12c0 1.2311 2.6394 4.9244 7.9187 12 5.2793-7.0756 7.9188-10.7689 7.9188-12 0-1.2309-2.6395-4.9242-7.9188-12z"/>
      </svg>
    ),
    instruction: "Paste this prompt into Gemini CLI to install automatically.",
  },
  {
    id: "all",
    label: "Cursor & others",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/>
      </svg>
    ),
    instruction: "Paste this prompt into Cursor, Windsurf, or any other AI agent to install automatically.",
  },
] as const;

type AgentId = (typeof AGENTS)[number]["id"];

function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function QuickStartTabs() {
  const [active, setActive] = useState<AgentId>("claude");
  const [copied, setCopied] = useState(false);

  const agent = AGENTS.find((a) => a.id === active)!;

  function copy() {
    navigator.clipboard.writeText(agentPrompt.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800 px-3 pt-3 pb-0">
        {AGENTS.map((a) => (
          <button
            key={a.id}
            onClick={() => setActive(a.id)}
            className={`cursor-pointer flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2 ${
              active === a.id
                ? "border-zinc-950 dark:border-zinc-50 bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {agent.instruction}
        </p>

        {/* Prompt block */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Install prompt
            </span>
            <button
              type="button"
              onClick={copy}
              className="flex cursor-pointer items-center gap-1.5 rounded-md bg-zinc-200 dark:bg-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-300 dark:hover:bg-zinc-600"
            >
              <CopyIcon />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          {/* Body */}
          <div className="bg-white dark:bg-zinc-900 p-4 max-h-64 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              {agentPrompt}
            </pre>
          </div>
        </div>

        <div className="mt-6 border-t border-zinc-100 dark:border-zinc-800 pt-5">
          <a
            href="https://app.clawbrowser.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-950 dark:bg-white px-5 py-3 text-sm font-semibold text-white dark:text-zinc-950 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-100"
          >
            Get API key → app.clawbrowser.ai
          </a>
        </div>
      </div>
    </div>
  );
}
