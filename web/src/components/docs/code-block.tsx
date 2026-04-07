"use client";

import { useState } from "react";

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
          className="text-xs text-zinc-400 transition-colors hover:text-zinc-700"
        >
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
