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
        className={`${navLink} inline-flex items-center gap-1`}
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
        <div className="absolute left-0 top-full mt-2 w-auto min-w-[200px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-1.5 shadow-lg ring-1 ring-black/5 dark:ring-white/5 z-50">
          {USE_CASES.map((uc) => (
            <Link
              key={uc.slug}
              href={`/use-cases/${uc.slug}`}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors whitespace-nowrap"
            >
              {uc.shortTitle}
            </Link>
          ))}
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
                  <div className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-zinc-200 dark:border-zinc-700 pl-3">
                    {USE_CASES.map((uc) => (
                      <Link
                        key={uc.slug}
                        href={`/use-cases/${uc.slug}`}
                        onClick={() => { setOpen(false); setUseCasesOpen(false); }}
                        className="block rounded-lg px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      >
                        {uc.shortTitle}
                      </Link>
                    ))}
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
            <div className="mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
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
