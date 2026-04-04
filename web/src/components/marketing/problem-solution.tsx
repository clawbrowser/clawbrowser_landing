import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProblemSolutionSection() {
  return (
    <section
      className="bg-zinc-100/80 px-6 py-16 dark:bg-zinc-900/40"
      aria-labelledby="audience-heading"
    >
      <div className="mx-auto max-w-4xl space-y-8">
        <h2 id="audience-heading" className="text-center text-3xl font-bold">
          Who Clawbrowser is for
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>AI agents</CardTitle>
            </CardHeader>
            <CardContent className="text-zinc-600 dark:text-zinc-400">
              Automate with standard CDP—Playwright, Puppeteer, or anything that
              speaks DevTools. Fingerprints and proxy routing stay consistent so
              your agent sees a normal browser, not a brittle puppet.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Multi-account operators</CardTitle>
            </CardHeader>
            <CardContent className="text-zinc-600 dark:text-zinc-400">
              Each fingerprint ID maps to its own profile directory: cookies,
              storage, and identity move together. Separate accounts stay
              separated on disk by design.
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
