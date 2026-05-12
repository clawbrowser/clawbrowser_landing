import type { Metadata } from "next";
import Link from "next/link";
import { USE_CASES } from "@/lib/use-cases";
import { UseCaseCTA } from "@/components/use-cases/use-case-cta";

export const metadata: Metadata = {
  title: "Use Cases — Clawbrowser",
  description:
    "See how teams use Clawbrowser for AI agent automation, web scraping, multi-account management, lead generation, price monitoring, SEO research, ad intelligence, social media, e-commerce, and developer testing.",
  alternates: { canonical: "https://clawbrowser.ai/use-cases" },
  openGraph: {
    title: "Use Cases — Clawbrowser",
    description:
      "See how teams use Clawbrowser for AI agent automation, web scraping, multi-account management, lead generation, price monitoring, SEO research, and more.",
    url: "https://clawbrowser.ai/use-cases",
    siteName: "Clawbrowser",
    type: "website",
  },
};

const ICONS: Record<string, React.ReactNode> = {
  "ai-agent-automation": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M9 9h.01M15 9h.01M9 13h6" />
    </svg>
  ),
  "web-scraping": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
      <path d="M11 8v6M8 11h6" />
    </svg>
  ),
  "multi-account-management": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  "lead-generation": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.27 12 19.79 19.79 0 0 1 1.15 3.38 2 2 0 0 1 3.12 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
    </svg>
  ),
  "price-monitoring": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  "seo-research": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  "ad-intelligence": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
  ),
  "social-media": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  "ecommerce-ops": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  "developer-testing": (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
};

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0c0c0e]">
      {/* Hero */}
      <div className="border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="mx-auto max-w-5xl px-6 pt-16 pb-14 text-center">
          <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400 mb-3">What you can build</p>
          <h1
            className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl"
            style={{ letterSpacing: "-1px" }}
          >
            Use cases
          </h1>
          <p className="mt-4 mx-auto max-w-xl text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
            Clawbrowser handles browser identity so your automation handles the task. Here are the most common workflows teams build on top of it.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((uc) => (
            <Link
              key={uc.slug}
              href={`/use-cases/${uc.slug}`}
              className="group flex flex-col gap-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-7 shadow-sm transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400">
                {ICONS[uc.slug]}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{uc.title}</h2>
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{uc.tagline}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-600 dark:text-cyan-400 transition-transform group-hover:translate-x-0.5">
                See how it works
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2.5 6.5h8M7 2.5l4 4-4 4" />
                </svg>
              </span>
            </Link>
          ))}
        </div>

        <UseCaseCTA />
      </div>
    </div>
  );
}
