# Clawbrowser Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Next.js customer dashboard for clawbrowser.ai where users manage API keys, monitor usage, handle billing, and onboard — communicating with the Go backend API via Auth0 JWT auth.

**Architecture:** Next.js App Router with route groups separating public pages (no auth) from the authenticated dashboard shell. Direct browser-to-API calls (no BFF proxy). Type-safe API client generated from OpenAPI spec. TanStack Query for server state, shadcn/ui for components.

**Tech Stack:** Next.js (App Router), TypeScript, pnpm, shadcn/ui, Tailwind CSS, Recharts, TanStack Query, openapi-typescript, openapi-fetch, Auth0 (`@auth0/nextjs-auth0`), Vitest, MSW, Playwright

**Spec:** `docs/superpowers/specs/2026-03-23-clawbrowser-dashboard-design.md`
**API Contract:** `api/openapi.yaml`

**Cross-plan compatibility:**
- **DevOps:** This plan includes a CI/CD workflow (Task 24) that builds, pushes, and fires `repository_dispatch` to `clawbrowser-infra` per the devops spec's build flow.
- **Observability:** The dashboard is a stateless Next.js frontend. Pod-level metrics (CPU, memory, restarts) are collected by VictoriaMetrics via kubelet/cAdvisor. Fluent Bit collects Next.js stdout logs automatically. No application-level `/metrics` endpoint is needed. The observability plan should add a "Dashboard Pod Resources" row to its pod resources Grafana dashboard.
- **Auth0 audience:** Uses a dedicated `AUTH0_AUDIENCE` env var (not `NEXT_PUBLIC_API_URL`) to avoid coupling the Auth0 audience identifier with the API base URL.

---

## File Structure

```
src/
  middleware.ts                           # Auth check for (dashboard) routes
  app/
    layout.tsx                            # Root layout (providers, fonts)
    (public)/
      layout.tsx                          # Public layout (marketing nav, footer)
      page.tsx                            # Landing page
      docs/
        [[...slug]]/page.tsx              # Catch-all MDX doc renderer
        _content/                         # MDX files directory
      changelog/
        page.tsx                          # Changelog page
    (auth)/
      login/page.tsx                      # Auth0 login redirect
      signup/page.tsx                     # Auth0 signup redirect
      callback/page.tsx                   # Auth0 callback handler
    (dashboard)/
      layout.tsx                          # Dashboard shell (sidebar + topbar)
      dashboard/page.tsx                  # Overview / home (serves /dashboard)
      api-keys/page.tsx                   # API key management
      usage/page.tsx                      # Usage stats + charts
      billing/page.tsx                    # Subscription + portal
      settings/page.tsx                   # Profile settings
      onboarding/page.tsx                 # Onboarding wizard (feature-flagged)
      support/page.tsx                    # Support page (feature-flagged)
      error.tsx                           # Dashboard error boundary
      loading.tsx                         # Dashboard loading skeleton
    api/
      auth/[...auth0]/route.ts            # Auth0 SDK route handlers
  components/
    ui/                                   # shadcn/ui components (installed via CLI)
    layouts/
      public-nav.tsx                      # Public page navigation
      dashboard-sidebar.tsx               # Collapsible sidebar
      dashboard-topbar.tsx                # Topbar with breadcrumb + avatar
    shared/
      stat-card.tsx                       # Reusable stat card
      usage-chart.tsx                     # Recharts area chart wrapper
      api-key-table.tsx                   # API key table with actions
      quickstart-snippets.tsx             # Tabbed code snippets (feature-flagged)
      copy-button.tsx                     # Copy to clipboard button
  lib/
    api-client.ts                         # openapi-fetch configured instance
    auth.ts                               # Auth0 SDK config
    features.ts                           # Feature flag reader
    search.ts                             # Flexsearch index builder (docs) [deferred post-MVP]
  hooks/
    use-api-client.ts                     # Auth0 token → openapi-fetch client
    use-api-keys.ts                       # TanStack Query hooks for API keys
    use-usage.ts                          # Usage query hooks
    use-billing.ts                        # Billing query hooks
    use-customer.ts                       # Customer profile hooks
  types/
    api.d.ts                              # Generated from openapi-typescript
  content/
    docs/
      getting-started.mdx
      api-reference.mdx
features.json                             # Feature flag defaults
next.config.ts
tailwind.config.ts
tsconfig.json
package.json
Dockerfile
.env.example
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.env.example`, `features.json`

- [ ] **Step 1: Initialize Next.js project with pnpm**

```bash
cd /Users/devtest/claudews/clawbrowser
pnpm create next-app src --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --no-turbopack
```

Move files to project root if created inside `src/` subdirectory. The resulting structure should have `src/app/` under the project root.

- [ ] **Step 2: Install core dependencies**

```bash
pnpm add @auth0/nextjs-auth0 @tanstack/react-query openapi-fetch recharts next-mdx-remote
pnpm add -D openapi-typescript @types/node vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom msw
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
pnpm dlx shadcn@latest init
```

Select defaults: New York style, Zinc base color, CSS variables.

- [ ] **Step 4: Install required shadcn/ui components**

```bash
pnpm dlx shadcn@latest add button card dialog dropdown-menu input label separator skeleton table tabs toast tooltip avatar badge sheet
```

**Note:** After installing `toast`, verify the `useToast` hook path. Depending on your shadcn/ui configuration, it may be installed at `@/hooks/use-toast` or `@/components/ui/use-toast`. All page imports in this plan use `@/hooks/use-toast` — adjust if your install path differs.

- [ ] **Step 5: Create .env.example**

Create `.env.example`:

```bash
# Auth0
AUTH0_SECRET=
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_AUDIENCE=

# API
NEXT_PUBLIC_API_URL=http://localhost:8080

# Feature flags (override features.json)
# NEXT_PUBLIC_FF_ONBOARDING=true
# NEXT_PUBLIC_FF_DOCS=true
# NEXT_PUBLIC_FF_QUICKSTART_SNIPPETS=true
# NEXT_PUBLIC_FF_CHANGELOG=true
# NEXT_PUBLIC_FF_SUPPORT=true
```

- [ ] **Step 6: Create features.json**

Create `features.json` in project root:

```json
{
  "onboarding": false,
  "docs": false,
  "quickstart_snippets": false,
  "changelog": false,
  "support": false
}
```

- [ ] **Step 7: Update next.config.ts**

Update `next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
```

- [ ] **Step 8: Add scripts to package.json**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "generate-types": "openapi-typescript ../api/openapi.yaml -o src/types/api.d.ts"
  }
}
```

- [ ] **Step 9: Create vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Create `src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 10: Verify project compiles**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js dashboard with shadcn/ui, TanStack Query, Auth0"
```

---

### Task 2: OpenAPI Type Generation

**Files:**
- Create: `src/types/api.d.ts`

- [ ] **Step 1: Generate types from OpenAPI spec**

```bash
pnpm generate-types
```

- [ ] **Step 2: Verify generated types exist**

```bash
ls src/types/api.d.ts
```

Expected: File exists with exported `paths`, `components` types.

- [ ] **Step 3: Commit**

```bash
git add src/types/api.d.ts
git commit -m "feat: generate TypeScript types from OpenAPI spec"
```

---

### Task 3: Feature Flags

**Files:**
- Create: `src/lib/features.ts`
- Create: `src/lib/__tests__/features.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/__tests__/features.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { isFeatureEnabled } from '../features';

