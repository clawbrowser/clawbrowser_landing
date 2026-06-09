import { MetadataRoute } from "next";

export const dynamic = "force-static";

const SITE_LAST_MODIFIED = new Date("2026-06-03T17:25:14.488Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://clawbrowser.ai";

  return [
    { url: `${base}/`, lastModified: SITE_LAST_MODIFIED, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/use-cases/`,
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/blog/`,
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/docs/`,
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${base}/faq/`,
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...[
      "ai-agent-automation",
      "web-scraping",
      "multi-account-management",
      "lead-generation",
      "price-monitoring",
      "seo-research",
      "ad-intelligence",
      "social-media",
      "ecommerce-ops",
      "developer-testing",
    ].map((slug) => ({
      url: `${base}/use-cases/${slug}/`,
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...[
      {
        slug: "why-your-automation-keeps-triggering-CAPTCHA-the-7-signal-diagnostic-guide",
        lastModified: "2026-05-07T00:00:00.000Z",
      },
      {
        slug: "the-7-best-browsers-for-AI-agent-automation-in-2026",
        lastModified: "2026-05-05T00:00:00.000Z",
      },
      {
        slug: "browser-fingerprinting-explained-the-20-signals-anti-bot-systems-use-to-detect-automation",
        lastModified: "2026-04-30T00:00:00.000Z",
      },
      {
        slug: "the-browser-runtime-for-ai-agents-why-orchestration-isn't-enough",
        lastModified: "2026-04-29T00:00:00.000Z",
      },
      {
        slug: "why-your-playwright-scripts-keep-getting-blocked-by-cloudflare-and-how-to-fix-it",
        lastModified: "2026-04-28T00:00:00.000Z",
      },
    ].map((post) => ({
      url: `${base}/blog/${post.slug}/`,
      lastModified: new Date(post.lastModified),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
