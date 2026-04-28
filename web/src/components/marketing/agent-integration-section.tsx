"use client";

import { useState } from "react";

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

const snippets = [
  {
    lang: "Python",
    label: "Playwright · Python",
    code: `endpoint = "http://127.0.0.1:9222"  # from: clawbrowser endpoint --session work
browser = await p.chromium.connect_over_cdp(endpoint)
page = browser.contexts[0].pages[0]
await page.goto("https://example.com")`,
  },
  {
    lang: "Node",
    label: "Playwright · Node",
    code: `const endpoint = 'http://127.0.0.1:9222'; // from: clawbrowser endpoint --session work
const browser = await chromium.connectOverCDP(endpoint);
const page = browser.contexts()[0].pages()[0];
await page.goto('https://example.com');`,
  },
  {
    lang: "Puppeteer",
    label: "Puppeteer",
    code: `const endpoint = 'http://127.0.0.1:9222'; // from: clawbrowser endpoint --session work
const browser = await puppeteer.connect({ browserURL: endpoint });
const [page] = await browser.pages();
await page.goto('https://example.com');`,
  },
];

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
      {/* Terminal header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-400/70" />
          <span className="h-3 w-3 rounded-full bg-yellow-400/70" />
          <span className="h-3 w-3 rounded-full bg-green-400/70" />
          <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex cursor-pointer items-center gap-1.5 rounded-md bg-zinc-200 dark:bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-300 dark:hover:bg-zinc-700 hover:text-zinc-950 dark:hover:text-zinc-100"
        >
          <CopyIcon />
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="bg-[#161b22] p-5">
        <pre className="overflow-x-auto font-mono text-sm leading-7">
          <code className="text-zinc-300">{code}</code>
        </pre>
      </div>
    </div>
  );
}

export function AgentIntegrationSection() {
  return (
    <section id="agents" className="border-t border-zinc-200 dark:border-zinc-800 bg-[#FAFAF8] dark:bg-[#0c0c0e] px-6 py-24" aria-labelledby="agents-heading">
      <div className="mx-auto max-w-3xl space-y-12">
        <div className="space-y-5">
          <p className="text-sm font-medium text-cyan-600">Agent integration</p>
          <h2 id="agents-heading" className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50" style={{ letterSpacing: "-0.5px" }}>
            Connect over standard CDP
          </h2>
          <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Start a managed session, then read its endpoint with{" "}
            <code className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:text-zinc-300">
              clawbrowser endpoint --session &lt;name&gt;
            </code>
            . Attach the same way you would to any Chromium build. Spoofing and
            residential/datacenter proxying are invisible to your automation.
          </p>
        </div>

        <div className="space-y-4">
          {snippets.map((s) => (
            <CodeBlock key={s.lang} label={s.label} code={s.code} />
          ))}
        </div>
      </div>
    </section>
  );
}
