const steps = [
  { label: "Open 36 product pages", status: "done" },
  { label: "Collect price and stock", status: "done" },
  { label: "Compare with last week", status: "active" },
  { label: "Export the report", status: "waiting" },
];

export function ProductDemoSection() {
  return (
    <section className="border-y border-zinc-200 bg-white px-5 py-20 dark:border-slate-800 dark:bg-[#070b10] sm:px-6 md:py-28" aria-labelledby="demo-heading">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[.82fr_1.18fr] lg:gap-16">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">See it work</p>
          <h2 id="demo-heading" className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-white md:text-5xl">
            Ask for the outcome. Your agent handles the tabs.
          </h2>
          <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-slate-300">
            This example checks competitor prices across dozens of pages, compares the results, and prepares a clean report. The same setup works for research, lead lists, QA, social media, and account operations.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              ["36", "pages checked"],
              ["4 min", "instead of hours"],
              ["1 prompt", "from start to report"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/70">
                <p className="text-xl font-bold text-zinc-950 dark:text-white">{value}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="demo-shell overflow-hidden rounded-[1.75rem] border border-zinc-300 bg-zinc-100 shadow-2xl shadow-zinc-950/15 dark:border-slate-700 dark:bg-[#0b1118]">
          <div className="flex items-center gap-2 border-b border-zinc-300 bg-white px-4 py-3 dark:border-slate-700 dark:bg-[#101821]">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <div className="mx-auto rounded-lg bg-zinc-100 px-12 py-1.5 text-[11px] text-zinc-500 dark:bg-black/40 dark:text-slate-400">Clawbrowser session · market-watch</div>
          </div>
          <div className="grid min-h-[410px] md:grid-cols-[1.2fr_.8fr]">
            <div className="relative overflow-hidden border-b border-zinc-300 bg-white p-5 dark:border-slate-700 dark:bg-[#f4f7fa] md:border-b-0 md:border-r">
              <div className="mb-4 flex items-center justify-between">
                <div className="h-3 w-24 rounded bg-zinc-900" />
                <div className="h-7 w-20 rounded-lg bg-cyan-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {["$129", "$117", "$132", "$124", "$119", "$126"].map((price, index) => (
                  <div key={price} className={`demo-product rounded-xl border border-zinc-200 bg-white p-3 shadow-sm demo-delay-${index + 1}`}>
                    <div className="h-20 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200" />
                    <div className="mt-3 h-2.5 w-3/4 rounded bg-zinc-300" />
                    <div className="mt-2 flex items-center justify-between"><span className="text-sm font-bold text-zinc-900">{price}</span><span className="h-2 w-8 rounded bg-emerald-300" /></div>
                  </div>
                ))}
              </div>
              <div className="demo-pointer absolute left-[22%] top-[34%] h-5 w-5 rotate-[-20deg] text-zinc-950">◆</div>
            </div>
            <div className="bg-zinc-950 p-5 text-white dark:bg-[#05080c]">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400 font-bold text-zinc-950">C</span>
                <div><p className="text-sm font-semibold">Price monitor</p><p className="text-[11px] text-slate-400">Agent is working</p></div>
                <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              </div>
              <p className="mt-5 rounded-xl bg-white/5 p-3 text-xs leading-5 text-slate-300">Check these stores for the latest price and stock. Compare with last week and export changes above 5%.</p>
              <div className="mt-5 space-y-3">
                {steps.map((step) => (
                  <div key={step.label} className="flex items-center gap-3 text-xs">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full ${step.status === "done" ? "bg-emerald-400 text-zinc-950" : step.status === "active" ? "demo-spinner border-2 border-cyan-300 border-r-transparent" : "border border-slate-600 text-slate-500"}`}>{step.status === "done" ? "✓" : ""}</span>
                    <span className={step.status === "waiting" ? "text-slate-500" : "text-slate-200"}>{step.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
                <p className="text-[11px] font-semibold text-emerald-300">Live result</p>
                <p className="mt-1 text-xs text-slate-300">12 price changes found · 3 items low in stock</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
