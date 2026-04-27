import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/docs/code-block";
import { PromptBlock } from "@/components/docs/prompt-block";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Complete documentation for Clawbrowser: installation, managed sessions, fingerprint profiles, proxy setup, and AI agent integration with Playwright and Puppeteer.",
  alternates: { canonical: "https://clawbrowser.ai/docs" },
};

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-12 scroll-mt-20 text-2xl font-bold text-zinc-950"
    >
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 text-lg font-semibold text-zinc-950">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-zinc-600">{children}</p>
  );
}

function Inline({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm text-zinc-800">
      {children}
    </code>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="block text-sm text-zinc-600 underline-offset-2 transition-colors hover:text-zinc-950 hover:underline"
    >
      {children}
    </a>
  );
}

const quickStart = `export CLAWBROWSER_API_KEY=clawbrowser_xxxxx

# Start a managed browser session
clawbrowser start --session work -- https://example.com

# Print the local CDP endpoint for your agent
clawbrowser endpoint --session work

# Or start a fingerprint-backed session when identity matters
clawbrowser start --session identity -- --fingerprint=fp_work --country=US https://example.com`;

const playwrightPython = `from playwright.async_api import async_playwright

async with async_playwright() as p:
    endpoint = "http://127.0.0.1:9222"  # from: clawbrowser endpoint --session work
    browser = await p.chromium.connect_over_cdp(endpoint)
    page = browser.contexts[0].pages[0]
    await page.goto("https://example.com")
    content = await page.content()`;

const playwrightNode = `const { chromium } = require('playwright');

const endpoint = 'http://127.0.0.1:9222'; // from: clawbrowser endpoint --session work
const browser = await chromium.connectOverCDP(endpoint);
const page = browser.contexts()[0].pages()[0];
await page.goto('https://example.com');`;

const puppeteer = `const puppeteer = require('puppeteer');

const endpoint = 'http://127.0.0.1:9222'; // from: clawbrowser endpoint --session work
const browser = await puppeteer.connect({ browserURL: endpoint });
const [page] = await browser.pages();
await page.goto('https://example.com');`;

const cliRef = `# Start or reattach to a managed browser session
clawbrowser start --session work -- https://example.com

# Print the CDP endpoint
clawbrowser endpoint --session work

# Show session status
clawbrowser status --session work

# Restart the managed session with --regenerate
clawbrowser rotate --session work

# Stop the session
clawbrowser stop --session work

# List cached browser profiles
clawbrowser list --session work

# Choose a CDP port
clawbrowser start --session work --port 9222 -- https://example.com

# Pass browser-level fingerprint and geo flags
clawbrowser start --session us -- --fingerprint=fp_us --country=US --connection-type=residential

# Keep the internal verification page enabled
clawbrowser start --session work --verify -- https://example.com`;

const launcherOutput = `$ clawbrowser start --session work -- https://example.com
http://127.0.0.1:9222

$ clawbrowser status --session work
session=work status=running endpoint=http://127.0.0.1:9222 backend=app`;

const listProfiles = `$ clawbrowser list --session work
[
   {
      "id": "fp_work",
      "created_at": "2026-04-27T10:00:00Z",
      "country": "US"
   }
]`;

const multiProfile = `clawbrowser start --session agent-us --port 9222 -- https://example.com
clawbrowser start --session agent-de --port 9223 -- https://example.com
clawbrowser start --session agent-uk --port 9224 -- https://example.com`;

const errors = `[clawbrowser] ERROR: API key cannot be empty.
[clawbrowser] ERROR: Timed out waiting for CDP on port 9222
[clawbrowser] error: invalid API key
[clawbrowser] error: cannot reach API at https://api.clawbrowser.ai`;

