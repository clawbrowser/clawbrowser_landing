"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { USE_CASES } from "@/lib/use-cases";

const ICONS: Record<string, React.ReactNode> = {
  "ai-agent-automation": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M9 9h.01M15 9h.01M9 13h6" />
    </svg>
  ),
  "web-scraping": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
      <path d="M11 8v6M8 11h6" />
    </svg>
  ),
  "multi-account-management": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  "lead-generation": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.27 12 19.79 19.79 0 0 1 1.15 3.38 2 2 0 0 1 3.12 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
    </svg>
  ),
  "price-monitoring": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  "seo-research": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  "ad-intelligence": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
  ),
  "social-media": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  "ecommerce-ops": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  "developer-testing": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
};

const N = USE_CASES.length; // 10
const CLONES = 4; // clones prepended/appended (≥ max visible at once)

// Strip: [last 4 clones] + [10 items] + [first 4 clones] = 18 entries
const STRIP = [
  ...USE_CASES.slice(-CLONES),
  ...USE_CASES,
  ...USE_CASES.slice(0, CLONES),
];

export function UseCasesSection() {
  const clipRef = useRef<HTMLDivElement>(null);
  // pos = index in STRIP of the first visible card; starts at CLONES (first real item)
  const [pos, setPos] = useState(CLONES);
  const [animated, setAnimated] = useState(true);
  const [stepPx, setStepPx] = useState(0);
  const teleportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Measure one card-step (card width + gap) from the clip container width
  const measure = useCallback(() => {
    const el = clipRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const visible =
      window.innerWidth >= 1024 ? 4 : window.innerWidth >= 640 ? 2 : 1;
    const gap = 16; // gap-4
    setStepPx((w - gap * (visible - 1)) / visible + gap);
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (clipRef.current) ro.observe(clipRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const go = useCallback((dir: 1 | -1) => {
    setAnimated(true);
    setPos((p) => p + dir);
  }, []);

  // Teleport when pos drifts into clone zone (after animation finishes)
  useEffect(() => {
    if (teleportTimer.current) clearTimeout(teleportTimer.current);

    if (pos >= CLONES + N) {
      teleportTimer.current = setTimeout(() => {
        setAnimated(false);
        setPos(CLONES + (pos - CLONES - N));
      }, 340);
    } else if (pos < CLONES) {
      teleportTimer.current = setTimeout(() => {
        setAnimated(false);
        setPos(CLONES + N - (CLONES - pos));
      }, 340);
    }

    return () => {
      if (teleportTimer.current) clearTimeout(teleportTimer.current);
    };
  }, [pos]);

  // Re-enable animation after teleport (two rAF = safely after paint)
  useEffect(() => {
    if (!animated) {
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setAnimated(true))
      );
      return () => cancelAnimationFrame(id);
    }
  }, [animated]);

  const translateX = stepPx > 0 ? -(pos - CLONES) * stepPx : 0;
  const cardWidth = stepPx > 0 ? stepPx - 16 : undefined;

  return (
    <section
      id="use-cases"
      className="relative border-t border-zinc-200 dark:border-zinc-800 overflow-hidden px-6 py-24 bg-white dark:bg-[#0c0c0e]"
      aria-labelledby="use-cases-heading"
    >
      {/* Gradient glow — sits above bg-color, below content (DOM order) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 100% 60% at 50% 100%, rgba(0,183,250,0.07) 0%, transparent 65%)" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-10 space-y-3 text-center">
          <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
            What you can build
          </p>
          <h2
            id="use-cases-heading"
            className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
            style={{ letterSpacing: "-0.5px" }}
          >
            Built for real automation jobs
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Common workflows Clawbrowser handles out of the box — fingerprints,
            proxies, and isolation managed for you.
          </p>
        </div>

        {/* Carousel: px-10 reserves 40px on each side for the arrow buttons */}
        <div className="relative px-10">
          {/* Left arrow — mid-height of the card strip */}
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 shadow-sm transition-colors hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <svg
              width="14" height="14" viewBox="0 0 14 14"
              fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 11L5 7l4-4" />
            </svg>
          </button>

          {/* Clip: hides the overflowing clone cards */}
          <div ref={clipRef} className="overflow-hidden">
            {/* Strip: all 18 cards in a row */}
            <div
              className="flex gap-4"
              style={{
                transform: `translateX(${translateX}px)`,
                transition: animated ? "transform 0.32s ease" : "none",
              }}
            >
              {STRIP.map((uc, i) => (
                <div
                  key={`${uc.slug}-${i}`}
                  className="group flex shrink-0 flex-col gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm transition-shadow hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md"
                  style={
                    cardWidth !== undefined
                      ? { width: `${cardWidth}px` }
                      : { minWidth: "calc(25% - 12px)" }
                  }
                >
                  {/* Icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400">
                    {ICONS[uc.slug]}
                  </div>

                  {/* Text */}
                  <div className="flex flex-1 flex-col gap-1.5">
                    <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      {uc.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {uc.tagline}
                    </p>
                  </div>

                  {/* CTA */}
                  <Link
                    href={`/use-cases/${uc.slug}`}
                    className="flex items-center gap-1 text-xs font-medium text-cyan-600 dark:text-cyan-400 transition-transform group-hover:translate-x-0.5"
                  >
                    See how it works
                    <svg
                      width="12" height="12" viewBox="0 0 12 12"
                      fill="none" stroke="currentColor" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" />
                    </svg>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Right arrow — mid-height of the card strip */}
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 shadow-sm transition-colors hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <svg
              width="14" height="14" viewBox="0 0 14 14"
              fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 3l4 4-4 4" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
