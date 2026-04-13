---
title: "10 Clawbrowser CLI Tips You're Probably Not Using"
excerpt: "The features that make the difference between a one-off script and a robust agent pipeline. Most users discover them six months in."
date: "2025-06-18"
author: "Clawbrowser Team"
tags: ["cli", "tips", "how-to"]
---

The Clawbrowser CLI has a short learning curve for basic use. The depth reveals itself over time. Here are ten features worth knowing now.

## 1. Chain commands with pipes

Extract from multiple pages and pipe results together:

```bash
claw extract "product name and price" \
  --url https://shop.example.com/category/keyboards \
  --array --json | \
  jq '[.[] | select(.price < 100)]'
```

Extract → filter with `jq` → feed to next step. Standard Unix pipelines work.

## 2. Use --dry-run to preview actions

Before running a destructive or expensive command, preview what Clawbrowser will do:

```bash
claw batch extract "product details" \
  --urls products.txt \
  --dry-run
```

Output:
```
DRY RUN — no requests will be made
URLs to process: 247
Estimated time at 30/min: ~8 minutes
Rate limit: 30/minute
Profile: default
```

No requests made. Just the plan.

## 3. --verbose for debugging

When extraction isn't working as expected, `--verbose` shows the full execution trace:

```bash
claw extract "price" \
  --url https://shop.example.com/product/123 \
  --verbose
```

```
[1] Launching browser context (profile: default)
[2] Navigating to https://shop.example.com/product/123
[3] Waiting for DOM stability...
[4] DOM stable after 1240ms (47 mutations settled)
[5] Running extraction: "price"
[6] Candidate elements found: 3
[7] Best match: .product-price (confidence: 0.94)
[8] Extracted value: "$89.99"
```

See exactly what Clawbrowser did and why.

## 4. Named output formats

Control output format for different pipeline needs:

```bash
# JSON (default structured)
claw extract "product details" --url ... --json

# CSV (for spreadsheets)
claw extract "name, price, rating" --url ... --csv

# TSV (for some data pipelines)
claw extract "name, price, rating" --url ... --tsv

# Plain text (for LLM input)
claw extract "main article content" --url ... --text
```

## 5. Screenshot on failure

When an extraction fails, a screenshot tells you why:

```bash
claw extract "price" \
  --url https://shop.example.com/product/123 \
  --screenshot-on-failure ./debug/
```

If extraction fails, `./debug/failure-1234.png` shows you exactly what the browser saw — CAPTCHA, login wall, error page.

## 6. Profile cloning

Create a new profile pre-populated from an existing one:

```bash
# Alice and Bob need similar fingerprints but separate sessions
claw profile clone --from base-profile --to alice
claw profile clone --from base-profile --to bob

# Now they share fingerprint config but have isolated cookies/storage
```

## 7. Batch processing with concurrency control

```bash
claw batch extract "product name and price" \
  --urls products.txt \
  --json \
  --concurrency 5 \     # 5 parallel browser contexts
  --rate-limit 30/min \ # total across all contexts
  --output results.json
```

Concurrency and rate limiting are independent. 5 parallel contexts hitting 30 requests/minute total — Clawbrowser distributes the capacity.

## 8. Wait for specific content

Instead of timeouts, wait for meaningful signals:

```bash
# Wait for specific text to appear
claw navigate https://app.example.com/dashboard \
  --wait-for-text "Welcome back"

# Wait for a specific element
claw navigate https://app.example.com/dashboard \
  --wait-for "account balance widget"

# Wait for network to go quiet
claw navigate https://app.example.com/dashboard \
  --wait-for-idle 500ms
```

Each targets a different readiness signal. Use what fits the page.

## 9. Environment variables for secrets

Don't put credentials in scripts:

```bash
# Set once in your environment
export CLAW_PROXY_URL="http://user:pass@proxy.provider.com:8080"
export CLAW_DEFAULT_PROFILE="production"

# CLI picks them up automatically
claw navigate https://target.com
# Uses $CLAW_DEFAULT_PROFILE and $CLAW_PROXY_URL
```

Full list of env vars: `claw env --list`

## 10. Config files for shared pipeline settings

For repeatable pipelines, put shared settings in `.clawrc`:

```yaml
# .clawrc
default_profile: production
rate_limit: 30/minute
delay_jitter: 25%
screenshot_on_failure: ./debug/
output_format: json
timeout: 30s
```

All commands in the directory pick up these defaults. No flags needed for common settings.

---

These ten features don't change what Clawbrowser can do — they change how much effort it takes to do it at scale. Worth five minutes to set up, saves hours over a production pipeline's lifetime.

Full CLI reference: `claw --help` or the [docs](/docs).
