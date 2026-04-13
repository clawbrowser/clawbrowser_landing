import { getAllPostMeta } from "@/lib/blog";
import { BlogGrid } from "@/components/blog/blog-grid";

export default function BlogPage() {
  const posts = getAllPostMeta();

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
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

      <div className="mx-auto max-w-6xl px-6 py-16">
        <BlogGrid posts={posts} />
      </div>
    </div>
  );
}
