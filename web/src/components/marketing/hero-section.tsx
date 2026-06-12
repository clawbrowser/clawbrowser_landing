"use client";

import { useState } from "react";
import { APP_SIGNUP_URL } from "@/lib/links";
import { INSTALL_AGENT_PROMPT } from "@/lib/install-agent-prompt";

const agentPrompt = INSTALL_AGENT_PROMPT;

const agents = [
  { name: "Claude Code", command: "claude", color: "bg-[#D97757]" },
  { name: "Codex", command: "codex", color: "bg-emerald-500" },
  { name: "Cursor", command: "cursor", color: "bg-violet-500" },
  { name: "Gemini", command: "gemini", color: "bg-blue-500" },
];

const supportedAgents = ["Claude Code", "Codex", "Gemini", "Cursor", "Windsurf"];

const onboardingSteps = [
  {
    title: "Copy prompt",
    detail: "Start with the install prompt and give the agent the setup instructions.",
  },
  {
    title: "Paste into your agent",
    detail: "Any supported coding agent can run the setup flow for you.",
  },
  {
    title: "Sign up for Clawbrowser",
    detail: "Create an account so the agent has somewhere to fetch your API key from.",
  },
  {
    title: "Generate API key",
    detail: "Create a fresh key in the dashboard after signup.",
  },
  {
    title: "Give the key to your agent",
    detail: "The agent finishes setup, verifies the browser, and you are ready to run.",
  },
] as const;

