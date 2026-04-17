import { PublicNav } from "@/components/layouts/public-nav";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-zinc-200 px-6 py-4 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        <p>© {new Date().getFullYear()} Clawbrowser. All rights reserved.</p>
        <p className="mt-1">
          Available for <strong className="font-medium text-zinc-900">macOS</strong> and <strong className="font-medium text-zinc-900">Linux</strong>. Windows support is on the roadmap.
        </p>
      </footer>
    </div>
  );
}
