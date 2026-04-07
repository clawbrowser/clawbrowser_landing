import Link from "next/link";
import { Button } from "@/components/ui/button";

const navLink =
  "text-sm text-zinc-500 transition-colors hover:text-zinc-900";

export function PublicNav() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-zinc-200 bg-white/80 px-6 py-3.5 backdrop-blur-md">
      <Link href="/" className="shrink-0 text-base font-semibold tracking-tight text-zinc-950">
        Clawbrowser
      </Link>
      <div className="hidden items-center gap-6 md:flex">
        <Link href="/#capabilities" className={navLink}>Capabilities</Link>
        <Link href="/#cli" className={navLink}>CLI</Link>
        <Link href="/#agents" className={navLink}>Agents</Link>
        <Link href="/docs" className={navLink}>Docs</Link>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" href="/login">Log in</Button>
        <Button size="sm" href="/signup">Sign up</Button>
      </div>
    </nav>
  );
}
