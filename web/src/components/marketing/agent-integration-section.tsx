"use client";

import { useState } from "react";

const snippets = [
  {
    lang: "Python",
    label: "Playwright · Python",
    code: `browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222")
page = browser.contexts[0].pages[0]
await page.goto("https://example.com")`,
  },
  {
    lang: "Node",
    label: "Playwright · Node",
    code: `const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts()[0].pages()[0];
await page.goto('https://example.com');`,
  },
  {
    lang: "Puppeteer",
    label: "Puppeteer",
    code: `const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
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
    <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm">
      {/* Terminal header */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-400/70" />
          <span className="h-3 w-3 rounded-full bg-yellow-400/70" />
          <span className="h-3 w-3 rounded-full bg-green-400/70" />
          <span className="ml-2 text-xs text-zinc-500">{label}</span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="text-xs text-zinc-400 transition-colors hover:text-zinc-700"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="bg-[#0d1117] p-5">
        <pre className="overflow-x-auto font-mono text-sm leading-7">
          <code className="text-zinc-300">{code}</code>
        </pre>
      </div>
    </div>
  );
}

export function AgentIntegrationSection() {
  return (
    <section id="agents" className="border-t border-zinc-200 bg-[#FAFAF8] px-6 py-24" aria-labelledby="agents-heading">
      <div className="mx-auto max-w-3xl space-y-12">
        <div className="space-y-5">
          <p className="text-sm font-medium text-cyan-600">Agent integration</p>
          <h2 id="agents-heading" className="text-3xl font-semibold tracking-tight text-zinc-950" style={{ letterSpacing: "-0.5px" }}>
            Connect over standard CDP
          </h2>
          <p className="text-sm leading-relaxed text-zinc-500">
            Launch with{" "}
            <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800">
              --remote-debugging-port
            </code>
            , then attach the same way you would to any Chromium build. Spoofing
            and proxying are invisible to your automation.
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
