const items = [
  "Canvas 2D and WebGL (vendor, renderer, readbacks)",
  "AudioContext output",
  "Client rects and bounding boxes",
  "Navigator: user agent, languages, platform, hardware signals",
  "Screen metrics, timezone, and fonts",
  "Media devices, plugins, speech voices",
  "WebRTC policy oriented toward relay usage to reduce IP leaks",
];

export function CapabilityList() {
  return (
    <section
      id="capabilities"
      className="border-t border-zinc-200 dark:border-zinc-800 bg-[#FAFAF8] dark:bg-[#0c0c0e] px-6 py-24"
      aria-labelledby="capabilities-heading"
    >
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-12 md:grid-cols-2 md:gap-20">
          <div className="space-y-5">
            <p className="text-sm font-medium text-cyan-600">Fingerprint surfaces</p>
            <h2 id="capabilities-heading" className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50" style={{ letterSpacing: "-0.5px" }}>
              Surfaces stay internally consistent
            </h2>
            <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Profiles are generated to match real-world combinations. Platform,
              fonts, timezone, and proxy geography line up when those values are
              present, reducing the contradictory signals that trigger avoidable
              CAPTCHA and anti-bot checks.
            </p>
          </div>
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
