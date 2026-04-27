export function WebsiteJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Clawbrowser",
          url: "https://clawbrowser.ai",
          description: "Chromium-based browser with managed sessions, fingerprint profiles, and residential/datacenter proxy routing for AI agent automation.",
          publisher: {
            "@type": "Organization",
            name: "Clawbrowser",
            url: "https://clawbrowser.ai",
            logo: { "@type": "ImageObject", url: "https://clawbrowser.ai/side-bite.svg" },
            sameAs: ["https://github.com/clawbrowser/clawbrowser"],
          },
          potentialAction: {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: "https://clawbrowser.ai/blog?q={search_term_string}" },
            "query-input": "required name=search_term_string",
          },
        }),
      }}
    />
  );
}

export function BlogPostingJsonLd({
  title, description, url, datePublished, authorName, imageUrl,
}: {
  title: string; description: string; url: string; datePublished: string; authorName: string; imageUrl?: string;
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: title,
          description,
          url,
          datePublished,
          dateModified: datePublished,
          author: { "@type": "Person", name: authorName },
          publisher: {
            "@type": "Organization",
            name: "Clawbrowser",
            logo: { "@type": "ImageObject", url: "https://clawbrowser.ai/side-bite.svg" },
          },
          ...(imageUrl ? { image: { "@type": "ImageObject", url: imageUrl, width: 1200, height: 630 } } : {}),
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
        }),
      }}
    />
  );
}

export function BreadcrumbJsonLd({ crumbs }: { crumbs: { name: string; url: string }[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: c.url,
          })),
        }),
      }}
    />
  );
}
