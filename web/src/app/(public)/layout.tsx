import { PublicNav } from "@/components/layouts/public-nav";
import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col dark:bg-[#0c0c0e]">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-zinc-200 bg-white px-6 py-10 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-[#0c0c0e] dark:text-zinc-400">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <p className="font-semibold text-zinc-950 dark:text-zinc-100">Clawbrowser</p>
              <p className="mt-2 leading-6">
                A real browser runtime for AI agents, browser automation, logged-in workflows, and identity-aware web tasks.
              </p>
              <p className="mt-3">
                Available on <strong className="font-medium text-zinc-900 dark:text-zinc-100">macOS</strong>, <strong className="font-medium text-zinc-900 dark:text-zinc-100">Linux</strong>, and <strong className="font-medium text-zinc-900 dark:text-zinc-100">Windows</strong>.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">Product</p>
                <div className="mt-3 flex flex-col gap-2">
                  <Link href="/docs" className="hover:text-zinc-900 dark:hover:text-zinc-100">Docs</Link>
                  <Link href="/use-cases" className="hover:text-zinc-900 dark:hover:text-zinc-100">Use cases</Link>
                  <Link href="/blog" className="hover:text-zinc-900 dark:hover:text-zinc-100">Blog</Link>
                </div>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">Trust</p>
                <div className="mt-3 flex flex-col gap-2">
                  <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100">Privacy</Link>
                  <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-100">Terms</Link>
                  <Link href="/security" className="hover:text-zinc-900 dark:hover:text-zinc-100">Security</Link>
                </div>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">Support</p>
                <div className="mt-3 flex flex-col gap-2">
                  <Link href="/support" className="hover:text-zinc-900 dark:hover:text-zinc-100">Support</Link>
                  <a href="https://discord.gg/mVWydaDK2N" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 dark:hover:text-zinc-100">Discord</a>
                  <a href="https://github.com/clawbrowser/clawbrowser/issues" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 dark:hover:text-zinc-100">GitHub Issues</a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <p>© {new Date().getFullYear()} Clawbrowser. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
