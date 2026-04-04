import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ArchitectureSummary() {
  return (
    <section
      id="architecture"
      className="px-6 py-16"
      aria-labelledby="architecture-heading"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <h2 id="architecture-heading" className="text-3xl font-bold">
          One browser binary, one process
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Clawbrowser pairs a Chromium fork with an embedded Rust library,{" "}
          <strong className="text-zinc-950 dark:text-zinc-50">libclaw</strong>,
          for fingerprint profiles and proxy credentials. At launch, your profile
          is loaded so renderer and GPU processes read the same values—no per-call
          glue from your automation code.
        </p>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Built-in verification</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
            On startup the browser can run checks that proxy egress matches the
            profile and that key JavaScript surfaces match what was generated—so
            failures are obvious before your agent touches the page.
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
