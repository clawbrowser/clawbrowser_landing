const roadmapItems = [
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
        <path d="M10 10l2-2 2 2M12 8v5" />
      </svg>
    ),
    title: "Browser streaming",
    description:
      "Live pixel stream of the managed browser session — watch or debug agent-controlled sessions in real time from any device without VNC or screen sharing.",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    title: "Temporary profiles",
    description:
      "Spin up a disposable browser identity in one click — isolated fingerprint, fresh cookies, auto-wiped after the session ends. No leftover traces, no manual cleanup.",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
    title: "OpenClaw setup",
    description:
      "Guided first-run wizard that connects your proxy, configures fingerprint defaults, and verifies the setup end-to-end — from zero to a working agent session in under two minutes.",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    title: "Use-case walkthroughs",
    description:
      "Step-by-step guides for the most common automation jobs — scraping, form filling, social monitoring, price tracking — each with a ready-to-run agent prompt and a short demo video.",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: "Windows support",
    description:
      "Native Windows client with full feature parity — same profile management, proxy routing, and agent integration as macOS, packaged as a standard installer.",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
    title: "Marketing & content",
    description:
      "Backlink building, technical blog posts, and a polished GitHub presence. Each use case gets its own page and video — framed around real workflows people actually run.",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
        <polyline points="7.5 19.79 7.5 14.6 3 12" />
        <polyline points="21 12 16.5 14.6 16.5 19.79" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    title: "Extension pre-install",
    description:
      "Choose extensions to bundle into a profile at creation time — uBlock Origin and similar adblockers ship by default. Cleaner pages load faster, proxy bandwidth drops, and agent vision models get sharper screenshots to work with.",
  },
];

export function RoadmapSection() {
  return (
    <section
      id="roadmap"
      className="border-t border-zinc-200 dark:border-zinc-800 bg-[#FAFAF8] dark:bg-[#0c0c0e] px-6 py-24"
      aria-labelledby="roadmap-heading"
    >
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-16 space-y-3 text-center">
          <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">What&apos;s coming</p>
          <h2
            id="roadmap-heading"
            className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
            style={{ letterSpacing: "-0.5px" }}
          >
            Roadmap
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Features actively in development. Early access members get these as they ship.
          </p>
        </div>

        {/* Timeline */}
        <div className="mx-auto max-w-2xl">
          <div className="relative">
            {/* Vertical line */}
            <div
              className="absolute left-5 top-5 bottom-5 w-px"
              style={{
                background:
                  "linear-gradient(to bottom, transparent, rgba(6,182,212,0.3) 15%, rgba(6,182,212,0.3) 85%, transparent)",
              }}
            />

            <div className="space-y-6">
              {roadmapItems.map((item, i) => (
                <div key={i} className="relative flex gap-6">
                  {/* Dot */}
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm">
                    {/* Pulsing amber status */}
                    <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-50" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400 border-2 border-white dark:border-zinc-900" />
                    </span>
                    <span className="text-cyan-600 dark:text-cyan-400">{item.icon}</span>
                  </div>

                  {/* Card */}
                  <div className="flex-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        {item.title}
                      </h3>
                      <span className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-950/40 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                        In progress
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
