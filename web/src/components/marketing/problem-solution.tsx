const audiences = [
  {
    label: "AI agents",
    title: "AI agents",
    description:
      "Automate with standard CDP—Playwright, Puppeteer, or anything that speaks DevTools. Fingerprints and proxy routing stay consistent so your agent sees a normal browser, not a brittle puppet.",
  },
  {
    label: "Multi-account",
    title: "Multi-account operators",
    description:
      "Each fingerprint ID maps to its own profile directory: cookies, storage, and identity move together. Separate accounts stay separated on disk by design.",
  },
];

export function ProblemSolutionSection() {
  return (
    <section
      className="border-t border-zinc-200 bg-white px-6 py-24"
      aria-labelledby="audience-heading"
    >
      <div className="mx-auto max-w-5xl space-y-14">
        <div className="space-y-3 text-center">
          <p className="text-sm font-medium text-cyan-600">Who it's for</p>
          <h2 id="audience-heading" className="text-3xl font-semibold tracking-tight text-zinc-950" style={{ letterSpacing: "-0.5px" }}>
            Who Clawbrowser is for
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {audiences.map((a) => (
            <div
              key={a.label}
              className="rounded-2xl border border-zinc-200 bg-[#FAFAF8] p-8"
            >
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400">{a.label}</p>
              <h3 className="mb-3 text-xl font-semibold text-zinc-950">{a.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-500">{a.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
