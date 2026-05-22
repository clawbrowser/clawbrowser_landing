"use client";

import { useState } from "react";

type Status = "done" | "in-progress" | "todo";

const roadmapItems: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: Status;
}[] = [
  // ── DONE ────────────────────────────────────────────────────────────────────
  {
    status: "done",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Core fingerprint engine",
    description:
      "Browser-level patches for canvas, fonts, WebGL, and navigator signals. Ships with every profile out of the box.",
  },
  {
    status: "done",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    title: "Playwright & Puppeteer support",
    description:
      "Standard CDP endpoint — any automation library that connects to Chromium just works without changes.",
  },
  {
    status: "done",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: "macOS desktop app",
    description:
      "Native macOS app with profile management, session controls, and clawctl bundled.",
  },
  // ── IN PROGRESS ─────────────────────────────────────────────────────────────
  {
    status: "in-progress",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
        <path d="M10 10l2-2 2 2M12 8v5" />
      </svg>
    ),
    title: "Browser streaming",
    description:
      "Live pixel stream of the managed browser session — watch or debug agent-controlled sessions in real time from any device.",
  },
  {
    status: "in-progress",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    title: "Temporary profiles",
    description:
      "Spin up a disposable browser identity in one click — auto-wiped after the session ends, no manual cleanup.",
  },
  // ── TODO ────────────────────────────────────────────────────────────────────
  {
    status: "todo",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
    title: "OpenClaw setup",
    description:
      "Guided first-run wizard — connects your proxy, configures fingerprint defaults, and verifies the setup in under two minutes.",
  },
  {
    status: "todo",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    title: "Use-case walkthroughs",
    description:
      "Step-by-step guides for common automation jobs — each with a ready-to-run agent prompt and a short demo video.",
  },
  {
    status: "done",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: "Windows support",
    description:
      "Native Windows client with full feature parity — profile management, proxy routing, and agent integration.",
  },
  {
    status: "todo",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
    title: "Marketing & content",
    description:
      "Backlink building, technical blog posts, and a polished GitHub presence. Each use case gets its own page and video.",
  },
  {
    status: "todo",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
        <polyline points="7.5 19.79 7.5 14.6 3 12" />
        <polyline points="21 12 16.5 14.6 16.5 19.79" />
      </svg>
    ),
    title: "Extension pre-install",
    description:
      "Choose extensions at profile creation — uBlock Origin ships by default, cutting page weight and proxy bandwidth.",
  },
];

// How many done / in-progress to show collapsed
const SHOW_DONE = 2;
const SHOW_INPROGRESS = 2;

const statusBadge: Record<Status, React.ReactNode> = {
  done: (
    <span className="shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
      Done
    </span>
  ),
  "in-progress": (
    <span className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-950/40 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
      In progress
    </span>
  ),
  todo: (
    <span className="shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
      Planned
    </span>
  ),
};

const statusDot: Record<Status, React.ReactNode> = {
  done: (
    <span className="relative flex h-3 w-3">
      <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900" />
    </span>
  ),
  "in-progress": (
    <span className="relative flex h-3 w-3">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-50" />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400 border-2 border-white dark:border-zinc-900" />
    </span>
  ),
  todo: (
    <span className="relative flex h-3 w-3">
      <span className="relative inline-flex h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-600 border-2 border-white dark:border-zinc-900" />
    </span>
  ),
};

function Item({ icon, title, description, status }: (typeof roadmapItems)[0]) {
  return (
    <div className="relative flex gap-6">
      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm">
        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
          {statusDot[status]}
        </span>
        <span className={status === "done" ? "text-emerald-600 dark:text-emerald-400" : status === "in-progress" ? "text-cyan-600 dark:text-cyan-400" : "text-zinc-400 dark:text-zinc-500"}>
          {icon}
        </span>
      </div>
      <div className="flex-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{title}</h3>
          {statusBadge[status]}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
    </div>
  );
}

function CollapseToggle({
  count,
  label,
  open,
  direction,
  onClick,
}: {
  count: number;
  label: string;
  open: boolean;
  direction: "up" | "down";
  onClick: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="relative flex gap-6">
      {/* align with items */}
      <div className="w-10 shrink-0" />
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-transparent px-4 py-2.5 text-sm text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer w-full"
      >
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 transition-transform ${open ? (direction === "up" ? "rotate-180" : "rotate-0") : (direction === "up" ? "rotate-0" : "rotate-180")}`}
        >
          <path d="M2 9.5L7 4.5L12 9.5" />
        </svg>
        {open ? `Hide ${label}` : `${count} more ${label}`}
      </button>
    </div>
  );
}

export function RoadmapSection() {
  const [showOlderDone, setShowOlderDone] = useState(false);
  const [showTodo, setShowTodo] = useState(false);

  const doneItems = roadmapItems.filter((i) => i.status === "done");
  const inProgressItems = roadmapItems.filter((i) => i.status === "in-progress");
  const todoItems = roadmapItems.filter((i) => i.status === "todo");

  // Always show last SHOW_DONE; older ones appear above when toggled
  const olderDone = doneItems.slice(0, doneItems.length - SHOW_DONE);
  const visibleDone = doneItems.slice(-SHOW_DONE);
  const hiddenDoneCount = olderDone.length;

  // Visible in-progress: always show first SHOW_INPROGRESS
  const visibleInProgress = inProgressItems.slice(0, SHOW_INPROGRESS);

  // Todo: all hidden behind toggle
  const hiddenTodoCount = inProgressItems.length - SHOW_INPROGRESS + todoItems.length;
  const extraInProgress = showTodo ? inProgressItems.slice(SHOW_INPROGRESS) : [];
  const visibleTodo = showTodo ? todoItems : [];

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
            Features shipped and in development. Early access members get new ones as they ship.
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

            <div className="space-y-4">
              {/* Older done toggle */}
              <CollapseToggle
                count={hiddenDoneCount}
                label="done"
                open={showOlderDone}
                direction="up"
                onClick={() => setShowOlderDone((v) => !v)}
              />

              {/* Older done items (expanded) */}
              {showOlderDone && olderDone.map((item) => (
                <Item key={item.title} {...item} />
              ))}

              {/* Always-visible done */}
              {visibleDone.map((item) => (
                <Item key={item.title} {...item} />
              ))}

              {/* Always-visible in-progress */}
              {visibleInProgress.map((item) => (
                <Item key={item.title} {...item} />
              ))}

              {/* Extra in-progress (expanded) */}
              {extraInProgress.map((item) => (
                <Item key={item.title} {...item} />
              ))}

              {/* Todo items (expanded) */}
              {visibleTodo.map((item) => (
                <Item key={item.title} {...item} />
              ))}

              {/* Todo toggle */}
              <CollapseToggle
                count={hiddenTodoCount}
                label="planned"
                open={showTodo}
                direction="down"
                onClick={() => setShowTodo((v) => !v)}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
