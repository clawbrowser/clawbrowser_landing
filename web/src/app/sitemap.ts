import { MetadataRoute } from "next";

export const dynamic = "force-static";
import { getAllPostMeta } from "@/lib/blog";
import { getAllUseCaseSlugs } from "@/lib/use-cases";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://clawbrowser.ai";
  const posts = getAllPostMeta();
  const useCaseSlugs = getAllUseCaseSlugs();

  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/use-cases`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/docs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    ...useCaseSlugs.map((slug) => ({
      url: `${base}/use-cases/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.date ? new Date(post.date) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
