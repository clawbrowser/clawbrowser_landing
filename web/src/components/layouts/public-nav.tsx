"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { APP_LOGIN_URL, APP_SIGNUP_URL } from "@/lib/links";
import { USE_CASES } from "@/lib/use-cases";

const navLink =
  "text-sm text-zinc-500 dark:text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer";

const sections: { label: string; hash: string }[] = [];

const builderUseCases = ["ai-agent-automation", "developer-testing"];
const operationsUseCases = [
  "web-scraping",
  "lead-generation",
  "price-monitoring",
  "multi-account-management",
  "social-media",
  "ecommerce-ops",
];

const builderItems = builderUseCases
  .map((slug) => USE_CASES.find((uc) => uc.slug === slug))
  .filter((uc): uc is (typeof USE_CASES)[number] => Boolean(uc));

const operationsItems = operationsUseCases
  .map((slug) => USE_CASES.find((uc) => uc.slug === slug))
  .filter((uc): uc is (typeof USE_CASES)[number] => Boolean(uc));

function NavAnchor({
  hash,
  children,
  onClick,
}: {
  hash: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    onClick?.();
    if (pathname === "/") {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push("/");
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }

  return (
    <a href={`/#${hash}`} onClick={handleClick} className={navLink}>
      {children}
    </a>
  );
}

function UseCasesDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${navLink} inline-flex items-center gap-1 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        Use cases
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[34rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/5">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-100 p-2 dark:border-zinc-800">
              <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                Builders
              </p>
              {builderItems.map((uc) => (
                <Link
                  key={uc.slug}
                  href={`/use-cases/${uc.slug}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-zinc-50 hover:text-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                >
                  <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">{uc.shortTitle}</span>
                  <span className="mt-1 block text-xs leading-5 text-zinc-500 dark:text-zinc-400">{uc.tagline}</span>
                </Link>
              ))}
            </div>
            <div className="rounded-xl border border-zinc-100 p-2 dark:border-zinc-800">
              <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                Operations
              </p>
              {operationsItems.map((uc) => (
                <Link
                  key={uc.slug}
                  href={`/use-cases/${uc.slug}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-zinc-50 hover:text-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                >
                  <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">{uc.shortTitle}</span>
                  <span className="mt-1 block text-xs leading-5 text-zinc-500 dark:text-zinc-400">{uc.tagline}</span>
                </Link>
              ))}
            </div>
          </div>
          <Link
            href="/use-cases/"
            onClick={() => setOpen(false)}
            className="mt-2 flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-cyan-700 transition-colors hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-400/10"
          >
            Browse all use cases
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const [useCasesOpen, setUseCasesOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-3.5">
          {/* Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 text-zinc-950 dark:text-zinc-50"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <Image
              src="/side-bite.svg"
              alt="Clawbrowser logo"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-[18px]"
              priority
              unoptimized
            />
            <span className="text-base font-semibold tracking-tight">Clawbrowser</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-6 md:flex">
            {sections.map((s) => (
              <NavAnchor key={s.hash} hash={s.hash}>{s.label}</NavAnchor>
            ))}
            <UseCasesDropdown />
            <Link href="/docs" className={navLink}>Docs</Link>
            <Link href="/blog" className={navLink}>Blog</Link>
            <Link href="/faq" className={navLink}>FAQ</Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/clawbrowser/clawbrowser"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Clawbrowser on GitHub, 5 stars"
              title="GitHub · 5 stars"
              className="hidden sm:inline-flex h-9 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 dark:border-slate-700 dark:bg-[#101821] dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-zinc-700 dark:text-slate-200">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-slate-300">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.75l2.91 5.9 6.51.95-4.71 4.6 1.11 6.48L12 17.57l-5.82 3.06 1.11-6.48-4.71-4.6 6.51-.95L12 2.75z" />
                </svg>
                <span>5</span>
              </span>
            </a>
            <a
              href="https://discord.gg/CK62brtKhe"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Join our Discord"
              title="Join our Discord"
              className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#5865F2] transition-colors hover:bg-[#5865F2]/10 dark:text-[#A5B0FF] dark:hover:bg-[#5865F2]/15"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.078.037c-.211.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.249.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.105 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.128 12.298 12.298 0 0 1-1.873.891.077.077 0 0 0-.041.106c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.956 2.419-2.157 2.419zm7.974 0c-1.181 0-2.157-1.085-2.157-2.419 0-1.333.957-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z" />
              </svg>
            </a>
            <ThemeToggle />
            {/* Desktop only: Log in */}
            <a
              href={APP_LOGIN_URL}
              className="hidden md:inline-flex h-8 items-center px-3 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Log in
            </a>
            <Button size="sm" href={APP_SIGNUP_URL}>Sign up</Button>
            {/* Mobile: hamburger */}
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              className="flex cursor-pointer md:hidden h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              {open ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 3l12 12M15 3L3 15"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2 5h14M2 9h14M2 13h14"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 pb-5 pt-4 md:hidden">
            <div className="flex flex-col gap-1">
              {sections.map((s) => (
                <NavAnchor key={s.hash} hash={s.hash} onClick={() => setOpen(false)}>
                  <span className="block rounded-lg px-3 py-2.5 text-base text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    {s.label}
                  </span>
                </NavAnchor>
              ))}

              {/* Use cases accordion on mobile */}
              <div>
                <button
                  type="button"
                  onClick={() => setUseCasesOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-base text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  Use cases
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className={`transition-transform ${useCasesOpen ? "rotate-180" : ""}`}
                  >
                    <path d="M2.5 5l4.5 4 4.5-4" />
                  </svg>
                </button>
                {useCasesOpen && (
                  <div className="ml-3 mt-1 space-y-3 border-l border-zinc-200 pl-3 dark:border-zinc-700">
                    <div>
                      <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                        Builders
                      </p>
                      {builderItems.map((uc) => (
                        <Link
                          key={uc.slug}
                          href={`/use-cases/${uc.slug}`}
                          onClick={() => { setOpen(false); setUseCasesOpen(false); }}
                          className="block rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                        >
                          {uc.shortTitle}
                        </Link>
                      ))}
                    </div>
                    <div>
                      <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                        Operations
                      </p>
                      {operationsItems.map((uc) => (
                        <Link
                          key={uc.slug}
                          href={`/use-cases/${uc.slug}`}
                          onClick={() => { setOpen(false); setUseCasesOpen(false); }}
                          className="block rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                        >
                          {uc.shortTitle}
                        </Link>
                      ))}
                    </div>
                    <Link
                      href="/use-cases/"
                      onClick={() => { setOpen(false); setUseCasesOpen(false); }}
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-cyan-700 transition-colors hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-400/10"
                    >
                      Browse all use cases
                    </Link>
                  </div>
                )}
              </div>

              <Link
                href="/docs"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-base text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                Docs
              </Link>
              <Link
                href="/blog"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-base text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                Blog
              </Link>
              <Link
                href="/faq"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-base text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                FAQ
              </Link>
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <a
                href="https://github.com/clawbrowser/clawbrowser"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                GitHub
              </a>
              <a
                href="https://discord.gg/CK62brtKhe"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10 px-4 py-2.5 text-center text-sm font-medium text-[#5865F2] hover:bg-[#5865F2]/15 transition-colors dark:border-[#5865F2]/40 dark:bg-[#5865F2]/15 dark:text-[#A5B0FF]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.078.037c-.211.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.249.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.105 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.128 12.298 12.298 0 0 1-1.873.891.077.077 0 0 0-.041.106c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.956 2.419-2.157 2.419zm7.974 0c-1.181 0-2.157-1.085-2.157-2.419 0-1.333.957-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z" />
                </svg>
                Join Discord
              </a>
              <a
                href={APP_LOGIN_URL}
                className="block rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 text-center text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                Log in
              </a>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
