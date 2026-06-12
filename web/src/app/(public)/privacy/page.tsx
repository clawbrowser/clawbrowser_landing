import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Privacy information for Clawbrowser, including account data, session data, security practices, retention notes, and support channels.",
  alternates: { canonical: "https://clawbrowser.ai/privacy" },
  openGraph: {
    title: "Privacy — Clawbrowser",
    description:
      "Privacy information for Clawbrowser, including account data, session data, security practices, retention notes, and support channels.",
    url: "https://clawbrowser.ai/privacy",
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

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] px-6 py-16 dark:bg-[#0c0c0e]">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-400">Privacy</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Privacy policy overview</h1>
        <p className="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-400">
          This page explains the current privacy baseline for Clawbrowser. It is meant to help visitors understand what data is required to operate the product and where to go with questions.
        </p>

        <Section title="Account and usage data">
          <p>
            Clawbrowser needs account information such as email address, authentication identifiers, and basic billing or subscription state in order to provide access to the dashboard and API.
          </p>
          <p>
            We also process operational data such as API requests, session metadata, and service logs that are necessary to keep the product available, debug failures, and prevent abuse.
          </p>
        </Section>

        <Section title="Session and browser data">
          <p>
            Browser sessions and profile data may include cookies, local storage, fingerprints, proxy configuration, and other runtime state required to launch and resume managed browser sessions.
          </p>
          <p>
            The exact retention period can depend on the product surface and deployment path. If you need a specific retention answer for your account or workflow, use the support options on the <Link href="/support" className="text-cyan-700 underline underline-offset-2 dark:text-cyan-300">support page</Link>.
          </p>
        </Section>

        <Section title="Security practices">
          <p>
            Clawbrowser uses transport encryption for traffic between clients and product services. Sensitive account access is protected through authenticated flows and standard access controls.
          </p>
          <p>
            More implementation details and current security commitments live on the <Link href="/security" className="text-cyan-700 underline underline-offset-2 dark:text-cyan-300">security page</Link>.
          </p>
        </Section>

        <Section title="Compliance and requests">
          <p>
            Privacy requirements can vary by geography and use case. If you have questions about data handling, deletion, or access requests, contact us through Discord or GitHub Issues from the <Link href="/support" className="text-cyan-700 underline underline-offset-2 dark:text-cyan-300">support page</Link>.
          </p>
        </Section>
      </div>
    </div>
  );
}
