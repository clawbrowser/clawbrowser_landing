import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Support options for Clawbrowser, including docs, Discord, GitHub Issues, and release information.",
  alternates: { canonical: "https://clawbrowser.ai/support" },
  openGraph: {
    title: "Support — Clawbrowser",
    description:
      "Support options for Clawbrowser, including docs, Discord, GitHub Issues, and release information.",
    url: "https://clawbrowser.ai/support",
    siteName: "Clawbrowser",
    type: "website",
  },
};

const channels = [
  {
    title: "Documentation",
    description: "Start here for install steps, quick start guides, and CLI examples.",
    href: "/docs",
    label: "Read the docs",
  },
  {
    title: "Discord",
    description: "Best place for setup help, usage questions, and real-time conversation.",
    href: "https://discord.gg/mVWydaDK2N",
    label: "Open Discord",
  },
  {
    title: "GitHub Issues",
    description: "Use issues for bugs, reproducible failures, and feature requests.",
    href: "https://github.com/clawbrowser/clawbrowser/issues",
    label: "Open GitHub Issues",
  },
  {
    title: "Releases",
    description: "Check the latest release notes and shipped changes on GitHub.",
    href: "https://github.com/clawbrowser/clawbrowser/releases",
    label: "View releases",
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] px-6 py-16 dark:bg-[#0c0c0e]">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-400">Support</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Get help with Clawbrowser</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
          Pick the channel that matches the problem. For most setup issues, docs first and Discord second is the fastest path.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {channels.map((channel) => (
            <a
              key={channel.title}
              href={channel.href}
              target={channel.href.startsWith("http") ? "_blank" : undefined}
              rel={channel.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-cyan-600"
            >
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{channel.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{channel.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cyan-700 dark:text-cyan-300">
                {channel.label}
                <span aria-hidden="true">→</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
