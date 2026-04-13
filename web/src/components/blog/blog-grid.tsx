"use client";

import Link from "next/link";
import { useState } from "react";
import type { PostMeta } from "@/lib/blog";

const PAGE_SIZE = 9;

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const tagEmoji: Record<string, string> = {
  agents: "🤖",
  performance: "⚡",
  data: "📦",
  fingerprinting: "🕵️",
  proxies: "🌐",
  scraping: "🔍",
  sessions: "🗂️",
  comparison: "⚖️",
  cli: "💻",
  reliability: "🛡️",
};

function tagIcon(tags: string[]) {
  for (const t of tags) {
    if (tagEmoji[t]) return tagEmoji[t];
  }
  return "📄";
}

function PostCard({ post }: { post: PostMeta }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col rounded-2xl border border-zinc-200 bg-white overflow-hidden hover:border-zinc-300 hover:shadow-md transition-all duration-200"
    >
      <div className="h-44 bg-zinc-100 flex items-center justify-center border-b border-zinc-100">
        <span className="text-4xl select-none">{tagIcon(post.tags)}</span>
      </div>
      <div className="flex flex-col flex-1 p-6 gap-3">
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
        <h2 className="text-base font-semibold leading-snug text-zinc-950 group-hover:text-zinc-700 transition-colors">
          {post.title}
        </h2>
        <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2 flex-1">
          {post.excerpt}
        </p>
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 mt-auto">
          <span className="text-xs text-zinc-400">{post.author}</span>
          <span className="text-xs text-zinc-400">{formatDate(post.date)}</span>
        </div>
      </div>
    </Link>
  );
}

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BlogGrid({ posts: allPosts }: { posts: PostMeta[] }) {
  const totalPages = Math.max(1, Math.ceil(allPosts.length / PAGE_SIZE));
  const [page, setPage] = useState(1);
  const posts = allPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function goTo(p: number) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (allPosts.length === 0) {
    return <p className="text-center text-zinc-400">No posts yet.</p>;
  }

  return (
    <>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>

      {totalPages > 1 && (
        <>
          <div className="mt-14 flex items-center justify-center gap-2">
            <button
              onClick={() => goTo(page - 1)}
              disabled={page === 1}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 shadow-sm transition-colors hover:border-zinc-300 hover:text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft />
              Prev
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => goTo(p)}
                  className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
                    p === page
                      ? "bg-zinc-950 text-white"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => goTo(page + 1)}
              disabled={page === totalPages}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 shadow-sm transition-colors hover:border-zinc-300 hover:text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight />
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-zinc-400">
            Page {page} of {totalPages} · {allPosts.length} articles
          </p>
        </>
      )}
    </>
  );
}
