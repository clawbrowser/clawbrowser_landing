import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Security overview for Clawbrowser, including authentication, transport security, issue reporting, and support channels.",
  alternates: { canonical: "https://clawbrowser.ai/security" },
  openGraph: {
    title: "Security — Clawbrowser",
    description:
      "Security overview for Clawbrowser, including authentication, transport security, issue reporting, and support channels.",
    url: "https://clawbrowser.ai/security",
    siteName: "Clawbrowser",
    type: "website",
  },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">{children}</div>
    </section>
  );
}

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] px-6 py-16 dark:bg-[#0c0c0e]">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-400">Security</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Security overview</h1>
        <p className="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-400">
          Clawbrowser is built to support authenticated browser sessions and automation workflows. This page summarizes the current security posture without making claims the product has not publicly documented.
        </p>

        <Section title="Authentication and access">
          <p>
            Dashboard access and API usage rely on authenticated account flows and API keys. Access to managed sessions should be limited to trusted operators and systems inside your workflow.
          </p>
        </Section>

        <Section title="Transport and storage">
          <p>
            Product traffic is expected to travel over encrypted transport. Browser profiles, cookies, and session state should be treated as sensitive operational data and handled accordingly in your own environment.
          </p>
        </Section>

        <Section title="Security reporting">
          <p>
            If you find a security issue, report it through the channels listed on the <Link href="/support" className="text-cyan-700 underline underline-offset-2 dark:text-cyan-300">support page</Link>. Please include reproduction steps, affected surface, and any urgency notes.
          </p>
        </Section>

        <Section title="Compliance notes">
          <p>
            This page does not claim SOC 2, ISO 27001, or other certifications unless they are publicly announced elsewhere. When those details exist, this page should be updated to link to them directly.
          </p>
        </Section>
      </div>
    </div>
  );
}
