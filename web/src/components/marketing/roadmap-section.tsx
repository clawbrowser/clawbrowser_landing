const roadmapItems = [
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
    title: "Guided profile setup",
    description:
      "Step-by-step prompts when creating a new fingerprint profile — pick country, connection type, and browser persona without needing to know every flag.",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" />
      </svg>
    ),
    title: "IP verification skill",
    description: (
      <>
        Built-in skill that checks your session&apos;s outbound IP via{" "}
        <a
          href="https://whoerip.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-500 underline underline-offset-2 hover:text-cyan-400"
        >
          whoerip.com
        </a>{" "}
        and surfaces geo, ASN, and proxy-detection score directly in the agent context.
      </>
    ),
  },
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