describe('isFeatureEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns false for disabled features from config', () => {
    expect(isFeatureEnabled('onboarding')).toBe(false);
  });

  it('returns true when env var overrides to true', () => {
    vi.stubEnv('NEXT_PUBLIC_FF_ONBOARDING', 'true');
    expect(isFeatureEnabled('onboarding')).toBe(true);
  });

  it('returns false when env var overrides to false', () => {
    vi.stubEnv('NEXT_PUBLIC_FF_ONBOARDING', 'false');
    expect(isFeatureEnabled('onboarding')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/lib/__tests__/features.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/lib/features.ts`:

```typescript
import config from '../../features.json';

type FeatureFlag = keyof typeof config;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const envKey = `NEXT_PUBLIC_FF_${flag.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal !== undefined) {
    return envVal === 'true';
  }
  return config[flag];
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/lib/__tests__/features.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/features.ts src/lib/__tests__/features.test.ts
git commit -m "feat: add feature flag reader with env var override"
```

---

### Task 4: Auth0 Setup

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...auth0]/route.ts`
- Create: `src/middleware.ts`

- [ ] **Step 1: Create Auth0 config**

Create `src/lib/auth.ts`:

```typescript
import { initAuth0 } from '@auth0/nextjs-auth0';

export const auth0 = initAuth0({
  secret: process.env.AUTH0_SECRET,
  baseURL: process.env.AUTH0_BASE_URL,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  authorizationParams: {
    scope: 'openid profile email',
    audience: process.env.AUTH0_AUDIENCE,
  },
});
```

- [ ] **Step 2: Create Auth0 route handlers**

Create `src/app/api/auth/[...auth0]/route.ts`:

```typescript
import { handleAuth } from '@auth0/nextjs-auth0';

export const GET = handleAuth();
```

- [ ] **Step 3: Create auth middleware**

Create `src/middleware.ts`:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const session = await getSession(request, res);

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api-keys/:path*',
    '/usage/:path*',
    '/billing/:path*',
    '/settings/:path*',
    '/onboarding/:path*',
    '/support/:path*',
  ],
};
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/[...auth0]/route.ts src/middleware.ts
git commit -m "feat: add Auth0 authentication with middleware for dashboard routes"
```

---

### Task 5: API Client + useApiClient Hook

**Files:**
- Create: `src/lib/api-client.ts`
- Create: `src/hooks/use-api-client.ts`
- Create: `src/hooks/__tests__/use-api-client.test.ts`

- [ ] **Step 1: Create API client factory**

Create `src/lib/api-client.ts`:

```typescript
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

export type ApiClient = ReturnType<typeof createApiClient>;
```

- [ ] **Step 2: Create access token API route**

Create `src/app/api/auth/access-token/route.ts`:

```typescript
import { getAccessToken } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { accessToken } = await getAccessToken();
    return NextResponse.json({ accessToken });
  } catch {
    return NextResponse.json({ accessToken: null }, { status: 401 });
  }
}
```

- [ ] **Step 3: Create useApiClient hook**

Create `src/hooks/use-api-client.ts`:

```typescript
'use client';

import { useMemo } from 'react';
import createClient from 'openapi-fetch';
import type { paths } from '@/types/api';
import type { Middleware } from 'openapi-fetch';

let cachedToken: string | null = null;
let tokenFetchPromise: Promise<string | null> | null = null;

async function fetchAccessToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  if (tokenFetchPromise) return tokenFetchPromise;
  tokenFetchPromise = fetch('/api/auth/access-token')
    .then((res) => res.json())
    .then((data) => {
      cachedToken = data.accessToken;
      // Expire cached token after 55 seconds (tokens typically last 60s)
      setTimeout(() => {
        cachedToken = null;
        tokenFetchPromise = null;
      }, 55_000);
      return cachedToken;
    })
    .catch(() => null);
  return tokenFetchPromise;
}

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = await fetchAccessToken();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
};

export function useApiClient() {
  return useMemo(() => {
    const client = createClient<paths>({
      baseUrl: process.env.NEXT_PUBLIC_API_URL,
    });
    client.use(authMiddleware);
    return client;
  }, []);
}
```

- [ ] **Step 4: Write failing test for useApiClient**

Create `src/hooks/__tests__/use-api-client.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useApiClient } from '../use-api-client';

const server = setupServer(
  http.get('*/api/auth/access-token', () => {
    return HttpResponse.json({ accessToken: 'test-token-123' });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useApiClient', () => {
  it('returns an API client object', () => {
    const { result } = renderHook(() => useApiClient());
    expect(result.current).toBeDefined();
    expect(result.current.GET).toBeTypeOf('function');
    expect(result.current.POST).toBeTypeOf('function');
  });
});
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test -- src/hooks/__tests__/use-api-client.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/api-client.ts src/hooks/use-api-client.ts src/app/api/auth/access-token/route.ts src/hooks/__tests__/use-api-client.test.ts
git commit -m "feat: add type-safe OpenAPI client with Auth0 token middleware"
```

---

### Task 6: TanStack Query Provider + Root Layout

**Files:**
- Create: `src/app/providers.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create providers wrapper**

Create `src/app/providers.tsx`:

```typescript
'use client';

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';

// Custom error class for API errors with status codes
export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function handleGlobalError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      window.location.href = '/login';
    }
    // 403 and 404 are handled by individual page error boundaries
    // 429 is handled by TanStack Query's built-in retry with backoff
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: handleGlobalError,
        }),
        mutationCache: new MutationCache({
          onError: handleGlobalError,
        }),
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: (failureCount, error) => {
              // Retry up to 3 times for 429 (rate limited) and 5xx errors
              if (error instanceof ApiError && [403, 404].includes(error.status)) return false;
              return failureCount < 3;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  return (
    <UserProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </UserProvider>
  );
}
```

- [ ] **Step 2: Update root layout**

Update `src/app/layout.tsx`:

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Clawbrowser',
  description: 'Browser fingerprint management for AI agents',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/providers.tsx src/app/layout.tsx
git commit -m "feat: add TanStack Query + Auth0 providers in root layout"
```

---

### Task 7: TanStack Query Hooks — Customer

**Files:**
- Create: `src/hooks/use-customer.ts`
- Create: `src/hooks/__tests__/use-customer.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/hooks/__tests__/use-customer.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useCustomer } from '../use-customer';
import { createTestWrapper } from './test-utils';

const mockCustomer = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  name: 'Test User',
  status: 'active',
  created_at: '2026-03-21T00:00:00Z',
};

const server = setupServer(
  http.get('*/v1/me', () => {
    return HttpResponse.json(mockCustomer);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useCustomer', () => {
  it('fetches customer profile', async () => {
    const { result } = renderHook(() => useCustomer(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.email).toBe('test@example.com');
  });
});
```

