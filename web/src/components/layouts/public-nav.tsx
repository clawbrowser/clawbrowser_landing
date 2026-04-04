import Link from "next/link";
import { Button } from "@/components/ui/button";

const navClass =
  "text-sm text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50";

export function PublicNav() {
  return (
    <nav className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <Link href="/" className="shrink-0 text-xl font-bold tracking-tight">
        Clawbrowser
      </Link>
      <div className="hidden items-center gap-6 md:flex">
        <Link href="/#capabilities" className={navClass}>
          Capabilities
        </Link>
        <Link href="/#cli" className={navClass}>
          CLI
        </Link>
        <Link href="/#agents" className={navClass}>
          Agents
        </Link>
        <Link href="/docs" className={navClass}>
          Docs
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" href="/login">
          Log in
        </Button>
        <Button size="sm" href="/signup">
          Sign up
        </Button>
      </div>
    </nav>
  );
}
