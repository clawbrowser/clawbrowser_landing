import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const examples = `export CLAWBROWSER_API_KEY=clawbrowser_xxxxx

clawbrowser --fingerprint=fp_abc123
clawbrowser --fingerprint=fp_abc123 --regenerate
clawbrowser --fingerprint=fp_abc123 --remote-debugging-port=9222
clawbrowser --fingerprint=fp_abc123 --headless
clawbrowser --list
clawbrowser`;

export function CliSection() {
  return (
    <section
      id="cli"
      className="bg-zinc-100/80 px-6 py-16 dark:bg-zinc-900/40"
      aria-labelledby="cli-heading"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <h2 id="cli-heading" className="text-3xl font-bold">
          CLI that stays familiar
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          The executable is Chromium with Clawbrowser hooks. Standard Chromium
          flags pass through; Clawbrowser adds profile-oriented commands for
          fingerprints and automation-friendly output.
        </p>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Common commands</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto whitespace-pre rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
              <code>{examples}</code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