Create `src/hooks/__tests__/test-utils.tsx`:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

export function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/hooks/__tests__/use-customer.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/hooks/use-customer.ts`:

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from './use-api-client';

export function useCustomer() {
  const client = useApiClient();
  return useQuery({
    queryKey: ['customer'],
    queryFn: async () => {
      const { data, error } = await client.GET('/v1/me');
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateCustomer() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name?: string }) => {
      const { data, error } = await client.PUT('/v1/me', { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer'] });
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/hooks/__tests__/use-customer.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-customer.ts src/hooks/__tests__/use-customer.test.ts src/hooks/__tests__/test-utils.tsx
git commit -m "feat: add customer profile TanStack Query hooks"
```

---

### Task 8: TanStack Query Hooks — API Keys

**Files:**
- Create: `src/hooks/use-api-keys.ts`
- Create: `src/hooks/__tests__/use-api-keys.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/hooks/__tests__/use-api-keys.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useApiKeys, useCreateApiKey, useRevokeApiKey, useRotateApiKey } from '../use-api-keys';
import { createTestWrapper } from './test-utils';

const mockKeys = {
  keys: [
    {
      id: 'key-1',
      name: 'Default',
      key_prefix: 'clawbrow...',
      created_at: '2026-03-21T00:00:00Z',
    },
  ],
};

const mockCreatedKey = {
  id: 'key-2',
  name: 'New Key',
  key: 'clawbrowser_live_abc123',
  key_prefix: 'clawbrow...',
  created_at: '2026-03-22T00:00:00Z',
};

const mockRotatedKey = {
  id: 'key-1',
  name: 'Default',
  key: 'clawbrowser_live_rotated456',
  key_prefix: 'clawbrow...',
  created_at: '2026-03-22T00:00:00Z',
};

const server = setupServer(
  http.get('*/v1/api-keys', () => {
    return HttpResponse.json(mockKeys);
  }),
  http.post('*/v1/api-keys', () => {
    return HttpResponse.json(mockCreatedKey, { status: 201 });
  }),
  http.delete('*/v1/api-keys/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),
  http.post('*/v1/api-keys/:id/rotate', () => {
    return HttpResponse.json(mockRotatedKey);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useApiKeys', () => {
  it('fetches API keys list', async () => {
    const { result } = renderHook(() => useApiKeys(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.keys).toHaveLength(1);
    expect(result.current.data?.keys[0].name).toBe('Default');
  });
});

describe('useCreateApiKey', () => {
  it('creates a new API key and returns it', async () => {
    const { result } = renderHook(() => useCreateApiKey(), {
      wrapper: createTestWrapper(),
    });

    const created = await result.current.mutateAsync({ name: 'New Key' });
    expect(created.key).toBe('clawbrowser_live_abc123');
    expect(created.id).toBe('key-2');
  });
});

describe('useRevokeApiKey', () => {
  it('revokes an API key (204 no content)', async () => {
    const { result } = renderHook(() => useRevokeApiKey(), {
      wrapper: createTestWrapper(),
    });

    await expect(result.current.mutateAsync('key-1')).resolves.toBeUndefined();
  });
});

describe('useRotateApiKey', () => {
  it('rotates an API key and returns new key', async () => {
    const { result } = renderHook(() => useRotateApiKey(), {
      wrapper: createTestWrapper(),
    });

    const rotated = await result.current.mutateAsync('key-1');
    expect(rotated.key).toBe('clawbrowser_live_rotated456');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/hooks/__tests__/use-api-keys.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/hooks/use-api-keys.ts`:

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from './use-api-client';

