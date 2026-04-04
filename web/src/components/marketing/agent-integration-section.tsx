import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const python = `browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222")
page = browser.contexts[0].pages[0]
await page.goto("https://example.com")`;

const nodePlaywright = `const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts()[0].pages()[0];
await page.goto('https://example.com');`;

const puppeteer = `const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
const [page] = await browser.pages();
await page.goto('https://example.com');`;

export function AgentIntegrationSection() {
  return (
    <section id="agents" className="px-6 py-16" aria-labelledby="agents-heading">
      <div className="mx-auto max-w-3xl space-y-6">
        <h2 id="agents-heading" className="text-3xl font-bold">
          Connect over standard CDP
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Launch with{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
            --remote-debugging-port
          </code>
          , then attach the same way you would to any Chromium build. Spoofing
          and proxying are invisible to your automation.
        </p>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Playwright (Python)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                <code>{python}</code>
              </pre>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Playwright (Node)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                <code>{nodePlaywright}</code>
              </pre>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Puppeteer</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                <code>{puppeteer}</code>
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
