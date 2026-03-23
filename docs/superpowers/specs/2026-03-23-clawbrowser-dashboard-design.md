# Clawbrowser Dashboard — Design Specification

## Overview

Customer-facing web dashboard for clawbrowser.ai: a Next.js application where users manage API keys, monitor usage, handle billing, and onboard onto the platform. Includes public documentation and changelog. Communicates directly with the Go backend API (`clawbrowser-api`) using Auth0 JWT authentication.

**Repo:** `clawbrowser-dashboard`

**Related specs:**
- Master spec: `docs/superpowers/specs/2026-03-21-clawbrowser-design.md`
- Backend: `docs/superpowers/specs/2026-03-22-clawbrowser-backend-design.md`
- DevOps: `docs/superpowers/specs/2026-03-22-clawbrowser-devops-design.md`
- API contract: `api/openapi.yaml`

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Runtime | Node.js 22 |
| Package manager | pnpm |
| UI components | shadcn/ui + Tailwind CSS |
| Charts | Recharts |
| Server state | TanStack Query |
| API client | openapi-typescript + openapi-fetch |
| Auth | Auth0 Universal Login (redirect) via `@auth0/nextjs-auth0` |
| Docs rendering | MDX |
| Docs search | Flexsearch (client-side) |
| Unit/component testing | Vitest + React Testing Library |
| API mocking (tests) | MSW (Mock Service Worker) |
| E2E testing | Playwright |
| Deployment | Docker container → EKS |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (User)                           │
│                                                                 │
│  ┌──────────────────────┐     ┌──────────────────────────────┐  │
│  │   Public Pages        │     │   Dashboard (authenticated)  │  │
│  │                       │     │                              │  │
│  │  /            Landing │     │  /dashboard      Overview    │  │
│  │  /docs/*      Docs    │     │  /api-keys       Keys CRUD   │  │
│  │  /changelog   News    │     │  /usage          Stats       │  │
│  │                       │     │  /billing        Plans       │  │
│  │  No auth required     │     │  /settings       Profile     │  │
│  │  Flexsearch index     │     │  /onboarding     Wizard      │  │
│  │                       │     │  /support        Help        │  │
│  └──────────┬────────────┘     └──────────┬───────────────────┘  │
│             │                             │                      │
└─────────────┼─────────────────────────────┼──────────────────────┘
              │                             │
              │  Static/MDX content         │  Auth0 JWT + fetch
              │  (no API calls)             │  (openapi-fetch client)
              │                             │
              ▼                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Go API (clawbrowser-api)                     │
│                                                                 │
│   /v1/me              GET/PUT customer profile                  │
│   /v1/api-keys        CRUD + rotate                             │
│   /v1/usage           Stats + history                           │
│   /v1/billing/*       Subscription + portal                     │
│   /v1/fingerprints/*  Browser-facing (Unkey auth, not dashboard)│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

- **Direct browser → Go API** — no BFF proxy layer. The dashboard does not proxy API calls through Next.js API routes. Auth0 JWT is attached as a Bearer token to every request.
- **No business data in the dashboard** — all state lives in the Go API. The dashboard is a pure presentation layer.
- **Type-safe API client** — types generated from `api/openapi.yaml` via openapi-typescript. openapi-fetch provides runtime type safety for API calls.
- **Route groups** — Next.js route groups separate public pages (no auth) from the authenticated dashboard shell.

## Authentication Flow

```
User visits /dashboard/*
  │
  ├─ Has valid session cookie?
  │   ├─ YES → render page, attach JWT to API calls
  │   └─ NO → redirect to /login
  │
  /login
  │
  └─ Auth0 Universal Login (redirect)
      │
      ├─ User authenticates (email/password, Google, Apple, GitHub)
      │
      └─ Auth0 redirects to /callback
          │
          ├─ Auth0 SDK exchanges code for tokens
          ├─ Sets encrypted session cookie (httpOnly, secure)
          ├─ Checks if first login:
          │   ├─ YES → redirect to /onboarding (if feature enabled)
          │   └─ NO → redirect to /dashboard
          │
          └─ On subsequent API calls:
              ├─ Auth0 SDK reads session cookie
              ├─ Returns access token (JWT)
              └─ openapi-fetch attaches as Bearer header
```

**Implementation:**
- `@auth0/nextjs-auth0` handles session management, token refresh, and the callback exchange
- Session lives in an encrypted httpOnly cookie — no tokens in localStorage
- Next.js `middleware.ts` checks auth on `(dashboard)` routes; unauthenticated users redirect to `/login`
- Token refresh is automatic via the Auth0 SDK
- A `useApiClient` hook calls `getAccessToken()` and creates an openapi-fetch client with the Bearer header

## Project Structure

```
clawbrowser-dashboard/
├── public/
│   └── favicon.ico
├── src/
│   ├── middleware.ts                      # Auth check for dashboard routes (must be src root)
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (providers, fonts, TanStack)
│   │   ├── (public)/
│   │   │   ├── layout.tsx                # Public layout (marketing nav, footer)
│   │   │   ├── page.tsx                  # Landing page
│   │   │   ├── docs/
│   │   │   │   ├── [[...slug]]/page.tsx  # Catch-all MDX doc renderer
│   │   │   │   └── _content/            # MDX files
│   │   │   └── changelog/
│   │   │       └── page.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx            # Triggers Auth0 redirect
│   │   │   ├── signup/page.tsx           # Triggers Auth0 signup redirect
│   │   │   └── callback/page.tsx         # Auth0 callback handler
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                # Dashboard shell (collapsible sidebar, topbar)
│   │   │   ├── page.tsx                  # Overview / home
│   │   │   ├── api-keys/page.tsx
│   │   │   ├── usage/page.tsx
│   │   │   ├── billing/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   ├── onboarding/page.tsx
│   │   │   └── support/page.tsx
│   │   └── api/
│   │       └── auth/[...auth0]/route.ts  # Auth0 SDK route handlers
│   ├── components/
│   │   ├── ui/                           # shadcn/ui components
│   │   ├── layouts/
│   │   │   ├── public-nav.tsx
│   │   │   ├── dashboard-sidebar.tsx
│   │   │   └── dashboard-topbar.tsx
│   │   └── shared/                       # Reusable business components
│   ├── lib/
│   │   ├── api-client.ts                 # openapi-fetch configured instance
│   │   ├── auth.ts                       # Auth0 SDK config
│   │   ├── features.ts                   # Feature flag reader (config + env)
│   │   └── search.ts                     # Flexsearch index builder
│   ├── hooks/
│   │   ├── use-api-client.ts             # Auth0 token → openapi-fetch client
│   │   ├── use-api-keys.ts              # TanStack Query hooks for API keys
│   │   ├── use-usage.ts
│   │   ├── use-billing.ts
│   │   └── use-customer.ts
│   ├── types/
│   │   └── api.d.ts                      # Generated from openapi-typescript
│   └── content/
│       └── docs/                         # MDX doc source files
│           ├── getting-started.mdx
│           ├── api-reference.mdx
│           └── guides/
├── features.json                         # Feature flag defaults
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── pnpm-lock.yaml
├── Dockerfile
└── .env.example
```

### Layer Responsibilities

- **`app/`** — routes and layouts only, minimal logic
- **`components/ui/`** — shadcn/ui primitives (button, input, table, toast, etc.)
- **`components/layouts/`** — dashboard shell components (sidebar, topbar, public nav)
- **`components/shared/`** — reusable business components (API key table, usage chart, stat cards)
- **`lib/`** — configuration, clients, utilities
- **`hooks/`** — TanStack Query hooks, one file per API domain
- **`types/`** — generated API types (not hand-written)
- **`content/`** — MDX source files for docs

## API Client & Data Fetching

### Type Generation Pipeline

```
api/openapi.yaml → openapi-typescript → src/types/api.d.ts
```

Run via `pnpm generate-types`. Also runs in CI to catch spec drift.

### API Client

```typescript
// lib/api-client.ts
import createClient from 'openapi-fetch';
import type { paths } from '@/types/api';

export function createApiClient(accessToken: string) {
  return createClient<paths>({
    baseUrl: process.env.NEXT_PUBLIC_API_URL,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
```

### TanStack Query Hooks

One hook file per API domain. Each exports query and mutation hooks.

```typescript
// hooks/use-api-keys.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from './use-api-client';

export function useApiKeys() {
  const client = useApiClient();
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data } = await client.GET('/v1/api-keys');
      return data;
    },
  });
}

export function useRevokeApiKey() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await client.DELETE('/v1/api-keys/{id}', { params: { path: { id } } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}
```

**Patterns:**
- `useApiClient` hook — calls `getAccessToken()` from Auth0, creates openapi-fetch client. Memoized per token.
- Mutations invalidate related queries automatically
- All return types inferred from the OpenAPI spec

## Feature Flags

### Configuration

```json
// features.json (project root)
{
  "onboarding": false,
  "docs": false,
  "quickstart_snippets": false,
  "changelog": false,
  "support": false
}
```

### Resolution Order

1. Environment variable `NEXT_PUBLIC_FF_<UPPERCASE_FLAG_NAME>` — if set, takes precedence
2. `features.json` value — default

### Reader

```typescript
// lib/features.ts
import config from '../../features.json';

export function isFeatureEnabled(flag: keyof typeof config): boolean {
  const envKey = `NEXT_PUBLIC_FF_${flag.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal !== undefined) {
    return envVal === 'true';
  }
  return config[flag];
}
```

### Usage

- **Routes:** feature-flagged pages call `isFeatureEnabled()` and return `notFound()` if disabled
- **Navigation:** sidebar conditionally renders links based on flags
- **Per-environment control:** Kustomize overlay env vars enable features per environment

Core pages (Overview, API Keys, Usage, Billing, Settings) have no feature flags — always enabled.

## Dashboard Layout

Collapsible sidebar with topbar.

- **Sidebar:** fixed left panel with nav links. Collapses to icon-only mode via user toggle or on smaller screens. Contains: logo, primary nav (Overview, API Keys, Usage, Billing, Settings), secondary nav (Docs, Changelog, Support — when feature-enabled).
- **Topbar:** spans content area. Contains: page breadcrumb/title, user avatar dropdown (profile, logout).
- **Content area:** right of sidebar, below topbar. Each page renders here.

Sidebar collapse state persisted in localStorage.

## Dashboard Pages

### Core Pages (always enabled)

**Overview (`/dashboard`)**
- Stat cards: API calls today, active API keys count, current plan
- 7-day usage trend chart (Recharts area chart)
- Quick-start code snippet (if feature enabled) with user's API key pre-filled
- Data: `GET /v1/usage`, `GET /v1/usage/history`, `GET /v1/api-keys`, `GET /v1/billing/subscription`

**API Keys (`/api-keys`)**
- Table: name, masked key, created date, actions (rotate, revoke)
- Create key dialog: name input → `POST /v1/api-keys` → show full key once (copy to clipboard)
- Rotate confirmation dialog → `POST /v1/api-keys/{id}/rotate` → show new key once
- Revoke confirmation dialog → `DELETE /v1/api-keys/{id}`
- Data: `GET /v1/api-keys`, `POST /v1/api-keys`, `DELETE /v1/api-keys/{id}`, `POST /v1/api-keys/{id}/rotate`

**Usage (`/usage`)**
- Time range selector: 7 days, 30 days, 90 days
- Recharts area chart: fingerprint generations and proxy verifications over time
- Summary cards: total calls in period, quota remaining
- Data: `GET /v1/usage`, `GET /v1/usage/history`

**Billing (`/billing`)**
- Current plan display: plan name, status, current period end date, usage against limit
- "Manage Subscription" button → `POST /v1/billing/portal` → redirects to UniBee external portal (handles pricing, invoices, plan changes)
- Data: `GET /v1/billing/subscription`, `POST /v1/billing/portal`

**Settings (`/settings`)**
- Profile form: name (editable), email (read-only, from Auth0)
- Save button → `PUT /v1/me`
- Data: `GET /v1/me`, `PUT /v1/me`

### Feature-Flagged Pages

**Onboarding Wizard (`/onboarding`)** — flag: `onboarding`
- Step-by-step guided setup shown on first login
- Steps: copy API key → install clawbrowser CLI → launch first profile
- Progress tracked client-side (localStorage)
- Can be revisited from sidebar

**Documentation Hub (`/docs/*`)** — flag: `docs`
- Public (no auth required), rendered from MDX files via catch-all `[[...slug]]` route
- Flexsearch client-side search built at build time from MDX content
- Sections: getting started, API reference, guides
- Authenticated users see personalized code snippets (API key pre-filled)

**Quick-Start Snippets** — flag: `quickstart_snippets`
- Embedded component (not a standalone page)
- Shown in Overview page and within docs
- Tabbed code blocks: Playwright (Python), Playwright (Node.js), Puppeteer
- Authenticated users see their API key pre-filled; unauthenticated see placeholder

**Changelog (`/changelog`)** — flag: `changelog`
- Public (no auth required), MDX-based release notes
- "What's New" badge in sidebar when new entries exist (compared against localStorage last-seen timestamp)

**Support (`/support`)** — flag: `support`
- Contact form (name, email, message) or link to external support system
- Specific implementation deferred — could integrate with a ticketing system later

## Error Handling

### API Error Handling

```
API call fails
  │
  ├─ 401 Unauthorized
  │   └─ Auth0 token expired → SDK auto-refreshes
  │       └─ Refresh fails → redirect to /login
  │
  ├─ 403 Forbidden → show "access denied" in page
  ├─ 404 Not Found → show "not found" message
  ├─ 429 Rate Limited → TanStack Query retries with backoff (3 attempts)
  └─ 500 / network error → TanStack Query retries (3 attempts)
      └─ Still failing → error state with "Retry" button
```

### Implementation

- **Global error handler** in TanStack Query client config — handles 401 → redirect centrally
- **Per-page `error.tsx`** files — Next.js error boundaries catch rendering errors, show fallback UI
- **Optimistic updates** for CRUD mutations (API key create/revoke) — update UI immediately, roll back on error
- **Toast notifications** via shadcn/ui toast — success/error feedback on mutations

### Loading States

- Skeleton components (shadcn/ui) shown while data loads
- Dashboard shell (sidebar, topbar) renders immediately — only page content shows loading state
- TanStack Query `isLoading` / `isFetching` states drive skeleton visibility

## Testing Strategy

| Layer | Tool | Coverage |
|-------|------|----------|
| Unit | Vitest | Feature flag logic, utilities, data transformations |
| Component | Vitest + React Testing Library | Components render correctly, handle props/states |
| Hook | Vitest + React Testing Library `renderHook` | TanStack Query hooks with MSW-mocked API responses |
| E2E | Playwright | Full user flows: login → create key → view usage → manage billing |
| Type check | `tsc --noEmit` | Type errors, OpenAPI type alignment |

**API mocking:** MSW intercepts fetch calls in tests, returns mock responses matching OpenAPI types.

**No snapshot tests** — explicit assertions only.

### CI Pipeline

```
pnpm lint            → ESLint + Prettier check
pnpm typecheck       → tsc --noEmit
pnpm test            → Vitest (unit + component + hook)
pnpm test:e2e        → Playwright (against dev environment)
pnpm generate-types  → verify openapi-typescript output is up to date
```

## Deployment

### Dockerfile

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm generate-types && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/features.json ./features.json
EXPOSE 3000
CMD ["node", "server.js"]
```

- Multi-stage build: deps → build → lean runtime image
- `next.config.ts` uses `output: 'standalone'` for self-contained `server.js`
- `features.json` copied into image; env vars override at runtime via Kustomize

### GitHub Actions CI Caching

pnpm store cached in GitHub Actions for faster builds:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22

- uses: pnpm/action-setup@v4

- name: Get pnpm store directory
  shell: bash
  run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

- uses: actions/cache@v4
  with:
    path: ${{ env.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: ${{ runner.os }}-pnpm-store-
```

### Environment Variables

Injected via Sealed Secrets in Kustomize overlays per environment:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Go API base URL (e.g., `https://api.clawbrowser.ai`) |
| `AUTH0_SECRET` | Auth0 session encryption secret |
| `AUTH0_BASE_URL` | Dashboard URL (e.g., `https://clawbrowser.ai`) |
| `AUTH0_ISSUER_BASE_URL` | Auth0 tenant URL |
| `AUTH0_CLIENT_ID` | Auth0 application client ID |
| `AUTH0_CLIENT_SECRET` | Auth0 application client secret |
| `NEXT_PUBLIC_FF_*` | Feature flag overrides |

### Health Probes

| Probe | Endpoint | Purpose |
|-------|----------|---------|
| Liveness | `GET /` | Pod is alive |
| Readiness | `GET /` | Pod is ready for traffic |
| Initial delay | 10s | Matches devops spec |

## Deferred (Post-MVP)

- **Referral program** — requires new backend API endpoints not yet in OpenAPI spec
- **Dark mode / theme toggle** — shadcn/ui supports this but not in MVP scope
- **Internationalization (i18n)** — English only for MVP
- **Real-time updates (WebSocket)** — usage stats are polled via TanStack Query, not pushed
