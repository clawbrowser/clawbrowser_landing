import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center bg-[#FAFAF8] dark:bg-[#0c0c0e]">
      {/* Redirect uppercase URLs to lowercase — runs before paint on GitHub Pages 404 */}
      <script dangerouslySetInnerHTML={{ __html: `(function(){var p=location.pathname,l=p.toLowerCase();if(p!==l)location.replace(l+location.search+location.hash);})();` }} />
      <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">404</p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 mb-4">Page not found</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center rounded-full bg-zinc-950 dark:bg-white px-6 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-200"
      >
        Go home
      </Link>
    </div>
  );
}
