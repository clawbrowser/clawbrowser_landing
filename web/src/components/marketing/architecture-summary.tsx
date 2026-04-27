export function ArchitectureSummary() {
  return (
    <section
      id="architecture"
      className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-24"
      aria-labelledby="architecture-heading"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <div className="space-y-5">
          <p className="text-sm font-medium text-cyan-600">Architecture</p>
          <h2 id="architecture-heading" className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50" style={{ letterSpacing: "-0.5px" }}>
            One profile, consistent runtime
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Clawbrowser is a Chromium fork with native patches for fingerprint
            profiles and proxy credentials. In fingerprint mode, the generated
            profile is loaded into the relevant browser processes early, so
            renderer and GPU code read the same process-local values without
            automation-side glue.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-[#FAFAF8] dark:bg-zinc-900 p-6">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-950/30">
              <svg className="h-4 w-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Built-in verification</h3>
            <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              The browser includes an internal verification page for checking
              proxy egress and generated JavaScript surfaces when you need to
              validate an identity before your agent touches the page.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-[#FAFAF8] dark:bg-zinc-900 p-6">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-950/30">
              <svg className="h-4 w-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Zero glue code</h3>
            <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Fingerprint spoofing and proxy routing happen inside the binary. Your
              automation scripts connect via standard CDP—no middleware, no wrappers,
              no per-call configuration.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
