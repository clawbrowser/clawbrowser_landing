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

const lines = [
  { type: "env", text: "export CLAWBROWSER_API_KEY=clawbrowser_xxxxx" },
  { type: "gap" },
  { type: "cmd", text: "clawbrowser start --session work -- https://example.com" },
  { type: "cmd", text: "clawbrowser endpoint --session work" },
  { type: "cmd", text: "clawbrowser status --session work" },
  { type: "cmd", text: "clawbrowser rotate --session work" },
  { type: "cmd", text: "clawbrowser stop --session work" },
  { type: "cmd", text: "clawbrowser list --session work" },
  { type: "gap" },
  { type: "cmd", text: "clawbrowser start --session us -- --fingerprint=fp_us --country=US" },
];

export function CliSection() {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(lines.filter(l => l.text).map(l => l.text).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <section
      id="cli"
      className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-24"
      aria-labelledby="cli-heading"
    >
      <div className="mx-auto max-w-4xl space-y-10">
        <div className="space-y-5">
          <p className="text-sm font-medium text-cyan-600">CLI</p>
          <h2 id="cli-heading" className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50" style={{ letterSpacing: "-0.5px" }}>
            CLI that stays familiar
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Use the launcher to manage named browser sessions. It prints the
            local CDP endpoint for your agent, and browser flags after{" "}
            <code className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:text-zinc-300">
              --
            </code>{" "}
            still pass through when you need fingerprint or geo targeting.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          {/* Terminal header */}
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-400/70" />
              <span className="h-3 w-3 rounded-full bg-yellow-400/70" />
              <span className="h-3 w-3 rounded-full bg-green-400/70" />
              <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">bash</span>
            </div>
            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-1.5 rounded-md bg-zinc-200 dark:bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-300 dark:hover:bg-zinc-700 hover:text-zinc-950 dark:hover:text-zinc-100"
            >
              <CopyIcon />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="bg-[#161b22] p-5">
            <pre className="overflow-x-auto font-mono text-sm leading-7">
              {lines.map((line, i) =>
                line.type === "gap" ? (
                  <br key={i} />
                ) : line.type === "env" ? (
                  <div key={i}>
                    <span className="text-slate-500">$ </span>
                    <span className="text-amber-300">{line.text}</span>
                  </div>
                ) : (
                  <div key={i}>
                    <span className="text-slate-500">$ </span>
                    <span className="text-slate-200">{line.text?.split("--")[0]}</span>
                    {line.text?.includes("--") && (
                      <span className="text-cyan-400">
                        {"--" + line.text.split("--").slice(1).join("--")}
                      </span>
                    )}
                  </div>
                )
              )}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
