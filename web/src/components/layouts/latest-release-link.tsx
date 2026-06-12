"use client";

import { useEffect, useState } from "react";

const RELEASES_URL = "https://github.com/clawbrowser/clawbrowser/releases";
const LATEST_RELEASE_API_URL = "https://api.github.com/repos/clawbrowser/clawbrowser/releases/latest";

type LatestRelease = {
  tagName: string;
  htmlUrl: string;
};

export function LatestReleaseLink() {
  const [release, setRelease] = useState<LatestRelease | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLatestRelease() {
      try {
        const response = await fetch(LATEST_RELEASE_API_URL, {
          signal: controller.signal,
          headers: {
            Accept: "application/vnd.github+json",
          },
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { tag_name?: string; html_url?: string };

        if (!data.tag_name || !data.html_url) {
          return;
        }

        setRelease({
          tagName: data.tag_name,
          htmlUrl: data.html_url,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to load latest Clawbrowser release", error);
        }
      }
    }

    void loadLatestRelease();

    return () => controller.abort();
  }, []);

  return (
    <a
      href={release?.htmlUrl ?? RELEASES_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
      aria-label={release ? `Latest release ${release.tagName}` : "Clawbrowser releases"}
      title={release ? `Latest release ${release.tagName}` : "Clawbrowser releases"}
    >
      Latest release{release ? ` ${release.tagName}` : ""}
    </a>
  );
}
