import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getPost, getAllSlugs, type PostHeading, type ContentSegment } from "@/lib/blog";
import { CodeBlock } from "@/components/docs/code-block";
import { BlogCTA } from "@/components/blog/blog-cta";
import { ThemedImage } from "@/components/blog/themed-image";
import { AuthorCard, AuthorSidebar } from "@/components/blog/author-card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { BlogPostingJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `https://clawbrowser.ai/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: [post.authorName ?? post.author],
      images: (post.coverImageLight ?? post.coverImage)
        ? [{ url: `https://clawbrowser.ai${post.coverImageLight ?? post.coverImage}`, width: 1200, height: 630 }]
        : [],
    },
  };
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function TOC({ headings }: { headings: PostHeading[] }) {
  const h2s = headings.filter((h) => h.level === 2);
  if (h2s.length === 0) return null;
  return (
    <aside className="hidden w-44 shrink-0 lg:block">
      <nav className="sticky top-24 flex flex-col gap-2">
        <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          On this page
        </span>
        {h2s.map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            className="block text-sm text-zinc-500 dark:text-zinc-400 underline-offset-2 transition-colors hover:text-zinc-950 dark:hover:text-zinc-50 hover:underline leading-snug"
          >
            {h.text}
          </a>
        ))}
      </nav>
    </aside>
  );
}

function Segments({ segments }: { segments: ContentSegment[] }) {
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "html" ? (
          <div key={i} className="prose-blog" dangerouslySetInnerHTML={{ __html: seg.content }} />
        ) : seg.type === "cta" ? (
          <BlogCTA key={i} />
        ) : seg.type === "themed-image" ? (
          <ThemedImage key={i} light={seg.light} dark={seg.dark} alt={seg.alt} />
        ) : (
          <CodeBlock key={i} code={seg.value} />
        )
      )}
    </>
  );
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const postUrl = `https://clawbrowser.ai/blog/${slug}`;
  const authorDisplay = post.authorName ?? post.author;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0c0c0e]">
      <BlogPostingJsonLd
        title={post.title}
        description={post.excerpt}
        url={postUrl}
        datePublished={post.date}
        authorName={authorDisplay}
        imageUrl={post.coverImage ? `https://clawbrowser.ai${post.coverImage}` : undefined}
      />
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", url: "https://clawbrowser.ai" },
          { name: "Blog", url: "https://clawbrowser.ai/blog" },
          { name: post.title, url: postUrl },
        ]}
      />

      {/* Hero — Chatbase style: white bg, left-aligned, no separate section */}
      <div className="border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="mx-auto max-w-5xl px-6 pt-8 pb-10">
          <Breadcrumbs
            crumbs={[
              { label: "Home", href: "/" },
              { label: "Blog", href: "/blog" },
              { label: post.title },
            ]}
          />

          <Link
            href="/blog"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            All posts
          </Link>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl max-w-3xl">
            {post.title}
          </h1>

          {/* Author + date row */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-600 text-[9px] font-bold text-white select-none">
                {authorDisplay.charAt(0)}
              </span>
              {authorDisplay}
            </span>
            <span className="rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              {formatDate(post.date)}
            </span>
          </div>

          {/* Mobile author card (social links) */}
          {post.authorName && (post.authorGithub || post.authorTwitter) && (
            <div className="mt-4">
              <AuthorCard
                name={post.authorName}
                role={post.authorRole}
                github={post.authorGithub}
                twitter={post.authorTwitter}
              />
            </div>
          )}
        </div>

        {/* Cover image — full bleed within hero */}
        {(post.coverImageLight || post.coverImageDark || post.coverImage) && (
          <div className="overflow-hidden">
            <div className="overflow-hidden">
              {(post.coverImageLight || post.coverImageDark) ? (
                <ThemedImage
                  light={post.coverImageLight ?? post.coverImageDark!}
                  dark={post.coverImageDark ?? post.coverImageLight!}
                  alt={post.title}
                  bare
                  className="w-full object-cover"
                  width={1200}
                  height={630}
                  priority
                />
              ) : (
                <Image
                  src={post.coverImage!}
                  alt={post.title}
                  width={1200}
                  height={630}
                  className="w-full object-cover"
                  priority
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content + TOC + Author sidebar */}
      <div className="mx-auto max-w-5xl px-6 py-14 dark:bg-[#0c0c0e]">
        <div className="flex gap-10">
          <TOC headings={post.headings} />

          <main className="min-w-0 flex-1">
            <Segments segments={post.segments} />
            <BlogCTA />

            <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to all posts
              </Link>
            </div>
          </main>

          {post.authorName && (
            <AuthorSidebar
              name={post.authorName}
              role={post.authorRole}
              github={post.authorGithub}
              twitter={post.authorTwitter}
            />
          )}
        </div>
      </div>
    </div>
  );
}