function CopyIcon({ checked = false }: { checked?: boolean }) {
  return checked ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function HeroSection() {
  const [copied, setCopied] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("Claude Code");

  async function copy() {
    setCopied(true);
    try {
      await navigator.clipboard.writeText(agentPrompt);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = agentPrompt;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
  }

  return (
    <section className="relative overflow-hidden px-5 pb-20 pt-14 sm:px-6 sm:pt-20 md:pb-28 md:pt-28" aria-labelledby="hero-heading">
      <div className="hero-grid absolute inset-0 opacity-70 dark:opacity-100" aria-hidden="true" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-cyan-400/15 blur-[120px] dark:bg-cyan-400/20" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 sm:gap-14 lg:grid-cols-[1.04fr_.96fr] lg:gap-16">
        <div className="text-center lg:text-left">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
            A real browser for AI agents
          </p>
          <h1 id="hero-heading" className="text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-zinc-950 dark:text-white sm:text-6xl lg:text-[4.75rem]">
            Let your AI do the browser work.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-7 text-zinc-600 dark:text-slate-300 sm:mt-7 sm:text-lg sm:leading-8 lg:mx-0 lg:max-w-xl">
            Clawbrowser gives Claude, Codex, Gemini, and your own agents a browser that can research, collect data, test websites, and manage logged-in sessions without constant blocks.
          </p>

          <div className="mt-9 hidden flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-zinc-600 dark:text-slate-300 sm:flex lg:justify-start">
            {[
              "Works with your agent",
              "Keeps logins between runs",
              "Built-in fingerprints and proxies",
            ].map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300">✓</span>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div id="install" className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-cyan-400/25 via-blue-500/10 to-violet-500/20 blur-2xl" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white shadow-2xl shadow-cyan-950/10 dark:border-slate-700 dark:bg-[#0b1118] dark:shadow-cyan-950/40">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-slate-700">
              <div>
                <p className="text-sm font-semibold text-zinc-950 dark:text-white">Install with your AI agent</p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-slate-400">No terminal walkthrough required</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">2 minutes</span>
            </div>

            <div className="p-5 sm:p-6">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs leading-5 text-zinc-600 dark:border-slate-700 dark:bg-[#070b10] dark:text-slate-300">
                <span className="text-cyan-700 dark:text-cyan-300">Install Clawbrowser and clawctl</span> by following the official install guide. Use the installer for this OS, connect it to my agent, then start and verify the browser...
              </div>
              <button type="button" onClick={copy} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 text-base font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500">
                <CopyIcon checked={copied} />
                {copied ? "Prompt copied" : "Copy install prompt"}
              </button>

              <div className={`mt-4 rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm transition dark:border-slate-700 dark:bg-[#0e151d] ${copied ? "opacity-70" : ""}`}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-950 dark:text-white">How onboarding works</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-slate-400">Five short steps from prompt to verified browser</p>
                  </div>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:border-slate-700 dark:bg-[#0b1118] dark:text-slate-300">
                    {copied ? "Step 1 done" : "Starts here"}
                  </span>
                </div>

                <div className="space-y-3">
                  {onboardingSteps.map((step, index) => {
                    const isFirst = index === 0;
                    const isSecond = index === 1;
                    const isThird = index === 2;

                    return (
                      <div
                        key={step.title}
                        className={`rounded-2xl border px-3 py-3 transition ${
                          isFirst && copied
                            ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-400/30 dark:bg-emerald-400/10"
                            : "border-zinc-200 bg-zinc-50/80 dark:border-slate-700 dark:bg-[#101821]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                              isFirst && copied
                                ? "bg-emerald-500 text-white"
                                : "bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300"
                            }`}
                          >
                            {isFirst && copied ? "✓" : index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{step.title}</p>

                              {isSecond && (
                                <div className="group relative">
                                  <button
                                    type="button"
                                    className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-slate-700 dark:bg-[#0b1118] dark:text-slate-300 dark:hover:text-white"
                                  >
                                    Supported agents
                                  </button>
                                  <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-64 rounded-2xl border border-zinc-200 bg-white p-3 text-left opacity-0 shadow-xl transition group-hover:opacity-100 group-focus-within:opacity-100 dark:border-slate-700 dark:bg-[#0b1118]">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-slate-500">
                                      Verified in docs
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {supportedAgents.map((agent) => (
                                        <span
                                          key={agent}
                                          className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-medium text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-300"
                                        >
                                          {agent}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {isThird && (
                                <a
                                  href={APP_SIGNUP_URL}
                                  className="inline-flex items-center rounded-full bg-zinc-950 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-slate-950 dark:hover:bg-zinc-200"
                                >
                                  Sign up
                                </a>
                              )}

                              {index === onboardingSteps.length - 1 && (
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
                                  Verified
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-slate-400">{step.detail}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`grid transition-all duration-500 ${copied ? "mt-5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`} aria-hidden={!copied}>
                <div className="overflow-hidden">
                  <div className="border-t border-zinc-200 pt-5 dark:border-slate-700">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">Now paste it into your agent</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {agents.map((agent) => (
                        <button key={agent.name} type="button" onClick={() => setSelectedAgent(agent.name)} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${selectedAgent === agent.name ? "border-cyan-400 bg-cyan-50 text-zinc-950 dark:border-cyan-300 dark:bg-cyan-300 dark:text-slate-950" : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500"}`}>
                          <span className={`h-2.5 w-2.5 rounded-full ${agent.color}`} />
                          {agent.name}
                        </button>
                      ))}
                    </div>
                    <div key={selectedAgent} className="mt-3 rounded-xl bg-zinc-950 px-4 py-3 font-mono text-xs text-zinc-300 dark:bg-black">
                      <div className="flex items-center gap-3">
                        <span className="text-cyan-400">$</span>
                        <span>{agents.find((agent) => agent.name === selectedAgent)?.command}</span>
                        <span className="install-cursor h-4 w-1.5 bg-cyan-300" />
                      </div>
                      <div className="agent-paste mt-2 flex gap-3 border-t border-white/10 pt-2 text-slate-400">
                        <span className="text-violet-400">›</span>
                        <span className="truncate">Install Clawbrowser and clawctl by following...</span>
                        <span className="ml-auto text-emerald-400">pasted</span>
                      </div>
                    </div>
                    <a href="https://discord.gg/mVWydaDK2N" target="_blank" rel="noopener noreferrer" className="mt-4 block text-center text-sm font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-900 dark:text-slate-400 dark:decoration-slate-600 dark:hover:text-white">
                      Need help? Join the Discord
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
