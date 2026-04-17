"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { APP_LOGIN_URL } from "@/lib/links";

const navLink =
  "text-sm text-zinc-500 transition-colors hover:text-zinc-900 cursor-pointer";

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
    <nav className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-zinc-200 bg-white/80 px-6 py-3.5 backdrop-blur-md">
      <Link href="/" className="flex shrink-0 items-center gap-3 text-zinc-950">
        <Image
          src="/side-bite.svg"
          alt=""
          aria-hidden="true"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-[18px] shadow-[0_12px_24px_rgba(9,9,11,0.14)]"
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
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" href={APP_LOGIN_URL}>Log in</Button>
        <Button size="sm" href={APP_LOGIN_URL}>Sign up</Button>
      </div>
    </nav>
  );
}
