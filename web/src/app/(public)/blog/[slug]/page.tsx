import { notFound } from "next/navigation";
import Link from "next/link";
import { getPost, getAllSlugs, type PostHeading, type ContentSegment } from "@/lib/blog";
import { CodeBlock } from "@/components/docs/code-block";
import { BlogCTA } from "@/components/blog/blog-cta";

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
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
  if (headings.length === 0) return null;
  return (
    <aside className="hidden w-48 shrink-0 lg:block">
      <nav className="sticky top-24 flex flex-col gap-2">
        <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          On this page
        </span>
        {headings.map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            className={`block text-sm text-zinc-500 dark:text-zinc-400 underline-offset-2 transition-colors hover:text-zinc-950 dark:hover:text-zinc-50 hover:underline ${
              h.level === 3 ? "pl-3" : ""
            }`}
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
          <div
            key={i}
            className="prose-blog"
            dangerouslySetInnerHTML={{ __html: seg.content }}
          />
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

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0c0c0e]">
      {/* Hero with same gradient as homepage */}
      <div
        className="border-b border-zinc-200 px-6 py-16 bg-white dark:bg-zinc-950"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,183,250,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 20%, rgba(67,10,240,0.05) 0%, transparent 60%)",
        }}
      >
        <div className="mx-auto max-w-2xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors mb-8"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M9 2L4 7L9 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            All posts
          </Link>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
            {post.title}
          </h1>

          <div className="mt-5 flex items-center gap-3 text-sm text-zinc-400 dark:text-zinc-500">
            <span>{post.author}</span>
            <span className="inline-block h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            <span>{formatDate(post.date)}</span>
          </div>
        </div>
      </div>

      {/* Content + TOC */}
      <div className="mx-auto max-w-5xl px-6 py-14 dark:bg-[#0c0c0e]">
        <div className="flex gap-12">
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
                  <path
                    d="M9 2L4 7L9 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back to all posts
              </Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
