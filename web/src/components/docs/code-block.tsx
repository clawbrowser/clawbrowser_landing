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

export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-400/70" />
          <span className="h-3 w-3 rounded-full bg-yellow-400/70" />
          <span className="h-3 w-3 rounded-full bg-green-400/70" />
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex cursor-pointer items-center gap-1.5 rounded-md bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-300 hover:text-zinc-950"
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
