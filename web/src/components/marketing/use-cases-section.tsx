import Link from "next/link";
import { USE_CASES } from "@/lib/use-cases";

const featuredUseCases = [
  {
    slug: "lead-generation",
    eyebrow: "Sales research",
    title: "Turn prospect research into a ready-to-send list",
    description:
      "An agent can search public company pages, verify roles, collect contact details, and hand the rep a clean lead list instead of a pile of tabs.",
    outcome: "Research, enrichment, and CRM prep in one pass.",
  },
  {
    slug: "price-monitoring",
    eyebrow: "Ecommerce ops",
    title: "Watch competitor prices without babysitting the browser",
    description:
      "Run a scheduled browser job across stores and marketplaces, compare against the last run, and get a report when something changes.",
    outcome: "Price drops, stock changes, and new variants in one report.",
  },
  {
    slug: "developer-testing",
    eyebrow: "QA",
    title: "Reproduce the user journey your tests keep missing",
    description:
      "Have the agent open the real site, log in, click through the flow, and surface the step where the release broke.",
    outcome: "A real browser session, not a synthetic replay.",
  },
];

function UseCaseIcon({ slug }: { slug: string }) {
  switch (slug) {
    case "lead-generation":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.27 12 19.79 19.79 0 0 1 1.15 3.38 2 2 0 0 1 3.12 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
        </svg>
      );
    case "price-monitoring":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
  }
}

export function UseCasesSection() {
  return (
    <section id="use-cases" className="bg-zinc-50 px-5 py-20 dark:bg-[#0b1118] sm:px-6 md:py-28" aria-labelledby="use-cases-heading">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Real work</p>
          <h2 id="use-cases-heading" className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white md:text-5xl">
            One browser, a few jobs people actually care about.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-slate-300">
            Instead of a wall of category cards, show the reader the result first. Then let them click into the deeper use-case pages only if they want the full walkthrough.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <Link
            href={`/use-cases/${featuredUseCases[0].slug}/`}
            className="group flex min-h-[22rem] flex-col rounded-[1.75rem] border border-zinc-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-xl hover:shadow-cyan-950/5 dark:border-slate-700 dark:bg-[#101821] dark:hover:border-cyan-500/70"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-300">
                <UseCaseIcon slug={featuredUseCases[0].slug} />
              </span>
              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-300">
                {featuredUseCases[0].eyebrow}
              </span>
            </div>
            <div className="mt-8 max-w-xl">
              <h3 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">{featuredUseCases[0].title}</h3>
              <p className="mt-4 text-base leading-7 text-zinc-600 dark:text-slate-300">{featuredUseCases[0].description}</p>
            </div>
            <div className="mt-auto border-t border-zinc-200 pt-5 dark:border-slate-700">
              <p className="text-sm font-semibold text-zinc-950 dark:text-white">{featuredUseCases[0].outcome}</p>
              <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                Read the workflow
                <span>→</span>
              </span>
            </div>
          </Link>

          <div className="grid gap-4">
            {featuredUseCases.slice(1).map((useCase) => (
              <Link
                key={useCase.slug}
                href={`/use-cases/${useCase.slug}/`}
                className="group flex min-h-0 flex-col rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-xl hover:shadow-cyan-950/5 dark:border-slate-700 dark:bg-[#101821] dark:hover:border-cyan-500/70"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-300">
                    <UseCaseIcon slug={useCase.slug} />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-slate-500">{useCase.eyebrow}</span>
                </div>
                <h3 className="mt-6 text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">{useCase.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-slate-300">{useCase.description}</p>
                <p className="mt-4 text-sm font-semibold text-zinc-950 dark:text-white">{useCase.outcome}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-zinc-200 bg-white px-6 py-4 shadow-sm dark:border-slate-700 dark:bg-[#101821]">
          <p className="text-sm text-zinc-600 dark:text-slate-300">
            Want the deeper version? The full use-case pages spell out the setup, steps, and example prompts.
          </p>
          <Link href="/use-cases/" className="inline-flex items-center rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
            See all use cases
          </Link>
        </div>
      </div>
    </section>
  );
}
