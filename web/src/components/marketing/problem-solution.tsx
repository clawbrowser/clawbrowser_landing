const audiences = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
        <path d="M9 9h.01M15 9h.01M9 13h6" />
      </svg>
    ),
    label: "AI developers",
    title: "Building AI agents",
    description:
      "Your agent needs a browser that works like a real person's. Clawbrowser handles the identity layer so the agent can focus on the actual task — no more CAPTCHA walls mid-run.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    label: "Growth & marketing",
    title: "Managing multiple accounts",
    description:
      "Every account lives in a completely isolated browser profile. Platforms see independent users — not one person switching between logins.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    label: "Data & research teams",
    title: "Scraping & monitoring",
    description:
      "Run dozens of parallel scraping jobs without getting rate-limited. Rotate browser identities and IPs between runs so each request looks like a new visitor.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    label: "SaaS builders",
    title: "Building automation tools",
    description:
      "Ship browser automation features to your customers without building the identity stack yourself. Clawbrowser plugs into any Playwright or Puppeteer setup.",
  },
];

export function ProblemSolutionSection() {
  return (
    <section
      className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-24"
      aria-labelledby="audience-heading"
    >
      <div className="mx-auto max-w-5xl space-y-12">
        <div className="space-y-3 text-center">
          <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">Who it&apos;s for</p>
          <h2
            id="audience-heading"
            className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
            style={{ letterSpacing: "-0.5px" }}
          >
            Who uses Clawbrowser
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Anyone who needs a browser that looks human and keeps sessions separate.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map((a) => (
            <div
              key={a.label}
              className="flex flex-col gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-[#FAFAF8] dark:bg-zinc-900 p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400">
                {a.icon}
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  {a.label}
                </p>
                <h3 className="mb-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">{a.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
