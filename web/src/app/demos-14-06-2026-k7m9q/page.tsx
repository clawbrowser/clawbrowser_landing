import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Internal demos",
  description: "Internal Clawbrowser demo library.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

type Demo = {
  id: string;
  title: string;
  caption?: string;
};

const useCases: Demo[] = [
  { id: "7hHO3X_S7jE", title: "Price tracking (ecommerce)", caption: "Tracking product prices across retailers." },
  { id: "gwDXFr7D7uU", title: "Job parsing", caption: "Parsing job listings into structured data." },
  { id: "kfS3oautXG4", title: "Reddit posting", caption: "Posting on Reddit at scale." },
  { id: "fsKJVXSffS4", title: "AI visibility", caption: "Checking how brands appear across AI search results." },
  {
    id: "1b5zwT5Ce9I",
    title: "Influencer research on YouTube",
    caption: "Discovering and collecting data on YouTube influencers.",
  },
  { id: "kcIbvtT_9pA", title: "YouTube video upload", caption: "Uploading videos to YouTube end-to-end." },
  { id: "7pZzG0ZFYfg", title: "Competitive intelligence", caption: "Collecting competitor reviews across sources." },
  { id: "EXe-Mdsrb6g", title: "Yandex Market", caption: "Researching products on Yandex Market." },
];

const installation: Demo[] = [
  { id: "JAg2-QYP-0s", title: "macOS + Claude Desktop" },
  { id: "Ksnazdmv6w8", title: "macOS + Codex" },
  { id: "YL9NoIszgAY", title: "Windows + Claude Code" },
  { id: "Nn6qas5yNqQ", title: "Windows + Codex" },
  { id: "S2ymLoiSeYg", title: "OpenClaw" },
  { id: "gwsLu6pLDkE", title: "Linux + Docker (Hermes)" },
];

const capabilities: Demo[] = [
  { id: "f8tUzZJMGBo", title: "Form fill / login", caption: "Logging into Reddit via form input." },
  { id: "-Tthbnb6iJE", title: "Identity verification", caption: "Passing the VirusTotal check." },
  { id: "lPqLGXqxdTc", title: "Captcha solving", caption: "Solving a Yandex captcha." },
];

const streaming: Demo[] = [
  {
    id: "_Qq7O84gH7U",
    title: "OpenClaw in Docker",
    caption: "Watching an OpenClaw browser session stream from Docker.",
  },
];

const sectionLinks = [
  { href: "#use-cases", label: "Use Cases" },
  { href: "#installation", label: "Installation" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#streaming", label: "Streaming" },
];

function DemoCard({ demo }: { demo: Demo }) {
  return (
    <article>
      <div className="aspect-video overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${demo.id}?rel=0&modestbranding=1`}
          title={demo.title}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-zinc-950 dark:text-white">{demo.title}</h3>
      {demo.caption ? <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-slate-400">{demo.caption}</p> : null}
    </article>
  );
}

function DemoSection({
  id,
  title,
  demos,
  columns = 2,
}: {
  id: string;
  title: string;
  demos: Demo[];
  columns?: 1 | 2 | 3;
}) {
  const gridClass =
    columns === 3
      ? "md:grid-cols-2 xl:grid-cols-3"
      : columns === 2
        ? "md:grid-cols-2"
        : "max-w-3xl";

  return (
    <section id={id} className="scroll-mt-24 border-b border-zinc-200 py-16 last:border-b-0 dark:border-slate-800 md:py-20">
      <div className="mb-9 flex items-end justify-between gap-6">
        <h2 className="text-3xl font-semibold tracking-[-0.035em] text-zinc-950 dark:text-white md:text-4xl">{title}</h2>
        <span className="font-mono text-xs text-zinc-400 dark:text-slate-500">
          {String(demos.length).padStart(2, "0")} demos
        </span>
      </div>
      <div className={`grid gap-x-8 gap-y-12 ${gridClass}`}>
        {demos.map((demo) => (
          <DemoCard key={demo.id} demo={demo} />
        ))}
      </div>
    </section>
  );
}

export default function InternalDemosPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-zinc-950 dark:bg-[#070b10] dark:text-white">
      <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-[#FAFAF8]/90 backdrop-blur-xl dark:border-slate-800 dark:bg-[#070b10]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3.5 sm:px-8">
          <a href="#top" className="flex shrink-0 items-center gap-2.5">
            <Image src="/side-bite.svg" alt="" width={32} height={32} className="h-8 w-8 rounded-full" priority />
            <span className="text-sm font-semibold tracking-tight">Clawbrowser</span>
          </a>
          <div className="flex items-center gap-4 overflow-x-auto text-sm text-zinc-500 dark:text-slate-400 sm:gap-7">
            {sectionLinks.map((link) => (
              <a key={link.href} href={link.href} className="whitespace-nowrap transition-colors hover:text-zinc-950 dark:hover:text-white">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <main id="top" className="mx-auto max-w-7xl px-5 sm:px-8">
        <header className="border-b border-zinc-200 py-20 dark:border-slate-800 md:py-28">
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
            Internal demo library · 14 June 2026
          </p>
          <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-zinc-950 dark:text-white sm:text-6xl md:text-7xl">
            Clawbrowser
            <br />
            <span className="text-cyan-600 dark:text-cyan-300">current state</span> of demos.
          </h1>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium text-zinc-500 dark:text-slate-400">
            {sectionLinks.map((link) => (
              <a key={link.href} href={link.href} className="group inline-flex items-center gap-2 transition-colors hover:text-zinc-950 dark:hover:text-white">
                <span className="text-cyan-600 transition-transform group-hover:translate-x-0.5 dark:text-cyan-300">→</span>
                {link.label === "Installation" ? "Install setups" : link.label}
              </a>
            ))}
          </div>
        </header>

        <DemoSection id="use-cases" title="Use Cases" demos={useCases} />
        <DemoSection id="installation" title="Installation" demos={installation} />
        <DemoSection id="capabilities" title="Capabilities" demos={capabilities} columns={3} />
        <DemoSection id="streaming" title="Streaming" demos={streaming} columns={1} />
      </main>

      <footer className="border-t border-zinc-200 px-5 py-10 text-center text-xs text-zinc-400 dark:border-slate-800 dark:text-slate-500">
        Internal Clawbrowser demo library
      </footer>
    </div>
  );
}
