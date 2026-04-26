"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { APP_LOGIN_URL } from "@/lib/links";

const navLink =
  "text-sm text-zinc-500 dark:text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer";

const sections = [
  { label: "Capabilities", hash: "capabilities" },
  { label: "CLI", hash: "cli" },
  { label: "Agents", hash: "agents" },
];

function NavAnchor({ hash, children }: { hash: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
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

export function PublicNav() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 px-6 py-3.5 backdrop-blur-md">
      <Link
        href="/"
        className="flex shrink-0 items-center gap-3 text-zinc-950 dark:text-zinc-50"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <Image
          src="/side-bite.svg"
          alt=""
          aria-hidden="true"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-[18px]"
          priority
          unoptimized
        />
        <span className="text-base font-semibold tracking-tight">Clawbrowser</span>
      </Link>
      <div className="hidden items-center gap-6 md:flex">
        {sections.map((s) => (
          <NavAnchor key={s.hash} hash={s.hash}>{s.label}</NavAnchor>
        ))}
        <Link href="/docs" className={navLink}>Docs</Link>
        <Link href="/blog" className={navLink}>Blog</Link>
        <Link href="/faq" className={navLink}>FAQ</Link>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button variant="ghost" size="sm" href={APP_LOGIN_URL}>Log in</Button>
        <Button size="sm" href={APP_LOGIN_URL}>Sign up</Button>
      </div>
    </nav>
  );
}
