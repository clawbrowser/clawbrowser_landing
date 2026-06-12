import { PublicNav } from "@/components/layouts/public-nav";
import { LatestReleaseLink } from "@/components/layouts/latest-release-link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col dark:bg-[#0c0c0e]">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-zinc-200 px-6 py-4 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <p>© {new Date().getFullYear()} Clawbrowser. All rights reserved.</p>
          <span aria-hidden="true" className="text-zinc-400 dark:text-zinc-600">
            •
          </span>
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">
            <LatestReleaseLink />
          </p>
        </div>
        <p className="mt-1">
          Available on <strong className="font-medium text-zinc-900 dark:text-zinc-100">macOS</strong> (desktop app), <strong className="font-medium text-zinc-900 dark:text-zinc-100">Linux</strong> (container/headless runtime), and <strong className="font-medium text-zinc-900 dark:text-zinc-100">Windows</strong>.
        </p>
      </footer>
    </div>
  );
}
