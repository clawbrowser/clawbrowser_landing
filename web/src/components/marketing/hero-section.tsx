"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { APP_SIGNUP_URL } from "@/lib/links";
import { INSTALL_AGENT_PROMPT } from "@/lib/install-agent-prompt";

const agentPrompt = INSTALL_AGENT_PROMPT;

const audiences = {
  builders: {
    label: "For AI Builders",
    eyebrow: "A real browser for AI agents",
    title: "Give your agent a browser that does not get blocked.",
    description:
      "Clawbrowser gives Claude Code, Codex, Gemini, and your own agents a real browser for research, testing, logged-in workflows, and data collection.",
    bullets: [
      "Works with your existing agent",
      "Keeps logins between runs",
      "Built-in fingerprints and proxies",
    ],
    promptHint: "Paste into Claude Code, Codex, Cursor, or Gemini and let the agent handle setup.",
  },
  growth: {
    label: "For Growth Teams",
    eyebrow: "A real browser for browser-based operations",
    title: "Run research and monitoring workflows without babysitting the browser.",
    description:
      "Use the same browser runtime for lead research, competitor monitoring, logged-in account work, and repeatable workflows that break in ordinary automation.",
    bullets: [
      "Lead research without tab chaos",
      "Scheduled monitoring across real sites",
      "Persistent logged-in sessions for repeat work",
    ],
    promptHint: "Paste into your agent, connect an API key, and use the same setup for research, scraping, and monitoring jobs.",
  },
} as const;

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
  const [audience, setAudience] = useState<keyof typeof audiences>("builders");
  const current = audiences[audience];

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
          <div className="mb-5 inline-flex rounded-full border border-zinc-200 bg-white/90 p-1 shadow-sm dark:border-slate-700 dark:bg-[#0f1720]/90">
            {(Object.entries(audiences) as [keyof typeof audiences, (typeof audiences)[keyof typeof audiences]][]).map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() => setAudience(key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  audience === key
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {value.label}
              </button>
            ))}
          </div>
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
            {current.eyebrow}
          </p>
          <h1 id="hero-heading" className="text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-zinc-950 dark:text-white sm:text-6xl lg:text-[4.75rem]">
            {current.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-7 text-zinc-600 dark:text-slate-300 sm:mt-7 sm:text-lg sm:leading-8 lg:mx-0 lg:max-w-xl">
            {current.description}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
            <Button href={APP_SIGNUP_URL} size="lg" className="w-full justify-center bg-cyan-500 text-slate-950 hover:bg-cyan-400 sm:w-auto">
              Get started free
            </Button>
            <p className="text-sm text-zinc-500 dark:text-slate-400">
              Sign up, get an API key, then copy the install prompt below.
            </p>
          </div>

          <div className="mt-9 hidden flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-zinc-600 dark:text-slate-300 sm:flex lg:justify-start">
            {current.bullets.map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300">✓</span>
                {item}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-zinc-500 dark:text-slate-400 lg:justify-start">
            <a
              href="https://github.com/clawbrowser/clawbrowser"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-1.5 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-slate-500 dark:hover:text-white"
            >
              <span aria-hidden="true">★</span>
              5 stars on GitHub
            </a>
            <span>Works with Claude Code, Codex, Cursor, and Gemini</span>
            <span>Open source browser runtime</span>
          </div>
        </div>

        <div id="install" className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-cyan-400/25 via-blue-500/10 to-violet-500/20 blur-2xl" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white shadow-2xl shadow-cyan-950/10 dark:border-slate-700 dark:bg-[#0b1118] dark:shadow-cyan-950/40">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-slate-700">
              <div>
                <p className="text-sm font-semibold text-zinc-950 dark:text-white">Start with one prompt</p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-slate-400">Get your API key, then copy the setup prompt</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">2 minutes</span>
            </div>

            <div className="p-5 sm:p-6">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs leading-5 text-zinc-600 dark:border-slate-700 dark:bg-[#070b10] dark:text-slate-300">
                <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-400 dark:text-slate-500">1. Get API key  2. Copy prompt</div>
                <div className="mt-2">
                  <span className="text-cyan-700 dark:text-cyan-300">Install Clawbrowser and clawctl</span> by following the official install guide. Use the installer for this OS, connect it to my agent, then start and verify the browser...
                </div>
              </div>
              <button type="button" onClick={copy} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 text-base font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500">
                <CopyIcon checked={copied} />
                {copied ? "Prompt copied" : "Copy prompt"}
              </button>

              <div className={`grid transition-all duration-500 ${copied ? "mt-5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`} aria-hidden={!copied}>
                <div className="overflow-hidden">
                  <div className="border-t border-zinc-200 pt-5 dark:border-slate-700">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">Now paste it into your agent</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-slate-400">{current.promptHint}</p>
                    <div className="mt-3 rounded-xl bg-zinc-950 px-4 py-3 font-mono text-xs text-zinc-300 dark:bg-black">
                      <div className="flex items-center gap-3">
                        <span className="text-cyan-400">$</span>
                        <span>your-agent</span>
                        <span className="install-cursor h-4 w-1.5 bg-cyan-300" />
                      </div>
                      <div className="agent-paste mt-2 flex gap-3 border-t border-white/10 pt-2 text-slate-400">
                        <span className="text-violet-400">›</span>
                        <span className="truncate">Install Clawbrowser and clawctl by following...</span>
                        <span className="ml-auto text-emerald-400">pasted</span>
                      </div>
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
