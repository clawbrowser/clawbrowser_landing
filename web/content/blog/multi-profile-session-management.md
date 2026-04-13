---
title: "Multi-Profile Session Management for AI Agents"
excerpt: "Running agents that need to act as different users, across different accounts, without sessions bleeding into each other."
date: "2025-02-24"
author: "Clawbrowser Team"
tags: ["sessions", "profiles", "how-to"]
---

Most agent tasks aren't single-session. You're monitoring competitor pricing across 50 accounts. You're running QA tests as different user roles. You're scraping data while authenticated as multiple personas.

Managing this without session bleed is harder than it looks.

## What session bleed looks like

Session bleed is when state from one browser context leaks into another. Common symptoms:

- Agent authenticated as User A suddenly sees User B's dashboard
- Cookies from a previous run affect a fresh session
- Cache artifacts cause stale data to be returned
- IP association links supposedly separate identities

In a Playwright setup where you're reusing browser contexts carelessly, this happens constantly.

## Profiles in Clawbrowser

Clawbrowser uses **profiles** — named, persistent bundles of session state:

```bash
# Create isolated profiles
claw profile create --name account-alice
claw profile create --name account-bob
claw profile create --name account-charlie
```

Each profile stores:
- Cookies and localStorage
- Browser fingerprint
- Proxy assignment
- Authentication state

Profiles are fully isolated. Alice's cookies never touch Bob's context.

## Authenticating a profile once, reusing it forever

The expensive part of many agent tasks is authentication — solving CAPTCHAs, handling MFA, waiting for redirects. Do it once, save the profile:

```bash
# Authenticate interactively (one time)
claw profile auth --name account-alice --url https://app.example.com/login

# From now on, use the authenticated profile in scripts
claw navigate https://app.example.com/dashboard --profile account-alice
# Already logged in — skips auth entirely
```

The session is persisted. Next time your agent runs, it picks up exactly where it left off.

## Running parallel tasks across profiles

```bash
# Run concurrent tasks on separate profiles
claw extract "account balance" \
  --url https://app.example.com/dashboard \
  --profile account-alice &

claw extract "account balance" \
  --url https://app.example.com/dashboard \
  --profile account-bob &

wait
```

No interference. Each command runs in its own isolated browser context with its own fingerprint and cookies.

## Profile rotation

For tasks where you want to distribute load across accounts, use profile rotation:

```bash
claw navigate https://target.com/data \
  --profile-pool "account-alice,account-bob,account-charlie" \
  --rotate round-robin
```

Clawbrowser cycles through the pool, distributing requests evenly.

## Cleaning up

Profiles persist between runs by default. When you're done with a task:

```bash
# Clear session state but keep the profile config
claw profile clear --name account-alice

# Delete profile entirely
claw profile delete --name account-alice

# List all profiles and their state
claw profile list
```

| Command | What it does |
|---------|-------------|
| `profile create` | New empty profile |
| `profile auth` | Interactive auth, saves session |
| `profile clear` | Wipe cookies/storage, keep fingerprint |
| `profile delete` | Remove profile entirely |
| `profile list` | Show all profiles + last used |

## The pattern that works

1. Create profiles for each identity your agent needs
2. Authenticate each profile once, manually or via script
3. Run all subsequent agent tasks against saved profiles
4. Rotate or clear profiles as needed

Authentication cost: paid once. Agent runs: instant.
