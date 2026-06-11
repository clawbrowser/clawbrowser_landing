const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Looks like a real browser",
    short: "Each profile has a unique fingerprint — the signals sites use to tell humans from bots.",
    detail: "Canvas, fonts, screen size, language, and timezone all match each other naturally. No contradictions that trigger bot detection.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" />
      </svg>
    ),
    title: "Browse from any location",
    short: "Attach a residential or datacenter IP to any profile. Traffic exits from the country you choose.",
    detail: "Geo, language, and IP all match so nothing looks out of place to the target site.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: "Accounts stay separate",
    short: "Every profile is a completely isolated bubble — own cookies, own storage, own identity.",
    detail: "Open ten profiles and each one looks like a different person on a different computer. Nothing leaks between sessions.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    title: "Works with your existing tools",
    short: "Playwright, Puppeteer, Claude Code — everything works as-is, no changes needed.",
    detail: "Connects over the same protocol as any Chromium browser. No custom SDKs, no wrappers.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    title: "Extensions pre-installed",
    short: "Bundle adblockers into a profile at creation time. Pages load faster, proxy bills shrink.",
    detail: "Tracking scripts are blocked before they execute. Less data through paid proxies, cleaner pages for AI screenshots.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
    title: "One command to start",
    short: "Launch a session with one command. Get back a URL your agent connects to.",
    detail: "No config files, no manual browser setup, no extra dependencies. Your existing code just works.",
  },
];

function FeatureCard({ icon, title, short, detail }: (typeof features)[0]) {
  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400">
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="mb-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">{title}</h3>
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{short}</p>
        <p className="text-sm leading-relaxed text-zinc-400 dark:text-zinc-500">{detail}</p>
      </div>
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative border-t border-zinc-200 dark:border-zinc-800 overflow-hidden px-6 py-24 bg-[#FAFAF8] dark:bg-[#0c0c0e]"
      aria-labelledby="features-heading"
    >
      {/* Gradient glow — sits above bg-color, below content (DOM order) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 120% 55% at 50% 0%, rgba(0,183,250,0.07) 0%, transparent 65%)" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-5xl">
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
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}
