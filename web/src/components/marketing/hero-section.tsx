"use client";

import { useState } from "react";
import { APP_SIGNUP_URL } from "@/lib/links";
import { INSTALL_AGENT_PROMPT } from "@/lib/install-agent-prompt";

const agentPrompt = INSTALL_AGENT_PROMPT;

const agentRail = [
  { name: "Codex", accent: "bg-emerald-500" },
  { name: "Claude Code", accent: "bg-orange-400" },
  { name: "Hermes", accent: "bg-violet-500" },
  { name: "OpenClaw", accent: "bg-cyan-500" },
] as const;

const onboardingSteps = [
  {
    title: "Paste into your agent",
    detail: "",
  },
  {
    title: "Sign up for Clawbrowser",
    detail: "",
  },
  {
    title: "Generate API key",
    detail: "In the dashboard.",
  },
  {
    title: "Give the key to your agent",
    detail: "Finish setup and verify the browser.",
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
              <button
                type="button"
                onClick={copy}
                className={`mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-base font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 ${
                  copied
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"
                    : "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400"
                }`}
              >
                <CopyIcon checked={copied} />
                {copied ? "Prompt copied" : "Copy install prompt"}
              </button>

              <div className={`grid transition-all duration-500 ${copied ? "mt-5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`} aria-hidden={!copied}>
                <div className="overflow-hidden">
                  <div className="pt-4">
                    <div className="mt-1 space-y-4">
                      {onboardingSteps.map((step, index) => {
                        const isPasteStep = index === 0;
                        const isSignupStep = index === 1;

                        return (
                          <div key={step.title} className="relative grid grid-cols-[3rem_1fr] items-center gap-4">
                            {index !== onboardingSteps.length - 1 && (
                              <div className="absolute left-6 top-1/2 h-[calc(100%+1rem)] w-px -translate-x-1/2 bg-zinc-200 dark:bg-slate-700" />
                            )}

                            <div className="relative z-10 flex h-8 w-8 items-center justify-center self-center justify-self-center rounded-full border border-cyan-200 bg-cyan-50 text-[11px] font-semibold text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-300">
                              {index + 2}
                            </div>

                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-slate-700 dark:bg-[#101821]">
                              <div className="flex flex-wrap items-center gap-2 gap-y-3">
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{step.title}</p>
                              </div>
                              {isPasteStep ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {agentRail.map((agent) => (
                                    <span
                                      key={agent.name}
                                      className="inline-flex cursor-default items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-transform duration-200 hover:scale-105 dark:border-slate-700 dark:bg-[#0b1118] dark:text-slate-300"
                                    >
                                      <span className={`h-2.5 w-2.5 rounded-full ${agent.accent}`} />
                                      {agent.name}
                                    </span>
                                  ))}
                                </div>
                              ) : step.detail ? (
                                <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-slate-400">{step.detail}</p>
                              ) : null}
                              {isSignupStep && (
                                <div className="mt-3">
                                  <a
                                    href={APP_SIGNUP_URL}
                                    className="inline-flex min-h-10 items-center gap-2 rounded-full bg-zinc-950 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-slate-950 dark:hover:bg-zinc-200"
                                  >
                                    Sign up
                                    <span aria-hidden="true">→</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
