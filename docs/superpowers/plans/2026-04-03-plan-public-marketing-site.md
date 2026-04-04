# Clawbrowser Public Marketing Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public marketing home page at `/` that accurately explains Clawbrowser.ai from the product design spec: Chromium-based browser with managed fingerprints and proxy routing, optimized for AI agents and multi-account use.

**Architecture:** Implement as the landing route inside the existing Next.js App Router app (`clawbrowser-dashboard`), using the `(public)` route group from the dashboard spec. Content is static (no dashboard API calls). UI uses existing shadcn/ui + Tailwind. Section components are tested with Vitest and React Testing Library. Production URL is `clawbrowser.ai/` per the DevOps spec (same host as the dashboard).

**Tech Stack:** Next.js 15+ (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, Vitest, React Testing Library, jsdom

**Primary spec:** `docs/superpowers/specs/2026-03-21-clawbrowser-design.md`  
**Hosting & route ownership:** `docs/superpowers/specs/2026-03-22-clawbrowser-devops-design.md`, `docs/superpowers/specs/2026-03-23-clawbrowser-dashboard-design.md`  
**Agent snippets (must match):** `docs/SKILL.md`

**Prerequisite:** The `clawbrowser-dashboard` repo (or app directory) must exist with dashboard plan scaffolding through shadcn/ui and Auth0-ready root layout. If `(public)/layout.tsx` and `PublicNav` do not exist yet, complete `docs/superpowers/plans/2026-03-23-plan-dashboard-impl.md` **Task 20, Steps 1–2** first (public layout + nav shell without the final minimalist `page.tsx`), or run the equivalent commands in Step 1 of Task 1 below.

---

## File Structure

All paths are relative to the **`clawbrowser-dashboard`** repository root (per dashboard spec). If you use a monorepo, prefix with `apps/dashboard/` or your chosen directory.

```
src/
  app/
    (public)/
      layout.tsx                    # Public shell: nav + footer (may already exist)
      page.tsx                      # Marketing home — compose section components
  components/
    layouts/
      public-nav.tsx                # Top nav: add in-page anchor links
    marketing/
      hero-section.tsx              # Value prop + CTAs
      problem-solution.tsx          # Who it is for + problem statement
      architecture-summary.tsx      # High-level Chromium + libclaw story (no implementation secrets)
      capability-list.tsx           # Spoofed surfaces / benefits (from spec tables, simplified)
      proxy-section.tsx             # Proxy behavior in plain language
      cli-section.tsx               # CLI examples from design spec
      agent-integration-section.tsx # Playwright + Puppeteer CDP snippets
      platform-note.tsx             # MVP macOS callout
  test/
    setup.ts                        # Vitest + jest-dom (if not already present)
  components/marketing/
    marketing-home.test.tsx         # Integration-style tests for section components
vitest.config.ts                   # @ path alias + jsdom environment
```

**Responsibilities**

| File | Responsibility |
|------|----------------|
| `hero-section.tsx` | Headline, subhead, primary/secondary CTAs (`/signup`, `/docs`) |
| `problem-solution.tsx` | Target users: humans multi-accounting + AI agents; anti-bot/fingerprint framing |
| `architecture-summary.tsx` | Single binary, Chromium + embedded Rust (`libclaw`), shared memory concept in user terms |
| `capability-list.tsx` | Bullet list of fingerprint surfaces (Canvas, WebGL, navigator, etc.) without internal file paths |
| `proxy-section.tsx` | Proxy-from-profile, provider-agnostic, regeneration messaging |
| `cli-section.tsx` | Code blocks for `clawbrowser` CLI from design spec |
| `agent-integration-section.tsx` | CDP connection samples matching `docs/SKILL.md` |
| `platform-note.tsx` | macOS MVP, future platforms as “coming later” |
| `public-nav.tsx` | Links to `/`, `/docs`, `/login`, `/signup` + optional anchors `#capabilities`, `#cli`, `#agents` |
| `page.tsx` | Single column layout, sections in order, semantic `<section>` + `aria-labelledby` |

---

### Task 1: Vitest baseline (keeps CI green)

**Files:**
- Modify: `clawbrowser-dashboard/package.json` (add `test` script if missing)
- Create: `clawbrowser-dashboard/vitest.config.ts`
- Create: `clawbrowser-dashboard/src/test/setup.ts`

- [ ] **Step 1: Ensure Vitest is configured**

If `vitest` is not installed (dashboard plan adds it — verify with `pnpm exec vitest --version`):

```bash
cd clawbrowser-dashboard
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

Create `vitest.config.ts`:

```typescript
import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Create `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

Add to `package.json` `scripts`:

```json
"test": "vitest run --passWithNoTests",
"test:watch": "vitest"
```

- [ ] **Step 2: Verify Vitest runs (zero tests OK)**

```bash
cd clawbrowser-dashboard
pnpm test
```

Expected: exit code 0 (`--passWithNoTests` avoids failure before any `*.test.tsx` files exist).

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts src/test/setup.ts package.json
git commit -m "chore: add vitest + jsdom setup for dashboard"
```

---

### Task 2: Marketing tests and section components (TDD)

**Files:**
- Create: `src/components/marketing/marketing-home.test.tsx`
- Create: `src/components/marketing/hero-section.tsx`
- Create: `src/components/marketing/problem-solution.tsx`
- Create: `src/components/marketing/architecture-summary.tsx`
- Create: `src/components/marketing/capability-list.tsx`
- Create: `src/components/marketing/proxy-section.tsx`
- Create: `src/components/marketing/cli-section.tsx`
- Create: `src/components/marketing/agent-integration-section.tsx`
- Create: `src/components/marketing/platform-note.tsx`

- [ ] **Step 1: Write failing tests for required marketing content**

Create `src/components/marketing/marketing-home.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { HeroSection } from './hero-section';
import { ProblemSolutionSection } from './problem-solution';
import { ArchitectureSummary } from './architecture-summary';
import { CapabilityList } from './capability-list';
import { ProxySection } from './proxy-section';
import { CliSection } from './cli-section';
import { AgentIntegrationSection } from './agent-integration-section';
import { PlatformNote } from './platform-note';

describe('marketing home sections', () => {
  it('hero states product differentiator and offers docs + signup', () => {
    render(<HeroSection />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /fingerprint control and proxy routing/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /get started/i })).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('link', { name: /documentation/i })).toHaveAttribute('href', '/docs');
  });

  it('problem section names AI agents and multi-account users', () => {
    render(<ProblemSolutionSection />);
    const section = screen.getByRole('region', { name: /who clawbrowser is for/i });
    expect(within(section).getByText(/ai agents/i)).toBeInTheDocument();
    expect(within(section).getByText(/multi-account/i)).toBeInTheDocument();
  });

  it('architecture mentions Chromium and libclaw', () => {
    render(<ArchitectureSummary />);
    expect(screen.getByText(/chromium/i)).toBeInTheDocument();
    expect(screen.getByText(/libclaw/i)).toBeInTheDocument();
  });

  it('capabilities include canvas, webgl, and webrtc policy', () => {
    render(<CapabilityList />);
    expect(screen.getByText(/canvas/i)).toBeInTheDocument();
    expect(screen.getByText(/webgl/i)).toBeInTheDocument();
    expect(screen.getByText(/webrtc/i)).toBeInTheDocument();
  });

  it('proxy section states credentials come from profile', () => {
    render(<ProxySection />);
    expect(screen.getByText(/fingerprint profile/i)).toBeInTheDocument();
    expect(screen.getByText(/--regenerate/i)).toBeInTheDocument();
  });

  it('CLI section shows list and remote-debugging-port', () => {
    render(<CliSection />);
    expect(screen.getByText(/--list/i)).toBeInTheDocument();
    expect(screen.getByText(/--remote-debugging-port=9222/i)).toBeInTheDocument();
  });

  it('agent section shows Playwright and Puppeteer CDP URLs', () => {
    render(<AgentIntegrationSection />);
    expect(screen.getByText(/connect_over_cdp/i)).toBeInTheDocument();
    expect(screen.getByText(/connectOverCDP/i)).toBeInTheDocument();
    expect(screen.getByText(/browserURL/i)).toBeInTheDocument();
  });

  it('platform note states macOS MVP', () => {
    render(<PlatformNote />);
    expect(screen.getByText(/macos/i)).toBeInTheDocument();
  });
});
```

Run:

```bash
pnpm test -- src/components/marketing/marketing-home.test.tsx
```

Expected: FAIL — missing module or export for section components.

- [ ] **Step 2: Implement all eight section components**

Create `src/components/marketing/hero-section.tsx`:

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="px-6 py-20 md:py-28 text-center space-y-6 max-w-4xl mx-auto" aria-labelledby="hero-heading">
      <h1 id="hero-heading" className="text-4xl md:text-5xl font-bold tracking-tight">
        Fingerprint control and proxy routing for AI agents
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
        Clawbrowser is a Chromium-based browser with built-in fingerprint management and transparent
        proxy routing. Cut down captcha churn and inconsistent signals when you automate at scale—or
        run many accounts with stable, coherent identities.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Button size="lg" asChild>
          <Link href="/signup">Get started</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/docs">Documentation</Link>
        </Button>
      </div>
    </section>
  );
}
```

Create `src/components/marketing/problem-solution.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ProblemSolutionSection() {
  return (
    <section className="px-6 py-16 bg-muted/40" aria-labelledby="audience-heading">
      <div className="max-w-4xl mx-auto space-y-8">
        <h2 id="audience-heading" className="text-3xl font-bold text-center">
          Who Clawbrowser is for
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>AI agents</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Automate with standard CDP—Playwright, Puppeteer, or anything that speaks DevTools. Fingerprints
              and proxy routing stay consistent so your agent sees a normal browser, not a brittle puppet.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Multi-account operators</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Each fingerprint ID maps to its own profile directory: cookies, storage, and identity move
              together. Separate accounts stay separated on disk by design.
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
```

Create `src/components/marketing/architecture-summary.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ArchitectureSummary() {
  return (
    <section id="architecture" className="px-6 py-16" aria-labelledby="architecture-heading">
      <div className="max-w-3xl mx-auto space-y-6">
        <h2 id="architecture-heading" className="text-3xl font-bold">
          One browser binary, one process
        </h2>
        <p className="text-muted-foreground">
          Clawbrowser pairs a Chromium fork with an embedded Rust library, <strong>libclaw</strong>, for
          fingerprint profiles and proxy credentials. At launch, your profile is loaded so renderer and GPU
          processes read the same values—no per-call glue from your automation code.
        </p>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Built-in verification</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            On startup the browser can run checks that proxy egress matches the profile and that key
            JavaScript surfaces match what was generated—so failures are obvious before your agent touches
            the page.
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
```

Create `src/components/marketing/capability-list.tsx`:

```typescript
const items = [
  'Canvas 2D and WebGL (vendor, renderer, readbacks)',
  'AudioContext output',
  'Client rects and bounding boxes',
  'Navigator: user agent, languages, platform, hardware signals',
  'Screen metrics, timezone, and fonts',
  'Media devices, plugins, speech voices',
  'WebRTC policy oriented toward relay usage to reduce IP leaks',
];

export function CapabilityList() {
  return (
    <section id="capabilities" className="px-6 py-16 bg-muted/40" aria-labelledby="capabilities-heading">
      <div className="max-w-3xl mx-auto space-y-6">
        <h2 id="capabilities-heading" className="text-3xl font-bold">
          Surfaces stay internally consistent
        </h2>
        <p className="text-muted-foreground">
          Profiles are generated to match real-world combinations—platform, fonts, timezone, and proxy
          geography line up so you are not advertising contradictory signals.
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

Create `src/components/marketing/proxy-section.tsx`:

```typescript
export function ProxySection() {
  return (
    <section id="proxy" className="px-6 py-16" aria-labelledby="proxy-heading">
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 id="proxy-heading" className="text-3xl font-bold">
          Proxy routing from the fingerprint profile
        </h2>
        <p className="text-muted-foreground">
          Proxy credentials ride along with the fingerprint payload. Clawbrowser does not pick a separate
          proxy stack at launch—whatever the profile contains is what the browser uses for that session.
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Provider-agnostic: residential, datacenter, or other types expressed in the profile.</li>
          <li>One proxy per launch; no mid-session rotation inside a single run.</li>
          <li>If the proxy is broken or expired, relaunch after fixing credentials or run with{' '}
            <code className="rounded bg-muted px-1">--regenerate</code> to fetch a fresh profile from the API.
          </li>
        </ul>
      </div>
    </section>
  );
}
```

Create `src/components/marketing/cli-section.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const examples = `export CLAWBROWSER_API_KEY=clawbrowser_xxxxx

clawbrowser --fingerprint=fp_abc123
clawbrowser --fingerprint=fp_abc123 --regenerate
clawbrowser --fingerprint=fp_abc123 --remote-debugging-port=9222
clawbrowser --fingerprint=fp_abc123 --headless
clawbrowser --list
clawbrowser`;

export function CliSection() {
  return (
    <section id="cli" className="px-6 py-16 bg-muted/40" aria-labelledby="cli-heading">
      <div className="max-w-3xl mx-auto space-y-6">
        <h2 id="cli-heading" className="text-3xl font-bold">
          CLI that stays familiar
        </h2>
        <p className="text-muted-foreground">
          The executable is Chromium with Clawbrowser hooks. Standard Chromium flags pass through; Clawbrowser
          adds profile-oriented commands for fingerprints and automation-friendly output.
        </p>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Common commands</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm overflow-x-auto whitespace-pre rounded-lg bg-background border p-4">
              <code>{examples}</code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
```

Create `src/components/marketing/agent-integration-section.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
      <div className="max-w-3xl mx-auto space-y-6">
        <h2 id="agents-heading" className="text-3xl font-bold">
          Connect over standard CDP
        </h2>
        <p className="text-muted-foreground">
          Launch with <code className="rounded bg-muted px-1">--remote-debugging-port</code>, then attach the
          same way you would to any Chromium build. Spoofing and proxying are invisible to your automation.
        </p>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Playwright (Python)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm overflow-x-auto rounded-lg bg-background border p-4">
                <code>{python}</code>
              </pre>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Playwright (Node)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm overflow-x-auto rounded-lg bg-background border p-4">
                <code>{nodePlaywright}</code>
              </pre>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Puppeteer</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm overflow-x-auto rounded-lg bg-background border p-4">
                <code>{puppeteer}</code>
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
```

Create `src/components/marketing/platform-note.tsx`:

```typescript
import { Card, CardContent } from '@/components/ui/card';

export function PlatformNote() {
  return (
    <section className="px-6 py-12" aria-label="Platform support">
      <Card className="max-w-3xl mx-auto border-dashed">
        <CardContent className="pt-6 text-sm text-muted-foreground text-center">
          MVP builds target <strong className="text-foreground">macOS</strong>. Linux and other platforms are
          on the roadmap; Windows is explicitly out of scope for now.
        </CardContent>
      </Card>
    </section>
  );
}
```

- [ ] **Step 3: Run tests**

```bash
pnpm test -- src/components/marketing/marketing-home.test.tsx
```

Expected: PASS (all eight tests green).

- [ ] **Step 4: Commit**

```bash
git add src/components/marketing/
git commit -m "feat: add marketing sections and tests from product design spec"
```

---

### Task 3: Compose home page and enhance public nav

**Files:**
- Modify: `src/app/(public)/page.tsx`
- Modify: `src/components/layouts/public-nav.tsx`

- [ ] **Step 1: Replace landing page composition**

Replace contents of `src/app/(public)/page.tsx` with:

```typescript
import { HeroSection } from '@/components/marketing/hero-section';
import { ProblemSolutionSection } from '@/components/marketing/problem-solution';
import { ArchitectureSummary } from '@/components/marketing/architecture-summary';
import { CapabilityList } from '@/components/marketing/capability-list';
import { ProxySection } from '@/components/marketing/proxy-section';
import { CliSection } from '@/components/marketing/cli-section';
import { AgentIntegrationSection } from '@/components/marketing/agent-integration-section';
import { PlatformNote } from '@/components/marketing/platform-note';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <ProblemSolutionSection />
      <ArchitectureSummary />
      <CapabilityList />
      <ProxySection />
      <CliSection />
      <AgentIntegrationSection />
      <PlatformNote />
    </div>
  );
}
```

- [ ] **Step 2: Add anchor links to public nav**

Update `src/components/layouts/public-nav.tsx` to include in-page jumps (keep existing auth links):

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const navClass = 'text-sm text-muted-foreground hover:text-foreground transition-colors';

export function PublicNav() {
  return (
    <nav className="flex items-center justify-between gap-4 px-6 py-4 border-b">
      <Link href="/" className="text-xl font-bold shrink-0">
        Clawbrowser
      </Link>
      <div className="hidden md:flex items-center gap-6">
        <Link href="/#capabilities" className={navClass}>
          Capabilities
        </Link>
        <Link href="/#cli" className={navClass}>
          CLI
        </Link>
        <Link href="/#agents" className={navClass}>
          Agents
        </Link>
        <Link href="/docs" className={navClass}>
          Docs
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">Log in</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/signup">Sign up</Link>
        </Button>
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Run full unit test suite**

```bash
pnpm test
```

Expected: PASS (no regressions in other dashboard tests).

- [ ] **Step 4: Commit**

```bash
git add src/app/\(public\)/page.tsx src/components/layouts/public-nav.tsx
git commit -m "feat: compose marketing home page and public nav anchors"
```

---

### Task 4: Smoke-build verification

**Files:** none (commands only)

- [ ] **Step 1: Production build**

```bash
cd clawbrowser-dashboard
pnpm run build
```

Expected: Next.js completes without type errors; `(public)/page` is prerendered or server-rendered according to your root layout.

- [ ] **Step 2: Optional Playwright smoke (if project already has Playwright from dashboard plan)**

```bash
pnpm exec playwright test --grep home
```

If no home spec exists yet, skip this step; the dashboard plan adds E2E later.

- [ ] **Step 3: Commit only if you adjusted config**

If `playwright.config.ts` or CI required changes for base URL, commit those in a dedicated commit; otherwise no commit.

---

## Self-review (completed)

**1. Spec coverage (2026-03-21 design)**  
- Product overview and differentiator: Task 2 `HeroSection`, `ProblemSolutionSection`  
- Architecture (Chromium + libclaw, verification concept): `ArchitectureSummary`  
- Fingerprint surfaces: `CapabilityList`  
- Proxy manager behavior: `ProxySection`  
- CLI examples: `CliSection`  
- AI agent CDP integration: `AgentIntegrationSection` (aligned with `docs/SKILL.md`)  
- Platform support (macOS MVP): `PlatformNote`  
- Backend API / OpenAPI: linked via global `/docs` CTA—not duplicated on the home page (YAGNI).  

**2. Placeholder scan**  
- No TBD/TODO/skip steps; all code blocks are complete.

**3. Type consistency**  
- Component names match test imports; section `id` attributes match nav `/#...` hrefs.

**4. Gap note**  
- If the marketing site must live on a **different hostname** than the dashboard (e.g. `www.` vs app), that requires an additional DevOps task (Traefik IngressRoute + deployment). The current specs assume **prod dashboard/marketing share `clawbrowser.ai`**.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-03-plan-public-marketing-site.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?

If **Subagent-Driven** is chosen: use superpowers:subagent-driven-development (fresh subagent per task + two-stage review).

If **Inline Execution** is chosen: use superpowers:executing-plans (batch execution with checkpoints for review).
