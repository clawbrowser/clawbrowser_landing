import Link from "next/link";
import { getAllPostMeta } from "@/lib/blog";

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPage() {
  const posts = getAllPostMeta();

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-6 py-16 text-center">
        <p className="mb-3 text-sm font-medium tracking-widest text-zinc-400 uppercase">
          Blog
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
          From the team
        </h1>
        <p className="mt-4 text-base text-zinc-500 max-w-md mx-auto">
          Thoughts on browser automation, AI agents, and building reliable web infrastructure.
        </p>
      </div>

      {/* Post grid */}
      <div className="mx-auto max-w-6xl px-6 py-16">
        {posts.length === 0 ? (
          <p className="text-center text-zinc-400">No posts yet.</p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col rounded-2xl border border-zinc-200 bg-white overflow-hidden hover:border-zinc-300 hover:shadow-md transition-all duration-200"
              >
                {/* Cover placeholder */}
                <div className="h-44 bg-zinc-100 flex items-center justify-center border-b border-zinc-100">
                  <span className="text-4xl select-none">
                    {post.tags[0] === "agents"
                      ? "🤖"
                      : post.tags[0] === "performance"
                      ? "⚡"
                      : post.tags[0] === "data"
                      ? "📦"
                      : "📄"}
                  </span>
                </div>

                <div className="flex flex-col flex-1 p-6 gap-3">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Title */}
                  <h2 className="text-base font-semibold leading-snug text-zinc-950 group-hover:text-zinc-700 transition-colors">
                    {post.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2 flex-1">
                    {post.excerpt}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 mt-auto">
                    <span className="text-xs text-zinc-400">{post.author}</span>
                    <span className="text-xs text-zinc-400">{formatDate(post.date)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
