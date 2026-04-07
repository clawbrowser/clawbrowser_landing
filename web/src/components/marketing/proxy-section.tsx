const proxyItems = [
  {
    text: "Provider-agnostic: residential, datacenter, or other types expressed in the profile.",
  },
  {
    text: "One proxy per launch; no mid-session rotation inside a single run.",
  },
  {
    code: "--regenerate",
    prefix: "If the proxy is broken or expired, relaunch after fixing credentials or run with",
    suffix: "to fetch a fresh profile from the API.",
  },
];

export function ProxySection() {
  return (
    <section id="proxy" className="border-t border-zinc-200 bg-white px-6 py-24" aria-labelledby="proxy-heading">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-12 md:grid-cols-2 md:gap-20">
          <div className="space-y-5">
            <p className="text-sm font-medium text-cyan-600">Proxy routing</p>
            <h2 id="proxy-heading" className="text-3xl font-semibold tracking-tight text-zinc-950" style={{ letterSpacing: "-0.5px" }}>
              Proxy routing from the fingerprint profile
            </h2>
            <p className="text-sm leading-relaxed text-zinc-500">
              Proxy credentials ride along with the fingerprint payload. Clawbrowser
              does not pick a separate proxy stack at launch—whatever the profile
              contains is what the browser uses for that session.
            </p>
          </div>
          <ul className="space-y-3">
            {proxyItems.map((item, i) => (
              <li key={i} className="rounded-2xl border border-zinc-200 bg-[#FAFAF8] p-5 text-sm leading-relaxed text-zinc-600">
                {"code" in item ? (
                  <>
                    {item.prefix}{" "}
                    <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800">
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
