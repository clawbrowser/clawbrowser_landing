import Link from "next/link";
import { USE_CASES } from "@/lib/use-cases";

const examples: Record<string, { audience: string; task: string }> = {
  "ai-agent-automation": { audience: "For AI builders", task: "Give Claude, Codex, or a custom agent a browser it can use across long tasks." },
  "web-scraping": { audience: "For data teams", task: "Collect structured data from dynamic websites without babysitting every run." },
  "multi-account-management": { audience: "For operators", task: "Keep every client, store, or social account in its own persistent profile." },
  "lead-generation": { audience: "For sales teams", task: "Research prospects, enrich records, and prepare outreach from public web data." },
  "price-monitoring": { audience: "For ecommerce", task: "Track competitor prices, inventory, shipping, and product changes on a schedule." },
  "seo-research": { audience: "For SEO teams", task: "Audit search results, compare competitors, and gather content opportunities." },
  "ad-intelligence": { audience: "For marketers", task: "Monitor active ads, landing pages, messaging, and campaign changes." },
  "social-media": { audience: "For social teams", task: "Research trends and manage repeat workflows across logged-in accounts." },
  "ecommerce-ops": { audience: "For retail teams", task: "Check listings, catalog quality, seller activity, and marketplace availability." },
  "developer-testing": { audience: "For product teams", task: "Run browser QA, reproduce user journeys, and verify releases automatically." },
};

function UseCaseIcon({ index }: { index: number }) {
  const paths = [
    <><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 21h8M12 18v3M8 10h8M12 7v6" /></>,
    <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4M8 11h6M11 8v6" /></>,
    <><circle cx="8" cy="8" r="3" /><circle cx="17" cy="8" r="3" /><path d="M2 20a6 6 0 0 1 12 0M12 20a6 6 0 0 1 10 0" /></>,
    <><path d="M4 19V5h16v14H4Z" /><path d="m7 14 3-3 2 2 5-5" /></>,
  ];
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[index % paths.length]}</svg>;
}

export function UseCasesSection() {
  return (
    <section id="use-cases" className="bg-zinc-50 px-5 py-20 dark:bg-[#0b1118] sm:px-6 md:py-28" aria-labelledby="use-cases-heading">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">What people automate</p>
          <h2 id="use-cases-heading" className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white md:text-5xl">
            Useful from the first task. Flexible enough for the hundredth.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-slate-300">
            Start with a plain-language request. Clawbrowser handles the browser identity, session, and connection while your agent does the actual work.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((useCase, index) => {
            const example = examples[useCase.slug];
            return (
              <Link key={useCase.slug} href={`/use-cases/${useCase.slug}/`} className={`group flex min-h-56 flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-xl hover:shadow-cyan-950/5 dark:border-slate-700 dark:bg-[#101821] dark:hover:border-cyan-500/70 ${index === 0 || index === 4 ? "lg:col-span-2" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-300"><UseCaseIcon index={index} /></span>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-slate-500">{example.audience}</span>
                </div>
                <h3 className="mt-6 text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">{useCase.title}</h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600 dark:text-slate-300">{example.task}</p>
                <span className="mt-auto pt-6 text-sm font-semibold text-cyan-700 transition group-hover:translate-x-1 dark:text-cyan-300">See the workflow →</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
