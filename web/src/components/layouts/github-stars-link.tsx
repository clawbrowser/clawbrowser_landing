"use client";

import { useEffect, useState } from "react";

const GITHUB_REPOSITORY_URL = "https://github.com/clawbrowser/clawbrowser";
const GITHUB_REPOSITORY_API_URL = "https://api.github.com/repos/clawbrowser/clawbrowser";
const FALLBACK_STAR_COUNT = 6;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function GitHubStarsLink() {
  const [starCount, setStarCount] = useState(FALLBACK_STAR_COUNT);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStarCount() {
      try {
        const response = await fetch(GITHUB_REPOSITORY_API_URL, {
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/vnd.github+json",
          },
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { stargazers_count?: number };

        if (typeof data.stargazers_count === "number") {
          setStarCount(data.stargazers_count);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to load GitHub star count", error);
        }
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void loadStarCount();
      }
    }

    void loadStarCount();
    const intervalId = window.setInterval(loadStarCount, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const label = `Clawbrowser on GitHub, ${starCount} ${starCount === 1 ? "star" : "stars"}`;

  return (
    <a
      href={GITHUB_REPOSITORY_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={`GitHub · ${starCount} ${starCount === 1 ? "star" : "stars"}`}
      className="hidden sm:inline-flex h-9 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 dark:border-slate-700 dark:bg-[#101821] dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-zinc-700 dark:text-slate-200">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
      <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-slate-300">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.75l2.91 5.9 6.51.95-4.71 4.6 1.11 6.48L12 17.57l-5.82 3.06 1.11-6.48-4.71-4.6 6.51-.95L12 2.75z" />
        </svg>
        <span>{starCount}</span>
      </span>
    </a>
  );
}
