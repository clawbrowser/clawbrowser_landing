import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about Clawbrowser: installation, fingerprint profiles, residential/datacenter proxy setup, API keys, and AI agent integration.",
  alternates: { canonical: "https://clawbrowser.ai/faq" },
  openGraph: {
    title: "FAQ — Clawbrowser",
    description: "Answers to common questions about Clawbrowser: installation, fingerprint profiles, residential/datacenter proxy setup, API keys, and AI agent integration.",
    url: "https://clawbrowser.ai/faq",
    siteName: "Clawbrowser",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "FAQ — Clawbrowser",
    description: "Answers to common questions about Clawbrowser: installation, fingerprint profiles, residential/datacenter proxy setup, API keys, and AI agent integration.",
  },
};

const faqs = [
  {
    q: "What is Clawbrowser?",
    a: "Clawbrowser is a Chromium fork with native patches for browser fingerprint profiles and profile-bound residential/datacenter proxy routing. It exposes a standard Chrome DevTools Protocol (CDP) endpoint, making it compatible with Playwright, Puppeteer, and CDP-based automation tools.",
  },
  {
    q: "How is Clawbrowser different from regular Chromium or other browser-profile tools?",
    a: "Unlike regular Chromium, Clawbrowser changes fingerprint behavior inside the browser engine instead of relying on page-level JavaScript injection. Compared to traditional profile browsers, the public launcher is built for automation: it manages named sessions, prints a local CDP endpoint, and keeps residential/datacenter proxy credentials tied to the generated profile.",
  },
  {
    q: "What fingerprint surfaces does Clawbrowser spoof?",
    a: "Clawbrowser patches surfaces such as Canvas, WebGL, AudioContext, navigator.* properties (userAgent, platform, languages, hardware concurrency, device memory), screen resolution, fonts, timezone, language, battery status, plugins, media devices, WebRTC-related behavior, and speech synthesis voices. Values are loaded from the generated profile so related surfaces stay consistent.",
  },
  {
    q: "Do I need to configure proxies separately?",
    a: "Normally, no for proxy-backed profiles. Residential or datacenter proxy credentials are bundled with the generated fingerprint profile via the Clawbrowser API. The browser reuses the cached fingerprint profile until that profile is regenerated.",
  },
  {
    q: "Does Clawbrowser bypass CAPTCHAs?",
    a: "Clawbrowser is designed to reduce CAPTCHA and anti-bot interruptions caused by mismatched browser fingerprint, proxy, locale, timezone, and geo signals. Generated profiles keep those signals aligned with residential or datacenter proxy routing, but no browser can honestly guarantee a universal CAPTCHA bypass across every website.",
  },
  {
    q: "How do I get an API key?",
    a: <>Sign up at <a href="https://app.clawbrowser.ai" target="_blank" rel="noopener noreferrer" className="text-sky-600 dark:text-sky-400 underline underline-offset-2 hover:opacity-80">app.clawbrowser.ai</a>. After creating an account, your API key is available in the dashboard. Set <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 text-xs">CLAWBROWSER_API_KEY</code> or let the launcher prompt once and save it to <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 text-xs">~/.config/clawbrowser/config.json</code>.</>,
  },
  {
    q: "Can I use Clawbrowser with Playwright or Puppeteer?",
    a: "Yes. Start a managed session, read its endpoint, then connect your framework to that CDP URL:\n\nclawbrowser start --session work -- https://example.com\nclawbrowser endpoint --session work\n\nPlaywright: browser = await chromium.connectOverCDP(endpoint)\nPuppeteer: browser = await puppeteer.connect({ browserURL: endpoint })",
  },
  {
    q: "What platforms does Clawbrowser support?",
    a: "Clawbrowser is available as a macOS desktop app and as a Linux container/headless runtime. Windows support is on the roadmap. For VPS or CI deployments, use the Docker-backed launcher/container image: docker.io/clawbrowser/clawbrowser:latest.",
  },
  {
    q: "How do I install Clawbrowser for Claude Code or another AI agent?",
    a: "Run the install script with the correct target:\n\ncurl -fsSL https://raw.githubusercontent.com/clawbrowser/clawbrowser/main/scripts/install.sh | bash -s -- claude\n\nTargets: claude (Claude Code / Claude Desktop), codex, gemini, all (Cursor and others).",
  },
  {
    q: "What happens if my proxy connection fails?",
    a: "The launcher exits non-zero if the browser does not expose a ready CDP endpoint. For fingerprint-backed sessions, clawbrowser rotate --session <name> restarts the session and passes --regenerate to the browser. If you need country, city, or connection-type targeting, pass browser flags after -- when starting the session.",
  },
  {
    q: "Can I run multiple browser sessions simultaneously?",
    a: "Yes. Launch separate managed sessions with different session names and ports, for example: clawbrowser start --session agent-us --port 9222 -- https://example.com and clawbrowser start --session agent-de --port 9223 -- https://example.com. Each session has its own CDP endpoint. For identity separation, use distinct fingerprint IDs after --.",
  },
  {
    q: "Is the CDP endpoint compatible with headless mode?",
    a: "Yes. For VPS, CI, or no-display environments, use the Docker-backed launcher/container image: docker.io/clawbrowser/clawbrowser:latest. Browser flags can still be passed after -- when needed.",
  },
  {
    q: "Where can I find the latest release and changelog?",
    a: <>Releases are published on GitHub: <a href="https://github.com/clawbrowser/clawbrowser/releases" target="_blank" rel="noopener noreferrer" className="text-sky-600 dark:text-sky-400 underline underline-offset-2 hover:opacity-80">github.com/clawbrowser/clawbrowser/releases</a>. By default, the install script installs the current stable release.</>,
  },
];

export default function FaqPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0c0c0e]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <p className="mb-3 text-sm font-medium tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">
            FAQ
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
            Frequently asked questions
          </h1>
          <p className="mt-4 text-base text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Everything you need to know about Clawbrowser. Can&apos;t find an answer?{" "}
            <Link href="/docs" className="text-zinc-700 dark:text-zinc-300 underline underline-offset-2 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors">
              Read the docs
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-16">
        <dl className="space-y-4">
          {faqs.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-5 open:pb-5"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-semibold text-zinc-900 dark:text-zinc-100 list-none [&::-webkit-details-marker]:hidden">
                {q}
                <svg
                  className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180"
                  viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                >
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </summary>
              <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {a}
              </div>
            </details>
          ))}
        </dl>

        <div className="mt-16 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
          <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50 mb-2">Still have questions?</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            Check the full documentation or open an issue on GitHub.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/docs"
              className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:border-zinc-300 dark:hover:border-zinc-600"
            >
              Documentation
            </Link>
            <a
              href="https://github.com/clawbrowser/clawbrowser/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full bg-zinc-950 dark:bg-white px-5 py-2.5 text-sm font-medium text-white dark:text-zinc-950 transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-200"
            >
              Open an issue
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
