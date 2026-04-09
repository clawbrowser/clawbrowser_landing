import Link from "next/link";
import { CodeBlock } from "@/components/docs/code-block";
import { PromptBlock } from "@/components/docs/prompt-block";

export const metadata = {
  title: "Documentation — Clawbrowser",
  description:
    "Clawbrowser agent integration guide: quick start, CLI reference, Playwright and Puppeteer examples.",
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

# First launch — generates fingerprint via API and caches it
clawbrowser --fingerprint=my_agent_profile --remote-debugging-port=9222`;

const playwrightPython = `from playwright.async_api import async_playwright

async with async_playwright() as p:
    browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222")
    page = browser.contexts[0].pages[0]
    await page.goto("https://example.com")
    content = await page.content()`;

const playwrightNode = `const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts()[0].pages()[0];
await page.goto('https://example.com');`;

const puppeteer = `const puppeteer = require('puppeteer');

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
const [page] = await browser.pages();
await page.goto('https://example.com');`;

const cliRef = `# Launch with fingerprint profile
clawbrowser --fingerprint=<profile_id>

# Launch with CDP port for automation
clawbrowser --fingerprint=<profile_id> --remote-debugging-port=9222

# Launch in headless mode
clawbrowser --fingerprint=<profile_id> --headless

# Launch vanilla (no fingerprint, no proxy)
clawbrowser

# List all local profiles
clawbrowser --list

# Regenerate a fingerprint (new identity, preserves cookies/history)
clawbrowser --fingerprint=<profile_id> --regenerate`;

const stdoutDefault = `[clawbrowser] Profile my_agent_profile loaded
[clawbrowser] Proxy verified
[clawbrowser] Fingerprint verified
[clawbrowser] CDP listening on ws://127.0.0.1:9222
[clawbrowser] Browser ready`;

const stdoutJsonCmd = `clawbrowser --fingerprint=my_agent_profile --output=json`;

const stdoutJsonOutput = `{"event":"profile_loaded","profile_id":"my_agent_profile"}
{"event":"proxy_verified"}
{"event":"fingerprint_verified"}
{"event":"cdp_ready","url":"ws://127.0.0.1:9222"}
{"event":"ready"}`;

const multiProfile = `clawbrowser --fingerprint=agent_us_1 --remote-debugging-port=9222 &
clawbrowser --fingerprint=agent_de_1 --remote-debugging-port=9223 &
clawbrowser --fingerprint=agent_uk_1 --remote-debugging-port=9224 &`;

const errors = `[clawbrowser] Error: CLAWBROWSER_API_KEY not set
[clawbrowser] Error: cannot reach fingerprint API
[clawbrowser] Error: proxy connection failed
[clawbrowser] Error: fingerprint verification failed
[clawbrowser] Error: out of credits, please top up at clawbrowser.ai`;

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
          <NavLink href="#output-modes">Output Modes</NavLink>
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
          AI agent integration guide — managed fingerprints and proxy routing
          over standard CDP.
        </p>

        <H2 id="quick-start">Quick Start</H2>
        <PromptBlock />
        <P>
          Set your API key, then launch with a fingerprint profile ID. On first
          use the profile is generated from the API and cached locally —
          subsequent launches reuse the same identity, cookies, and session state.
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

        <H2 id="output-modes">Output Modes</H2>
        <H3>Default (clean)</H3>
        <P>Suppresses Chromium noise. Only Clawbrowser status lines are printed.</P>
        <CodeBlock code={stdoutDefault} />
        <H3>JSON mode</H3>
        <P>
          Pass <Inline>--output=json</Inline> for machine-readable
          newline-delimited JSON events. Parse the <Inline>ready</Inline> event
          to know when the browser is available for automation.
        </P>
        <CodeBlock code={stdoutJsonCmd} />
        <CodeBlock code={stdoutJsonOutput} />
        <H3>Verbose mode</H3>
        <P>
          Pass <Inline>--verbose</Inline> to include full Chromium logs alongside
          Clawbrowser messages — useful for debugging.
        </P>

        <H2 id="multi-profile">Multi-Profile Management</H2>
        <P>
          Each profile carries a unique fingerprint, a dedicated proxy, and
          isolated browser state (cookies, localStorage, history). Run multiple
          profiles simultaneously on different CDP ports:
        </P>
        <CodeBlock code={multiProfile} />

        <H2 id="tips">Tips for AI Agents</H2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-zinc-600">
          <li>
            <strong className="text-zinc-950">Reuse profiles</strong>{" "}
            for session continuity — cookies and login state persist across launches.
          </li>
          <li>
            Use <Inline>--output=json</Inline> to programmatically detect when
            the browser is ready.
          </li>
          <li>
            Use <Inline>--skip-verify</Inline> if your agent handles verification
            and you want faster startup.
          </li>
          <li>
            <strong className="text-zinc-950">One proxy per session</strong>{" "}
            — the proxy does not rotate mid-session, which is more realistic for
            anti-detect purposes.
          </li>
          <li>
            <strong className="text-zinc-950">
              Don{"'"}t override fingerprint properties via CDP
            </strong>{" "}
            — Clawbrowser handles all spoofing at the engine level. CDP-level
            overrides may conflict and create detectable inconsistencies.
          </li>
          <li>
            Use descriptive profile IDs like <Inline>us_residential_1</Inline>{" "}
            or <Inline>de_scraper_main</Inline> for easier management.
          </li>
        </ul>

        <H2 id="errors">Error Handling</H2>
        <P>
          Monitor stdout (or JSON events) for errors. On error the process exits
          with a non-zero exit code — check it and parse the message to decide
          whether to retry or alert.
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
