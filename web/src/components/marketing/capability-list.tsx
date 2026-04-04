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
      className="bg-zinc-100/80 px-6 py-16 dark:bg-zinc-900/40"
      aria-labelledby="capabilities-heading"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <h2 id="capabilities-heading" className="text-3xl font-bold">
          Surfaces stay internally consistent
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Profiles are generated to match real-world combinations—platform,
          fonts, timezone, and proxy geography line up so you are not advertising
          contradictory signals.
        </p>
        <ul className="list-disc space-y-2 pl-6 text-zinc-600 dark:text-zinc-400">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