export default function DocsPage() {
  return (
    <div className="mx-auto flex max-w-5xl gap-12 px-6 py-16">
      {/* Sidebar */}
      <aside className="hidden w-48 shrink-0 lg:block">
        <nav className="sticky top-8 flex flex-col gap-2">
          <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            On this page
          </span>
          <NavLink href="#quick-start">Quick Start</NavLink>
          <NavLink href="#agent-integration">Agent Integration</NavLink>
          <NavLink href="#cli">CLI Reference</NavLink>
          <NavLink href="#output-modes">Launcher Output</NavLink>
          <NavLink href="#multi-profile">Multi-Profile</NavLink>
          <NavLink href="#tips">Tips</NavLink>
          <NavLink href="#errors">Error Handling</NavLink>
        </nav>
      </aside>

      {/* Content */}
      <main className="min-w-0 flex-1">
        <h1 className="text-4xl font-bold text-zinc-950">
          Documentation
        </h1>
        <p className="mt-3 text-lg text-zinc-600">
          AI agent integration guide — managed sessions, fingerprint profiles, and proxy routing
          over standard CDP.
        </p>

        <H2 id="quick-start">Quick Start</H2>
        <PromptBlock />
        <P>
          Let the launcher prompt once and save the key to browser-managed
          config, or use a temporary API key environment variable for
          non-interactive automation. Start a named session, then use
          fingerprint flags after <Inline>--</Inline> when identity matters.
        </P>
        <CodeBlock code={quickStart} />

        <H2 id="agent-integration">Agent Integration</H2>
        <P>
          Connect your automation framework to the CDP endpoint the same way you
          would with any Chromium build. Fingerprint spoofing and proxy routing
          are transparent to your agent.
        </P>
        <H3>Playwright (Python)</H3>
        <CodeBlock code={playwrightPython} />
        <H3>Playwright (Node.js)</H3>
        <CodeBlock code={playwrightNode} />
        <H3>Puppeteer</H3>
        <CodeBlock code={puppeteer} />

        <H2 id="cli">CLI Reference</H2>
        <CodeBlock code={cliRef} />

        <H2 id="output-modes">Launcher Output</H2>
        <H3>Endpoint and status</H3>
        <P>
          <Inline>start</Inline> prints the local HTTP CDP endpoint after
          readiness checks pass. Use <Inline>status</Inline> or{" "}
          <Inline>endpoint</Inline> when an agent needs to reconnect later.
        </P>
        <CodeBlock code={launcherOutput} />
        <H3>Profile list</H3>
        <P>
          <Inline>list</Inline> asks the browser to print cached fingerprint
          profiles as JSON. It is not a streaming readiness event feed.
        </P>
        <CodeBlock code={listProfiles} />
        <H3>Browser logs</H3>
        <P>
          Browser and container logs are still useful for debugging startup
          failures, but agents should use the endpoint and status commands for
          normal readiness detection.
        </P>

        <H2 id="multi-profile">Multi-Profile Management</H2>
        <P>
          Each named session has its own tracked CDP endpoint. Run multiple
          sessions simultaneously by giving each one a different session name
          and port. For identity separation, use distinct fingerprint IDs.
        </P>
        <CodeBlock code={multiProfile} />

        <H2 id="tips">Tips for AI Agents</H2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-zinc-600">
          <li>
            <strong className="text-zinc-950">Reuse sessions and profile IDs</strong>{" "}
            for continuity. When using fingerprint mode, the same fingerprint ID
            reuses its cached profile data.
          </li>
          <li>
            Use <Inline>clawbrowser endpoint --session &lt;name&gt;</Inline> to
            reconnect to a running session.
          </li>
          <li>
            The launcher skips the verification page by default for faster
            startup. Pass <Inline>--verify</Inline> when you need to inspect it.
          </li>
          <li>
            <strong className="text-zinc-950">One proxy per session</strong>{" "}
            — for proxy-backed profiles, the proxy does not rotate mid-session.
          </li>
          <li>
            <strong className="text-zinc-950">
              Don{"'"}t override fingerprint properties via CDP
            </strong>{" "}
            — Clawbrowser handles fingerprint overrides at the engine level.
            CDP-level overrides may conflict and create detectable inconsistencies.
          </li>
          <li>
            Use descriptive session names like <Inline>agent-us</Inline>{" "}
            or <Inline>de-scraper-main</Inline> for easier management.
          </li>
        </ul>

        <H2 id="errors">Error Handling</H2>
        <P>
          The launcher exits non-zero on startup failures. Check the exit code
          and the error line to decide whether to retry, restart the session, or
          alert a human. For fingerprint sessions, <Inline>rotate</Inline> passes
          <Inline>--regenerate</Inline> to the browser.
        </P>
        <CodeBlock code={errors} />

        <div className="mt-12 border-t border-zinc-200 pt-8">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-950 underline"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
