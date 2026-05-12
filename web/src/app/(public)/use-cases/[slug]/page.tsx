import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getUseCase, getAllUseCaseSlugs, USE_CASES } from "@/lib/use-cases";
import { UseCaseCTA } from "@/components/use-cases/use-case-cta";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export function generateStaticParams() {
  return getAllUseCaseSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const uc = getUseCase(slug);
  if (!uc) return {};
  return {
    title: `${uc.title} — Clawbrowser`,
    description: uc.metaDescription,
    alternates: { canonical: `https://clawbrowser.ai/use-cases/${slug}` },
    openGraph: {
      title: `${uc.title} — Clawbrowser`,
      description: uc.metaDescription,
      url: `https://clawbrowser.ai/use-cases/${slug}`,
      siteName: "Clawbrowser",
      type: "website",
    },
  };
}

export default async function UseCasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const uc = getUseCase(slug);
  if (!uc) notFound();

  const others = USE_CASES.filter((u) => u.slug !== slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0c0c0e]">
      {/* Hero */}
      <div className="border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="mx-auto max-w-3xl px-6 pt-8 pb-12">
          <Breadcrumbs
            crumbs={[
              { label: "Home", href: "/" },
              { label: "Use cases", href: "/use-cases" },
              { label: uc.title },
            ]}
          />

          <Link
            href="/use-cases"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 2L4 7L9 12" />
            </svg>
            All use cases
          </Link>

          <div className="mt-6">
            <span className="inline-flex items-center rounded-full bg-cyan-50 dark:bg-cyan-950/40 px-3 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800">
              Use case
            </span>
          </div>

          <h1
            className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl"
            style={{ letterSpacing: "-1px" }}
          >
            {uc.title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
            {uc.tagline}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-3xl px-6 py-14">
        {/* Problem */}
        <div className="mb-14 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">The problem</p>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{uc.problem}</p>
        </div>

        {/* How it works */}
        <div className="mb-14">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 mb-8" style={{ letterSpacing: "-0.3px" }}>
            How it works
          </h2>
          <ol className="space-y-6">
            {uc.steps.map((step, i) => (
              <li key={i} className="flex gap-5">
                {/* Step number */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-500 dark:text-zinc-400 shadow-sm">
                  {i + 1}
                </div>
                <div className="pt-0.5">
                  <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 mb-1">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Benefits */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 mb-8" style={{ letterSpacing: "-0.3px" }}>
            Why it works well with Clawbrowser
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {uc.benefits.map((benefit, i) => (
              <div
                key={i}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm"
              >
                <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 mb-1">{benefit.title}</h3>
                <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <UseCaseCTA />

        {/* Other use cases */}
        {others.length > 0 && (
          <div className="mt-16 pt-12 border-t border-zinc-200 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50 mb-6">Other use cases</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {others.map((other) => (
                <Link
                  key={other.slug}
                  href={`/use-cases/${other.slug}`}
                  className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md"
                >
                  <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 mb-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    {other.title}
                  </p>
                  <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {other.tagline}
                  </p>
                </Link>
              ))}
            </div>

            <div className="mt-6">
              <Link
                href="/use-cases"
                className="inline-flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 2L4 7L9 12" />
                </svg>
                Back to all use cases
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
