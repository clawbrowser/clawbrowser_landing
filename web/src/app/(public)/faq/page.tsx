import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about Clawbrowser: installation, fingerprint profiles, proxy setup, API keys, and AI agent integration.",
  alternates: { canonical: "https://clawbrowser.ai/faq" },
};

const faqs = [
  {
    q: "What is Clawbrowser?",
    a: "Clawbrowser is a Chromium fork with a built-in library (libclaw) that spoofs 20+ browser fingerprint surfaces and routes traffic through a matching proxy. It exposes a standard Chrome DevTools Protocol (CDP) endpoint, making it compatible with Playwright, Puppeteer, and any CDP-based automation tool.",
  },
  {
    q: "How is Clawbrowser different from a regular Chromium or other anti-detect browsers?",
    a: "Unlike regular Chromium, Clawbrowser spoofs fingerprint surfaces at the engine level (not via injected JavaScript), so detection is significantly harder. Compared to other anti-detect browsers, Clawbrowser is designed specifically for AI agents and automation — it exposes a CDP endpoint, outputs machine-readable JSON, and manages proxy credentials automatically per profile.",
  },
  {
    q: "What fingerprint surfaces does Clawbrowser spoof?",
    a: "Clawbrowser spoofs Canvas, WebGL, AudioContext, navigator.* properties (userAgent, platform, languages, hardware concurrency, device memory), screen resolution, fonts, timezone, language, battery status, plugins, and speech synthesis voices — with full internal consistency between all surfaces.",
  },
  {
    q: "Do I need to configure proxies separately?",
    a: "No. Proxy credentials are bundled with each fingerprint profile via the Clawbrowser API. When you create or regenerate a profile, the backend assigns matching proxy credentials automatically. You don't manage proxies separately.",
  },
  {
    q: "How do I get an API key?",
    a: "Sign up at app.clawbrowser.ai. After creating an account, your API key will be available in the dashboard. Set it as the CLAWBROWSER_API_KEY environment variable or store it in ~/.config/clawbrowser/config.json.",
  },
  {
    q: "Can I use Clawbrowser with Playwright or Puppeteer?",
    a: "Yes. Start Clawbrowser with --remote-debugging-port=9222, then connect your framework to the CDP endpoint:\n\nPlaywright: browser = await chromium.connectOverCDP('http://127.0.0.1:9222')\nPuppeteer: browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' })",
  },
  {
    q: "What platforms does Clawbrowser support?",
    a: "macOS and Linux are supported in the current release. Windows support is on the roadmap. For headless/VPS deployments, use the Docker image: docker.io/clawbrowser/clawbrowser:latest.",
  },
  {
    q: "How do I install Clawbrowser for Claude Code or another AI agent?",
    a: "Run the install script with the correct target:\n\ncurl -fsSL https://raw.githubusercontent.com/clawbrowser/clawbrowser/main/scripts/install.sh | bash -s -- claude\n\nTargets: claude (Claude Code / Claude Desktop), codex, gemini, all (Cursor and others).",
  },
  {
    q: "What happens if my proxy connection fails?",
    a: "Clawbrowser will output [clawbrowser] Error: proxy connection failed on startup and exit without enabling the CDP endpoint. Run clawbrowser --fingerprint=<id> --regenerate to get fresh proxy credentials while keeping your existing browser state (cookies, localStorage).",
  },
  {
    q: "Can I run multiple browser sessions simultaneously?",
    a: "Yes. Launch separate Clawbrowser instances with different fingerprint profile IDs and different --remote-debugging-port values (e.g., 9222, 9223, 9224). Each instance is fully isolated with its own fingerprint, proxy, cookies, and browser history.",
  },
  {
    q: "Is the CDP endpoint compatible with headless mode?",
    a: "Yes. Pass --headless to run without a display. On VPS or CI environments, use the Docker image which is configured for headless operation by default.",
  },
  {
    q: "Where can I find the latest release and changelog?",
    a: "All releases are published on GitHub: github.com/clawbrowser/clawbrowser/releases. The install script always pulls the latest stable release.",
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
          <Breadcrumbs
            crumbs={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
          />
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
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {a}
              </p>
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
