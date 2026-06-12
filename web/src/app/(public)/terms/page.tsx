import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Terms overview for Clawbrowser, including acceptable use, account responsibilities, service availability, and limitation of liability.",
  alternates: { canonical: "https://clawbrowser.ai/terms" },
  openGraph: {
    title: "Terms — Clawbrowser",
    description:
      "Terms overview for Clawbrowser, including acceptable use, account responsibilities, service availability, and limitation of liability.",
    url: "https://clawbrowser.ai/terms",
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

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] px-6 py-16 dark:bg-[#0c0c0e]">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-400">Terms</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Terms of service overview</h1>
        <p className="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-400">
          These terms summarize the basic rules for using Clawbrowser. They are a practical overview, not a substitute for a full legal review.
        </p>

        <Section title="Acceptable use">
          <p>
            You may not use Clawbrowser for phishing, credential theft, malware delivery, denial-of-service activity, or any workflow that violates applicable law or the rights of other parties.
          </p>
          <p>
            You are responsible for the websites, accounts, automations, and data sources you choose to interact with through the product.
          </p>
        </Section>

        <Section title="Accounts and access">
          <p>
            You are responsible for keeping account credentials and API keys secure. Do not share access in ways that bypass your organization&apos;s own security or approval policies.
          </p>
        </Section>

        <Section title="Availability and changes">
          <p>
            Clawbrowser may change product behavior, APIs, pricing, limits, or supported environments over time. We try to ship improvements without breaking core workflows, but the service is provided on an evolving basis.
          </p>
        </Section>

        <Section title="Liability">
          <p>
            Use of the product is at your own risk. Clawbrowser is not responsible for losses caused by third-party websites, account bans, workflow errors, or interrupted availability.
          </p>
        </Section>
      </div>
    </div>
  );
}