export function useApiKeys() {
  const client = useApiClient();
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data, error } = await client.GET('/v1/api-keys');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateApiKey() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string }) => {
      const { data, error } = await client.POST('/v1/api-keys', { body });
      if (error) throw error;
      return data;
    },
    // On success, invalidate to get the server-authoritative list
    // (create returns the new key with the secret — we can't optimistically predict it)
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useRevokeApiKey() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE('/v1/api-keys/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    // Optimistic update: remove key from list immediately, roll back on error
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['api-keys'] });
      const previous = queryClient.getQueryData(['api-keys']);
      queryClient.setQueryData(['api-keys'], (old: any) => ({
        ...old,
        keys: old?.keys?.filter((k: any) => k.id !== id) ?? [],
      }));
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['api-keys'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useRotateApiKey() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await client.POST('/v1/api-keys/{id}/rotate', {
        params: { path: { id } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- src/hooks/__tests__/use-api-keys.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-api-keys.ts src/hooks/__tests__/use-api-keys.test.ts
git commit -m "feat: add API key TanStack Query hooks (CRUD + rotate)"
```

---

### Task 9: TanStack Query Hooks — Usage + Billing

**Files:**
- Create: `src/hooks/use-usage.ts`
- Create: `src/hooks/use-billing.ts`
- Create: `src/hooks/__tests__/use-usage.test.ts`
- Create: `src/hooks/__tests__/use-billing.test.ts`

- [ ] **Step 1: Write failing tests for usage hooks**

Create `src/hooks/__tests__/use-usage.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useUsageStats, useUsageHistory } from '../use-usage';
import { createTestWrapper } from './test-utils';

const mockUsage = {
  fingerprint_generations: 150,
  proxy_verifications: 42,
  period_start: '2026-03-01T00:00:00Z',
  period_end: '2026-03-31T00:00:00Z',
};

const mockHistory = {
  data_points: [
    { date: '2026-03-20', fingerprint_generations: 10, proxy_verifications: 5 },
    { date: '2026-03-21', fingerprint_generations: 20, proxy_verifications: 8 },
  ],
};

const server = setupServer(
  http.get('*/v1/usage', () => {
    return HttpResponse.json(mockUsage);
  }),
  http.get('*/v1/usage/history', () => {
    return HttpResponse.json(mockHistory);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useUsageStats', () => {
  it('fetches usage stats', async () => {
    const { result } = renderHook(() => useUsageStats(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.fingerprint_generations).toBe(150);
    expect(result.current.data?.proxy_verifications).toBe(42);
  });
});

describe('useUsageHistory', () => {
  it('fetches usage history with date range', async () => {
    const { result } = renderHook(
      () => useUsageHistory('2026-03-20', '2026-03-21', 'day'),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data_points).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Write failing tests for billing hooks**

Create `src/hooks/__tests__/use-billing.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useSubscription } from '../use-billing';
import { createTestWrapper } from './test-utils';

const mockSubscription = {
  plan: 'Pro',
  status: 'active',
  usage_limit: 1000,
  usage_current: 150,
  current_period_start: '2026-03-01T00:00:00Z',
  current_period_end: '2026-03-31T00:00:00Z',
};

const server = setupServer(
  http.get('*/v1/billing/subscription', () => {
    return HttpResponse.json(mockSubscription);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useSubscription', () => {
  it('fetches subscription data', async () => {
    const { result } = renderHook(() => useSubscription(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.plan).toBe('Pro');
    expect(result.current.data?.status).toBe('active');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm test -- src/hooks/__tests__/use-usage.test.ts src/hooks/__tests__/use-billing.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 4: Write use-usage.ts**

Create `src/hooks/use-usage.ts`:

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from './use-api-client';

export function useUsageStats() {
  const client = useApiClient();
  return useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const { data, error } = await client.GET('/v1/usage');
      if (error) throw error;
      return data;
    },
  });
}

export function useUsageHistory(from: string, to: string, granularity: 'day' | 'week' | 'month' = 'day') {
  const client = useApiClient();
  return useQuery({
    queryKey: ['usage-history', from, to, granularity],
    queryFn: async () => {
      const { data, error } = await client.GET('/v1/usage/history', {
        params: { query: { from, to, granularity } },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!from && !!to,
  });
}
```

- [ ] **Step 5: Write use-billing.ts**

Create `src/hooks/use-billing.ts`:

```typescript
'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useApiClient } from './use-api-client';

export function useSubscription() {
  const client = useApiClient();
  return useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data, error } = await client.GET('/v1/billing/subscription');
      if (error) throw error;
      return data;
    },
  });
}

export function useBillingPortal() {
  const client = useApiClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await client.POST('/v1/billing/portal');
      if (error) throw error;
      return data;
    },
  });
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm test -- src/hooks/__tests__/use-usage.test.ts src/hooks/__tests__/use-billing.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/hooks/use-usage.ts src/hooks/use-billing.ts src/hooks/__tests__/use-usage.test.ts src/hooks/__tests__/use-billing.test.ts
git commit -m "feat: add usage and billing TanStack Query hooks with tests"
```

---

### Task 10: Shared Components — StatCard, CopyButton

**Files:**
- Create: `src/components/shared/stat-card.tsx`
- Create: `src/components/shared/copy-button.tsx`
- Create: `src/components/shared/__tests__/stat-card.test.tsx`

- [ ] **Step 1: Write failing test for StatCard**

Create `src/components/shared/__tests__/stat-card.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../stat-card';

describe('StatCard', () => {
  it('renders title and value', () => {
    render(<StatCard title="API Calls" value="1,234" />);
    expect(screen.getByText('API Calls')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<StatCard title="Plan" value="Pro" description="Active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/components/shared/__tests__/stat-card.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write StatCard**

Create `src/components/shared/stat-card.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  icon?: React.ReactNode;
}

export function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Write CopyButton**

Create `src/components/shared/copy-button.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface CopyButtonProps {
  value: string;
  label?: string;
}

export function CopyButton({ value, label = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? 'Copied!' : label}
    </Button>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test -- src/components/shared/__tests__/stat-card.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/stat-card.tsx src/components/shared/copy-button.tsx src/components/shared/__tests__/stat-card.test.tsx
git commit -m "feat: add StatCard and CopyButton shared components"
```

---

### Task 11: Shared Components — UsageChart, ApiKeyTable

**Files:**
- Create: `src/components/shared/usage-chart.tsx`
- Create: `src/components/shared/api-key-table.tsx`

- [ ] **Step 1: Write UsageChart**

Create `src/components/shared/usage-chart.tsx`:

```typescript
'use client';

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DataPoint {
  date: string;
  fingerprint_generations: number;
  proxy_verifications: number;
}

interface UsageChartProps {
  data: DataPoint[];
  title?: string;
}

export function UsageChart({ data, title = 'Usage Over Time' }: UsageChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="fingerprint_generations"
              stackId="1"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
              name="Fingerprints"
            />
            <Area
              type="monotone"
              dataKey="proxy_verifications"
              stackId="2"
              stroke="hsl(var(--secondary))"
              fill="hsl(var(--secondary))"
              fillOpacity={0.3}
              name="Proxy Verifications"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Write ApiKeyTable**

Create `src/components/shared/api-key-table.tsx`:

```typescript
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  revoked_at?: string;
}

interface ApiKeyTableProps {
  keys: ApiKey[];
  onRotate: (id: string) => void;
  onRevoke: (id: string) => void;
}

export function ApiKeyTable({ keys, onRotate, onRevoke }: ApiKeyTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Key</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((key) => (
          <TableRow key={key.id}>
            <TableCell className="font-medium">{key.name}</TableCell>
            <TableCell>
              <code className="text-sm">{key.key_prefix}</code>
            </TableCell>
            <TableCell>
              {new Date(key.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell>
              {key.revoked_at ? (
                <Badge variant="destructive">Revoked</Badge>
              ) : (
                <Badge variant="default">Active</Badge>
              )}
            </TableCell>
            <TableCell className="text-right space-x-2">
              {!key.revoked_at && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRotate(key.id)}
                  >
                    Rotate
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onRevoke(key.id)}
                  >
                    Revoke
                  </Button>
                </>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 3: Verify compilation**

```bash
pnpm typecheck
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/usage-chart.tsx src/components/shared/api-key-table.tsx
git commit -m "feat: add UsageChart and ApiKeyTable shared components"
```

---

### Task 12: Dashboard Layout — Sidebar + Topbar

**Files:**
- Create: `src/components/layouts/dashboard-sidebar.tsx`
- Create: `src/components/layouts/dashboard-topbar.tsx`
- Create: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Write sidebar**

Create `src/components/layouts/dashboard-sidebar.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { isFeatureEnabled } from '@/lib/features';
import { cn } from '@/lib/utils';

const primaryNav = [
  { href: '/dashboard', label: 'Overview', icon: '◎' },
  { href: '/api-keys', label: 'API Keys', icon: '⌘' },
  { href: '/usage', label: 'Usage', icon: '▤' },
  { href: '/billing', label: 'Billing', icon: '◈' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

// Latest changelog version — bump when adding new changelog entries.
// Compared against localStorage to show "What's New" badge.
const LATEST_CHANGELOG_VERSION = '2026-03-01';

const secondaryNav = [
  { href: '/docs', label: 'Docs', icon: '▧', flag: 'docs' as const },
  { href: '/changelog', label: 'Changelog', icon: '▦', flag: 'changelog' as const, badge: true },
  { href: '/support', label: 'Support', icon: '?', flag: 'support' as const },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) setCollapsed(saved === 'true');
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  // "What's New" badge: show when latest changelog is newer than last-seen
  const [hasNewChangelog, setHasNewChangelog] = useState(false);
  useEffect(() => {
    const lastSeen = localStorage.getItem('changelog-last-seen');
    if (!lastSeen || lastSeen < LATEST_CHANGELOG_VERSION) {
      setHasNewChangelog(true);
    }
  }, []);

  const handleChangelogClick = () => {
    localStorage.setItem('changelog-last-seen', LATEST_CHANGELOG_VERSION);
    setHasNewChangelog(false);
  };

  const enabledSecondaryNav = secondaryNav.filter((item) =>
    isFeatureEnabled(item.flag)
  );

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-background h-screen transition-all',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between p-4">
        {!collapsed && (
          <Link href="/dashboard" className="text-lg font-bold">
            Clawbrowser
          </Link>
        )}
        <Button variant="ghost" size="sm" onClick={toggleCollapse}>
          {collapsed ? '→' : '←'}
        </Button>
      </div>

      <nav className="flex-1 px-2 space-y-1">
        {primaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              pathname === item.href
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50'
            )}
          >
            <span className="w-5 text-center">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}

        {enabledSecondaryNav.length > 0 && (
          <>
            <Separator className="my-2" />
            {enabledSecondaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={item.badge ? handleChangelogClick : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  pathname === item.href
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                )}
              >
                <span className="w-5 text-center">{item.icon}</span>
                {!collapsed && (
                  <span className="flex items-center gap-2">
                    {item.label}
                    {item.badge && hasNewChangelog && (
                      <span className="inline-flex h-5 items-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                        New
                      </span>
                    )}
                  </span>
                )}
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Write topbar**

Create `src/components/layouts/dashboard-topbar.tsx`:

```typescript
'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function DashboardTopbar() {
  const { user } = useUser();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?';

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <div />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm hidden md:inline">{user?.name}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href="/settings">Profile</a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="/api/auth/logout">Logout</a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
```

- [ ] **Step 3: Write dashboard layout**

Create `src/app/(dashboard)/layout.tsx`:

```typescript
import { DashboardSidebar } from '@/components/layouts/dashboard-sidebar';
import { DashboardTopbar } from '@/components/layouts/dashboard-topbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopbar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create loading and error boundaries**

Create `src/app/(dashboard)/loading.tsx`:

```typescript
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
```

Create `src/app/(dashboard)/error.tsx`:

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { ApiError } from '@/app/providers';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  // Per spec: differentiated UI for 403/404/generic errors
  if (error instanceof ApiError && error.status === 403) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">You don&apos;t have permission to access this resource.</p>
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <h2 className="text-xl font-semibold">Not Found</h2>
        <p className="text-muted-foreground">The requested resource was not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/layouts/ src/app/\(dashboard\)/layout.tsx src/app/\(dashboard\)/loading.tsx src/app/\(dashboard\)/error.tsx
git commit -m "feat: add dashboard layout with collapsible sidebar and topbar"
```

---

### Task 13: Auth Pages (Login, Signup, Callback)

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/signup/page.tsx`
- Create: `src/app/(auth)/callback/page.tsx`

- [ ] **Step 1: Create login page**

Create `src/app/(auth)/login/page.tsx`:

```typescript
import { redirect } from 'next/navigation';

export default function LoginPage() {
  redirect('/api/auth/login');
}
```

- [ ] **Step 2: Create signup page**

Create `src/app/(auth)/signup/page.tsx`:

```typescript
import { redirect } from 'next/navigation';

export default function SignupPage() {
  redirect('/api/auth/login?screen_hint=signup');
}
```

- [ ] **Step 3: Create callback page with first-login detection**

Create `src/app/(auth)/callback/page.tsx`:

Per the spec's auth flow: after Auth0 callback, check if this is the user's first login. If yes and the onboarding feature flag is enabled, redirect to `/onboarding`. Otherwise redirect to `/dashboard`.

```typescript
import { redirect } from 'next/navigation';
import { getSession } from '@auth0/nextjs-auth0';
import { isFeatureEnabled } from '@/lib/features';

export default async function CallbackPage() {
  // Auth0 SDK handles the callback exchange via /api/auth/callback
  // This page runs after the session is established
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Check if first login: Auth0 returns logins_count in app_metadata
  // or we can check if the user has no customer record via the API.
  // The simplest approach: check Auth0 user metadata for logins_count.
  const loginsCount = session.user?.['https://clawbrowser.ai/logins_count'] ?? 1;
  const isFirstLogin = loginsCount <= 1;

  if (isFirstLogin && isFeatureEnabled('onboarding')) {
    redirect('/onboarding');
  }

  redirect('/dashboard');
}
```

**Note:** The `logins_count` claim must be added to the Auth0 access token via an Auth0 Action (Login flow). The Action should add `event.stats.logins_count` as a custom claim at `https://clawbrowser.ai/logins_count`. This is an Auth0 configuration step, not application code.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(auth\)/
git commit -m "feat: add auth pages for login, signup, and callback"
```

---

### Task 14: Dashboard Overview Page

**Files:**
- Create: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Write overview page**

Create `src/app/(dashboard)/dashboard/page.tsx`:

```typescript
'use client';

import { useMemo } from 'react';
import { StatCard } from '@/components/shared/stat-card';
import { UsageChart } from '@/components/shared/usage-chart';
import { QuickstartSnippets } from '@/components/shared/quickstart-snippets';
import { useUsageStats, useUsageHistory } from '@/hooks/use-usage';
import { useApiKeys } from '@/hooks/use-api-keys';
import { useSubscription } from '@/hooks/use-billing';
import { isFeatureEnabled } from '@/lib/features';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardOverview() {
  const { data: usage, isLoading: usageLoading } = useUsageStats();
  const { data: keys, isLoading: keysLoading } = useApiKeys();
  const { data: subscription, isLoading: subLoading } = useSubscription();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const from = sevenDaysAgo.toISOString().split('T')[0];
  const to = now.toISOString().split('T')[0];

  const { data: history, isLoading: historyLoading } = useUsageHistory(from, to, 'day');

  const activeKeys = useMemo(
    () => keys?.keys?.filter((k) => !k.revoked_at).length ?? 0,
    [keys]
  );

  const isLoading = usageLoading || keysLoading || subLoading;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>

      <div className="grid gap-4 md:grid-cols-3">
        {isLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <StatCard
              title="API Calls Today"
              value={String(usage?.fingerprint_generations ?? 0)}
              description="Fingerprint generations"
            />
            <StatCard
              title="Active API Keys"
              value={String(activeKeys)}
            />
            <StatCard
              title="Plan"
              value={subscription?.plan ?? 'Free'}
              description={subscription?.status ?? ''}
            />
          </>
        )}
      </div>

      {historyLoading ? (
        <Skeleton className="h-80" />
      ) : (
        <UsageChart data={history?.data_points ?? []} title="Last 7 Days" />
      )}

      {isFeatureEnabled('quickstart_snippets') && (
        <QuickstartSnippets
          apiKey={keys?.keys?.find((k) => !k.revoked_at)?.key_prefix}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

```bash
pnpm typecheck
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat: add dashboard overview page with stats and usage chart"
```

---

### Task 15: API Keys Page

**Files:**
- Create: `src/app/(dashboard)/api-keys/page.tsx`

- [ ] **Step 1: Write API keys page**

Create `src/app/(dashboard)/api-keys/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { ApiKeyTable } from '@/components/shared/api-key-table';
import { CopyButton } from '@/components/shared/copy-button';
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  useRotateApiKey,
} from '@/hooks/use-api-keys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function ApiKeysPage() {
  const { data, isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const rotateKey = useRotateApiKey();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

  const [confirmAction, setConfirmAction] = useState<{
    type: 'revoke' | 'rotate';
    id: string;
  } | null>(null);

  const handleCreate = async () => {
    try {
      const result = await createKey.mutateAsync({ name: newKeyName });
      setNewKeyValue(result.key);
      setNewKeyName('');
      toast({ title: 'API key created' });
    } catch {
      toast({ title: 'Failed to create key', variant: 'destructive' });
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeKey.mutateAsync(id);
      setConfirmAction(null);
      toast({ title: 'API key revoked' });
    } catch {
      toast({ title: 'Failed to revoke key', variant: 'destructive' });
    }
  };

  const handleRotate = async (id: string) => {
    try {
      const result = await rotateKey.mutateAsync(id);
      setConfirmAction(null);
      setNewKeyValue(result.key);
      toast({ title: 'API key rotated' });
    } catch {
      toast({ title: 'Failed to rotate key', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <Dialog open={createOpen} onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setNewKeyValue(null);
        }}>
          <DialogTrigger asChild>
            <Button>Create API Key</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {newKeyValue ? 'API Key Created' : 'Create API Key'}
              </DialogTitle>
              <DialogDescription>
                {newKeyValue
                  ? 'Copy your key now. It will not be shown again.'
                  : 'Enter a name for your new API key.'}
              </DialogDescription>
            </DialogHeader>
            {newKeyValue ? (
              <div className="flex items-center gap-2 p-4 bg-muted rounded-md">
                <code className="text-sm flex-1 break-all">{newKeyValue}</code>
                <CopyButton value={newKeyValue} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="key-name">Name</Label>
                  <Input
                    id="key-name"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreate} disabled={!newKeyName || createKey.isPending}>
                    {createKey.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <ApiKeyTable
          keys={data?.keys ?? []}
          onRotate={(id) => setConfirmAction({ type: 'rotate', id })}
          onRevoke={(id) => setConfirmAction({ type: 'revoke', id })}
        />
      )}

      {/* Confirm dialog for revoke/rotate */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === 'revoke' ? 'Revoke API Key' : 'Rotate API Key'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === 'revoke'
                ? 'This will permanently disable this API key. Any clients using it will stop working.'
                : 'This will revoke the current key and generate a new one. Any clients using the old key will stop working.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmAction?.type === 'revoke' ? 'destructive' : 'default'}
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.type === 'revoke') handleRevoke(confirmAction.id);
                else handleRotate(confirmAction.id);
              }}
            >
              {confirmAction?.type === 'revoke' ? 'Revoke' : 'Rotate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/api-keys/page.tsx
git commit -m "feat: add API keys page with create, rotate, and revoke flows"
```

---

### Task 16: Usage Page

**Files:**
- Create: `src/app/(dashboard)/usage/page.tsx`

- [ ] **Step 1: Write usage page**

Create `src/app/(dashboard)/usage/page.tsx`:

```typescript
'use client';

import { useState, useMemo } from 'react';
import { StatCard } from '@/components/shared/stat-card';
import { UsageChart } from '@/components/shared/usage-chart';
import { useUsageStats, useUsageHistory } from '@/hooks/use-usage';
import { useSubscription } from '@/hooks/use-billing';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

type Range = '7d' | '30d' | '90d';

function getDateRange(range: Range) {
  const now = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
    granularity: (range === '90d' ? 'week' : 'day') as 'day' | 'week',
  };
}

export default function UsagePage() {
  const [range, setRange] = useState<Range>('7d');
  const { from, to, granularity } = useMemo(() => getDateRange(range), [range]);

  const { data: usage, isLoading: usageLoading } = useUsageStats();
  const { data: history, isLoading: historyLoading } = useUsageHistory(from, to, granularity);
  const { data: subscription } = useSubscription();

  const quotaRemaining = useMemo(() => {
    if (!subscription?.usage_limit || !subscription?.usage_current) return null;
    return subscription.usage_limit - subscription.usage_current;
  }, [subscription]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usage</h1>
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList>
            <TabsTrigger value="7d">7 days</TabsTrigger>
            <TabsTrigger value="30d">30 days</TabsTrigger>
            <TabsTrigger value="90d">90 days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {usageLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <StatCard
              title="Fingerprints Generated"
              value={String(usage?.fingerprint_generations ?? 0)}
              description="Current period"
            />
            <StatCard
              title="Proxy Verifications"
              value={String(usage?.proxy_verifications ?? 0)}
              description="Current period"
            />
            {quotaRemaining !== null && (
              <StatCard
                title="Quota Remaining"
                value={String(quotaRemaining)}
                description={`of ${subscription?.usage_limit} limit`}
              />
            )}
          </>
        )}
      </div>

      {historyLoading ? (
        <Skeleton className="h-80" />
      ) : (
        <UsageChart data={history?.data_points ?? []} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/usage/page.tsx
git commit -m "feat: add usage page with time range selector and area chart"
```

---

### Task 17: Billing Page

**Files:**
- Create: `src/app/(dashboard)/billing/page.tsx`

- [ ] **Step 1: Write billing page**

Create `src/app/(dashboard)/billing/page.tsx`:

```typescript
'use client';

import { StatCard } from '@/components/shared/stat-card';
import { useSubscription, useBillingPortal } from '@/hooks/use-billing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function BillingPage() {
  const { data: subscription, isLoading } = useSubscription();
  const billingPortal = useBillingPortal();

  const handleManage = async () => {
    const result = await billingPortal.mutateAsync();
    if (result.url) {
      window.location.href = result.url;
    }
  };

  const statusColor = {
    active: 'default' as const,
    past_due: 'destructive' as const,
    cancelled: 'secondary' as const,
    trialing: 'outline' as const,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Billing</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {subscription?.plan ?? 'Free'}
            <Badge variant={statusColor[subscription?.status ?? 'active']}>
              {subscription?.status ?? 'active'}
            </Badge>
          </CardTitle>
          <CardDescription>
            {subscription?.current_period_end &&
              `Current period ends ${new Date(subscription.current_period_end).toLocaleDateString()}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription?.usage_limit && (
            <div className="grid gap-4 md:grid-cols-2">
              <StatCard
                title="Usage"
                value={`${subscription.usage_current ?? 0} / ${subscription.usage_limit}`}
                description="Fingerprint generations this period"
              />
            </div>
          )}

          <Button onClick={handleManage} disabled={billingPortal.isPending}>
            {billingPortal.isPending ? 'Loading...' : 'Manage Subscription'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/billing/page.tsx
git commit -m "feat: add billing page with subscription display and portal redirect"
```

---

### Task 18: Settings Page

**Files:**
- Create: `src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Write settings page**

Create `src/app/(dashboard)/settings/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useCustomer, useUpdateCustomer } from '@/hooks/use-customer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
  const { data: customer, isLoading } = useCustomer();
  const updateCustomer = useUpdateCustomer();
  const { toast } = useToast();
  const [name, setName] = useState('');

  useEffect(() => {
    if (customer?.name) setName(customer.name);
  }, [customer?.name]);

  const handleSave = async () => {
    try {
      await updateCustomer.mutateAsync({ name });
      toast({ title: 'Profile updated' });
    } catch {
      toast({ title: 'Failed to update profile', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={customer?.email ?? ''} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button onClick={handleSave} disabled={updateCustomer.isPending}>
            {updateCustomer.isPending ? 'Saving...' : 'Save'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/settings/page.tsx
git commit -m "feat: add settings page with profile editing"
```

---

### Task 19: Feature-Flagged Pages — Onboarding + Support

**Files:**
- Create: `src/app/(dashboard)/onboarding/page.tsx`
- Create: `src/app/(dashboard)/support/page.tsx`
- Create: `src/components/shared/quickstart-snippets.tsx`

- [ ] **Step 1: Write quickstart snippets component**

Create `src/components/shared/quickstart-snippets.tsx`:

```typescript
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyButton } from './copy-button';

interface QuickstartSnippetsProps {
  apiKey?: string;
}

export function QuickstartSnippets({ apiKey = 'YOUR_API_KEY' }: QuickstartSnippetsProps) {
  const playwrightPython = `import subprocess, asyncio
from playwright.async_api import async_playwright

# Launch clawbrowser with a fingerprint
proc = subprocess.Popen([
    "clawbrowser",
    "--fingerprint=my_profile",
    "--new",
    "--remote-debugging-port=9222"
], env={"CLAWBROWSER_API_KEY": "${apiKey}"})

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222")
        page = await browser.new_page()
        await page.goto("https://example.com")

asyncio.run(main())`;

  const playwrightNode = `const { chromium } = require('playwright');
const { execSync } = require('child_process');

// Launch clawbrowser with a fingerprint
execSync('CLAWBROWSER_API_KEY=${apiKey} clawbrowser --fingerprint=my_profile --new --remote-debugging-port=9222 &');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = await browser.newPage();
  await page.goto('https://example.com');
})();`;

  const puppeteer = `const puppeteer = require('puppeteer');
const { execSync } = require('child_process');

// Launch clawbrowser with a fingerprint
execSync('CLAWBROWSER_API_KEY=${apiKey} clawbrowser --fingerprint=my_profile --new --remote-debugging-port=9222 &');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = await browser.newPage();
  await page.goto('https://example.com');
})();`;

  return (
    <Tabs defaultValue="playwright-python">
      <TabsList>
        <TabsTrigger value="playwright-python">Playwright (Python)</TabsTrigger>
        <TabsTrigger value="playwright-node">Playwright (Node.js)</TabsTrigger>
        <TabsTrigger value="puppeteer">Puppeteer</TabsTrigger>
      </TabsList>
      <TabsContent value="playwright-python">
        <div className="relative">
          <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm">
            <code>{playwrightPython}</code>
          </pre>
          <div className="absolute top-2 right-2">
            <CopyButton value={playwrightPython} />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="playwright-node">
        <div className="relative">
          <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm">
            <code>{playwrightNode}</code>
          </pre>
          <div className="absolute top-2 right-2">
            <CopyButton value={playwrightNode} />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="puppeteer">
        <div className="relative">
          <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm">
            <code>{puppeteer}</code>
          </pre>
          <div className="absolute top-2 right-2">
            <CopyButton value={puppeteer} />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 2: Write onboarding page**

Create `src/app/(dashboard)/onboarding/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { isFeatureEnabled } from '@/lib/features';
import { useApiKeys } from '@/hooks/use-api-keys';
import { QuickstartSnippets } from '@/components/shared/quickstart-snippets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/shared/copy-button';

const STEPS = ['copy-key', 'install-cli', 'first-launch'] as const;

export default function OnboardingPage() {
  // All hooks must be called before any conditional returns (React rules of hooks)
  const { data: keys } = useApiKeys();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('onboarding-step');
    if (saved) setCurrentStep(Number(saved));
  }, []);

  if (!isFeatureEnabled('onboarding')) return notFound();

  const goNext = () => {
    const next = Math.min(currentStep + 1, STEPS.length - 1);
    setCurrentStep(next);
    localStorage.setItem('onboarding-step', String(next));
  };

  const firstKey = keys?.keys?.find((k) => !k.revoked_at);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Get Started</h1>

      <div className="flex gap-2 mb-4">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className={`h-2 flex-1 rounded ${
              i <= currentStep ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>1. Copy Your API Key</CardTitle>
            <CardDescription>
              You&apos;ll need this to authenticate clawbrowser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {firstKey ? (
              <div className="flex items-center gap-2 p-4 bg-muted rounded-md">
                <code className="text-sm">{firstKey.key_prefix}</code>
                <CopyButton value={firstKey.key_prefix} label="Copy prefix" />
              </div>
            ) : (
              <p className="text-muted-foreground">
                No API keys found. Create one from the API Keys page.
              </p>
            )}
            <Button onClick={goNext}>Next</Button>
          </CardContent>
        </Card>
      )}

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Install Clawbrowser</CardTitle>
            <CardDescription>Download the clawbrowser binary.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="p-4 bg-muted rounded-md text-sm">
              <code>curl -sSL https://clawbrowser.ai/install | sh</code>
            </pre>
            <Button onClick={goNext}>Next</Button>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>3. Launch Your First Profile</CardTitle>
            <CardDescription>
              Use the code snippets below to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <QuickstartSnippets apiKey={firstKey?.key_prefix} />
            <Button asChild>
              <a href="/dashboard">Go to Dashboard</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write support page**

Create `src/app/(dashboard)/support/page.tsx`:

```typescript
'use client';

import { notFound } from 'next/navigation';
import { isFeatureEnabled } from '@/lib/features';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SupportPage() {
  if (!isFeatureEnabled('support')) return notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Support</h1>

      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            We&apos;re here to help you get the most out of Clawbrowser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Email us at{' '}
            <a href="mailto:support@clawbrowser.ai" className="underline">
              support@clawbrowser.ai
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/quickstart-snippets.tsx src/app/\(dashboard\)/onboarding/page.tsx src/app/\(dashboard\)/support/page.tsx
git commit -m "feat: add feature-flagged onboarding wizard and support page"
```

---

### Task 20: Public Layout + Landing Page

**Files:**
- Create: `src/components/layouts/public-nav.tsx`
- Create: `src/app/(public)/layout.tsx`
- Create: `src/app/(public)/page.tsx`

- [ ] **Step 1: Write public nav**

Create `src/components/layouts/public-nav.tsx`:

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function PublicNav() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b">
      <Link href="/" className="text-xl font-bold">
        Clawbrowser
      </Link>
      <div className="flex items-center gap-4">
        <Link href="/docs" className="text-sm hover:underline">
          Docs
        </Link>
        <Button variant="ghost" asChild>
          <Link href="/login">Log In</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">Sign Up</Link>
        </Button>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Write public layout**

Create `src/app/(public)/layout.tsx`:

```typescript
import { PublicNav } from '@/components/layouts/public-nav';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <footer className="border-t px-6 py-4 text-sm text-muted-foreground text-center">
        &copy; {new Date().getFullYear()} Clawbrowser. All rights reserved.
      </footer>
    </div>
  );
}
```

- [ ] **Step 3: Write landing page**

Create `src/app/(public)/page.tsx`:

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center space-y-8">
      <h1 className="text-5xl font-bold tracking-tight max-w-3xl">
        Browser Fingerprint Management for AI Agents
      </h1>
      <p className="text-xl text-muted-foreground max-w-2xl">
        Reduce captcha triggers and anti-bot detection with managed fingerprint
        identities and transparent proxy routing. Built for automation.
      </p>
      <div className="flex gap-4">
        <Button size="lg" asChild>
          <Link href="/signup">Get Started</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/docs">Documentation</Link>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layouts/public-nav.tsx src/app/\(public\)/layout.tsx src/app/\(public\)/page.tsx
git commit -m "feat: add public layout, navigation, and landing page"
```

---

### Task 21: Feature-Flagged Pages — Docs + Changelog

**Files:**
- Create: `src/app/(public)/docs/[[...slug]]/page.tsx`
- Create: `src/app/(public)/changelog/page.tsx`
- Create: `src/content/docs/getting-started.mdx`

- [ ] **Step 1: Write docs catch-all page**

Create `src/app/(public)/docs/[[...slug]]/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import { isFeatureEnabled } from '@/lib/features';
import { getSession } from '@auth0/nextjs-auth0';
import { MDXRemote } from 'next-mdx-remote/rsc';
import fs from 'fs';
import path from 'path';

interface DocsPageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function DocsPage({ params }: DocsPageProps) {
  if (!isFeatureEnabled('docs')) return notFound();

  const { slug } = await params;
  const docPath = slug?.join('/') || 'getting-started';
  const filePath = path.join(process.cwd(), 'src/content/docs', `${docPath}.mdx`);

  if (!fs.existsSync(filePath)) return notFound();

  const source = fs.readFileSync(filePath, 'utf-8');

  // Per spec: authenticated users see their API key pre-filled in code snippets.
  // Fetch user's first active API key if logged in, otherwise use placeholder.
  let apiKeyPlaceholder = 'your_key_here';
  try {
    const session = await getSession();
    if (session) {
      // Import the API fetch utility server-side to get user's key prefix
      // This is a best-effort personalization — if it fails, use placeholder
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/api-keys`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const activeKey = data.keys?.find((k: any) => !k.revoked_at);
        if (activeKey?.key_prefix) {
          apiKeyPlaceholder = `${activeKey.key_prefix}...`;
        }
      }
    }
  } catch {
    // Best-effort — use default placeholder
  }

  // Replace placeholder in MDX source before rendering
  const personalizedSource = source.replace(/your_key_here/g, apiKeyPlaceholder);

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <MDXRemote source={personalizedSource} />
      </article>
    </div>
  );
}
```

**Note:** The docs page imports `getSession` from `@auth0/nextjs-auth0` for server-side API key lookup. This is optional — unauthenticated visitors see `your_key_here` as the placeholder. Flexsearch-based client-side search (`src/lib/search.ts`) is deferred to post-MVP.

- [ ] **Step 2: Create initial docs content**

Create `src/content/docs/getting-started.mdx`:

```markdown
# Getting Started with Clawbrowser

## Installation

Download and install clawbrowser:

\`\`\`bash
curl -sSL https://clawbrowser.ai/install | sh
\`\`\`

## Authentication

Set your API key:

\`\`\`bash
export CLAWBROWSER_API_KEY=your_key_here
\`\`\`

## Launch Your First Profile

\`\`\`bash
clawbrowser --fingerprint=my_first_profile --new
\`\`\`

This creates a new fingerprint profile and launches the browser with it.

## Connect with Playwright

\`\`\`python
from playwright.async_api import async_playwright

async with async_playwright() as p:
    browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222")
    page = await browser.new_page()
    await page.goto("https://example.com")
\`\`\`
```

- [ ] **Step 3: Write changelog page**

Create `src/app/(public)/changelog/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import { isFeatureEnabled } from '@/lib/features';

export default function ChangelogPage() {
  if (!isFeatureEnabled('changelog')) return notFound();

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-bold mb-8">Changelog</h1>

      <article className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold">v1.0.0 — March 2026</h2>
          <p className="text-muted-foreground mt-1">Initial release</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Browser fingerprint management</li>
            <li>API key management dashboard</li>
            <li>Usage monitoring and billing</li>
            <li>Proxy integration with Nodemaven</li>
          </ul>
        </section>
      </article>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(public\)/docs/ src/app/\(public\)/changelog/ src/content/
git commit -m "feat: add feature-flagged docs and changelog pages"
```

---

### Task 22: Dockerfile

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Create Dockerfile**

Create `Dockerfile`:

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

- [ ] **Step 2: Commit**

```bash
git add Dockerfile
git commit -m "feat: add multi-stage Dockerfile for production deployment"
```

---

### Task 23: Final Integration — Build + Typecheck + Tests

- [ ] **Step 1: Run type check**

```bash
pnpm typecheck
```

Expected: No type errors.

- [ ] **Step 2: Run tests**

```bash
pnpm test
```

Expected: All tests PASS.

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: No lint errors.

- [ ] **Step 4: Build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit any fixes**

If any issues found and fixed:

```bash
git add -A
git commit -m "fix: resolve build and lint issues"
```

---

### Task 24: CI/CD Workflow

Per the devops spec: each app repo has a `ci.yaml` that runs tests, builds Docker image, pushes to Docker Hub, and fires `repository_dispatch` to `clawbrowser-infra`.

**Files:**
- Create: `.github/workflows/ci.yaml`

- [ ] **Step 1: Create CI/CD workflow**

Create `.github/workflows/ci.yaml`:

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  id-token: write  # For OIDC federation with AWS (if needed)

env:
  IMAGE_NAME: clawbrowser-dashboard

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: latest

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm generate-types
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test

  build-and-push:
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    outputs:
      image_tag: ${{ steps.tag.outputs.tag }}
    steps:
      - uses: actions/checkout@v4

      - name: Generate image tag
        id: tag
        run: |
          # Format: v{semver}-{build_number}-{short_sha}
          VERSION=$(cat package.json | jq -r .version)
          SHORT_SHA=$(git rev-parse --short HEAD)
          TAG="v${VERSION}-${GITHUB_RUN_NUMBER}-${SHORT_SHA}"
          echo "tag=${TAG}" >> "$GITHUB_OUTPUT"

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/${{ env.IMAGE_NAME }}:${{ steps.tag.outputs.tag }}
            ${{ secrets.DOCKERHUB_USERNAME }}/${{ env.IMAGE_NAME }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Trigger deploy to QA
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.INFRA_REPO_GITHUB_APP_TOKEN }}
          repository: PGoski/clawbrowser-infra
          event-type: deploy-dashboard
          client-payload: '{"image_tag": "${{ needs.build-and-push.outputs.image_tag }}"}'
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yaml
git commit -m "feat: add CI/CD workflow for test, build, push, and deploy"
```

---

### Deferred Concerns

- **Client-side error reporting:** Dashboard JavaScript errors are currently invisible to the observability stack. Consider adding a lightweight error reporting solution (e.g., Sentry, or a custom `window.onerror` handler that posts to the backend) in a follow-up. The error boundary (Task 12) catches React errors but does not report them externally.
- **Flexsearch docs search:** Deferred to post-MVP, gated behind the `docs` feature flag.
- **Separate liveness/readiness probes:** Currently `GET /` serves both. A custom `/api/health` endpoint with Auth0 connectivity check could improve readiness semantics.
