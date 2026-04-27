const audiences = [
  {
    label: "AI agents",
    title: "AI agents",
    description:
      "Automate with standard CDP. Playwright, Puppeteer, and other DevTools clients attach to a real browser session while fingerprints, proxy routing, and CAPTCHA-reducing identity consistency stay inside the browser.",
  },
  {
    label: "Multi-account",
    title: "Multi-account operators",
    description:
      "Use separate session names and fingerprint IDs to keep endpoints, cookies, storage, generated fingerprint data, and residential/datacenter proxy identities organized.",
  },
];

export function ProblemSolutionSection() {
  return (
    <section
      className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-24"
      aria-labelledby="audience-heading"
    >
      <div className="mx-auto max-w-5xl space-y-14">
        <div className="space-y-3 text-center">
          <p className="text-sm font-medium text-cyan-600">Who it&apos;s for</p>
          <h2 id="audience-heading" className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50" style={{ letterSpacing: "-0.5px" }}>
            Who Clawbrowser is for
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {audiences.map((a) => (
            <div
              key={a.label}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-[#FAFAF8] dark:bg-zinc-900 p-8"
            >
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{a.label}</p>
              <h3 className="mb-3 text-xl font-semibold text-zinc-950 dark:text-zinc-50">{a.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{a.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
