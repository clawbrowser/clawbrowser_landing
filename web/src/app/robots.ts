import { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const internalDemosPath = "/demos-14-06-2026-k7m9q/";

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: internalDemosPath },
      { userAgent: "GPTBot", allow: "/", disallow: internalDemosPath },
      { userAgent: "ChatGPT-User", allow: "/", disallow: internalDemosPath },
      { userAgent: "CCBot", allow: "/", disallow: internalDemosPath },
      { userAgent: "anthropic-ai", allow: "/", disallow: internalDemosPath },
      { userAgent: "Claude-Web", allow: "/", disallow: internalDemosPath },
      { userAgent: "PerplexityBot", allow: "/", disallow: internalDemosPath },
      { userAgent: "Googlebot", allow: "/", disallow: internalDemosPath },
    ],
    sitemap: "https://clawbrowser.ai/sitemap.xml",
  };
}
