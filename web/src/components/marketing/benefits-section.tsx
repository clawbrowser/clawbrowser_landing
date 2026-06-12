import Link from "next/link";
import { APP_SIGNUP_URL } from "@/lib/links";

const benefits = [
  {
    stat: "↓ blocks",
    title: "Automations that finish",
    description:
      "Consistent browser signals mean fewer interruptions. Sessions complete what they started instead of dying on a CAPTCHA or a login wall halfway through.",
    detail: "Sites detect bots by looking for inconsistencies — a US IP with a German timezone, a headless flag in the user agent, a canvas fingerprint that never changes. Clawbrowser eliminates those contradictions.",
  },
  {
    stat: "↑ scale",
    title: "Hundreds of accounts, one tool",
    description:
      "Create as many isolated profiles as you need. Each one is a separate identity — no cross-contamination, no shared signals that link them together.",
    detail: "Profiles are managed through a single API. You can create, clone, start, and stop them programmatically. No per-seat browser licenses, no manual setup for each account.",
  },
  {
    stat: "↓ cost",
    title: "Less bandwidth, lower proxy bills",
    description:
      "Adblockers pre-installed in every profile strip ads and trackers before they load. Pages are lighter, sessions are faster, and you move less data through paid proxies.",
    detail: "Tracking scripts alone can add 500KB–2MB per page. On residential proxies that adds up quickly. Blocking them at the browser level means you only pay for the content you actually need.",
  },
];

export function BenefitsSection() {
  return (
    <section
      id="benefits"
      className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-24"
      aria-labelledby="benefits-heading"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 space-y-3 text-center">
          <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">Why it matters</p>
          <h2
            id="benefits-heading"
            className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
            style={{ letterSpacing: "-0.5px" }}
          >
            The practical difference
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Most browser automation fails not because the code is wrong — but because the browser looks like a bot.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="flex flex-col gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-[#FAFAF8] dark:bg-zinc-900 p-7"
            >
              <div className="inline-flex items-center rounded-full bg-cyan-50 dark:bg-cyan-950/40 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 w-fit">
                {b.stat}
              </div>
              <div>
                <h3 className="mb-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">{b.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{b.description}</p>
              </div>
              <p className="mt-auto border-t border-zinc-200 dark:border-zinc-700 pt-4 text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
                {b.detail}
              </p>
            </div>
          ))}
        </div>

        {/* CTA row */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={APP_SIGNUP_URL}
            className="inline-flex items-center rounded-full bg-zinc-950 dark:bg-zinc-50 px-6 py-2.5 text-sm font-medium text-white dark:text-zinc-950 transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-200"
          >
            Get started free
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Read the docs
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2.5 6.5h8M7 2.5l4 4-4 4" />
            </svg>
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-[#FAFAF8] px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Found a bug or rough edge?</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Report it in GitHub Issues so the team can track it properly.
              </p>
            </div>
            <a
              href="https://github.com/clawbrowser/clawbrowser/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-white"
            >
              GitHub Issues
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
