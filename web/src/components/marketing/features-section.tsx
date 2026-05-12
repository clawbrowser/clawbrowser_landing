const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Looks like a real browser",
    description:
      "Each profile has a unique browser fingerprint — the combination of signals sites use to tell humans from bots. Canvas, fonts, screen size, language, timezone all line up naturally.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" />
      </svg>
    ),
    title: "Browse from any location",
    description:
      "Attach a residential or datacenter IP to any profile. Your traffic exits from the country you choose — geo, language, and IP all match so nothing looks out of place.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: "Accounts stay separate",
    description:
      "Every profile is a completely isolated bubble — own cookies, own storage, own identity. Open ten profiles and each one looks like a different person on a different computer.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    title: "Works with your existing tools",
    description:
      "Connects over the same protocol as any Chromium browser. Playwright, Puppeteer, Claude Code, and custom scripts all work without any changes to your existing code.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    title: "Extensions pre-installed",
    description:
      "Bundle adblockers and other extensions into a profile when you create it. Pages load faster, tracking scripts are blocked before they run, and your proxy bill shrinks.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
    title: "One command to start",
    description:
      "Run one command to launch a session. You get back a URL your agent connects to — no configuration files, no manual browser setup, no extra dependencies.",
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="border-t border-zinc-200 dark:border-zinc-800 bg-[#FAFAF8] dark:bg-[#0c0c0e] px-6 py-24"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 space-y-3 text-center">
          <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">What it does</p>
          <h2
            id="features-heading"
            className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
            style={{ letterSpacing: "-0.5px" }}
          >
            Everything a browser needs for automation
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Clawbrowser is a regular browser you can control — with the identity management built in.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex flex-col gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400">
                {f.icon}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">{f.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
