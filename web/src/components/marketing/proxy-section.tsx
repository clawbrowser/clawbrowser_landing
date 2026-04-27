const proxyItems = [
  {
    text: "For proxy-backed profiles, proxy credentials and geo metadata come from the generated profile.",
  },
  {
    text: "One proxy identity per browser session; no mid-session rotation inside a single run.",
  },
  {
    code: "clawbrowser rotate --session <name>",
    prefix: "To restart a managed session with",
    suffix: "use rotate; sessions started with fingerprint flags will pass --regenerate to the browser.",
  },
];

export function ProxySection() {
  return (
    <section id="proxy" className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-24" aria-labelledby="proxy-heading">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-12 md:grid-cols-2 md:gap-20">
          <div className="space-y-5">
            <p className="text-sm font-medium text-cyan-600">Proxy routing</p>
            <h2 id="proxy-heading" className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50" style={{ letterSpacing: "-0.5px" }}>
              Proxy routing from the fingerprint profile
            </h2>
            <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              When a generated fingerprint profile includes proxy credentials,
              Clawbrowser uses that profile-bound proxy configuration for the
              browser session.
            </p>
          </div>
          <ul className="space-y-3">
            {proxyItems.map((item, i) => (
              <li key={i} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-[#FAFAF8] dark:bg-zinc-900 p-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {"code" in item ? (
                  <>
                    {item.prefix}{" "}
                    <code className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:text-zinc-300">
                      {item.code}
                    </code>{" "}
                    {item.suffix}
                  </>
                ) : (
                  item.text
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
