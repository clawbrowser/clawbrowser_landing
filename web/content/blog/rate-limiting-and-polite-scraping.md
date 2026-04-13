---
title: "Rate Limiting and Polite Scraping: Don't Burn Your Access"
excerpt: "Scraping too fast gets you blocked. Too slow wastes time. Here's how to find the right pace and keep access long-term."
date: "2025-06-03"
author: "Clawbrowser Team"
tags: ["scraping", "rate-limiting", "best-practices"]
---

The fastest scraper isn't the best scraper. The one that keeps working next month is.

Hammering a site with requests is the surest way to get your IP blocked, your account banned, and the site's team actively working to detect your patterns. Polite scraping isn't just ethics — it's pragmatic.

## How sites detect aggressive scraping

Modern bot detection doesn't just look at request rate. It looks at patterns:

| Signal | Human | Aggressive bot |
|--------|-------|---------------|
| Requests per second | 0.5–2 | 20–100 |
| Time between pages | 2–15s (variable) | 50ms (constant) |
| Mouse movement | Smooth curves | None |
| Scroll behavior | Natural | None or instant |
| Request ordering | Logical path | Alphabetical or random |
| Repeat visits | Occasional | Never |

Any one of these is fine. Several at once, and you're flagged.

## The right pace

A useful mental model: browse like a fast human.

- 1–3 seconds between page loads
- Randomize the delay (humans aren't metronomes)
- Follow logical navigation paths (don't jump between unrelated pages)
- Visit pages in the order a user would

```python
import time
import random

def polite_delay(min_s: float = 1.0, max_s: float = 4.0):
    delay = random.uniform(min_s, max_s)
    time.sleep(delay)

for url in product_urls:
    result = extract(url)
    process(result)
    polite_delay()  # 1–4 seconds, randomized
```

## Clawbrowser's built-in rate limiting

Rather than managing delays yourself, Clawbrowser can handle it:

```bash
# Process a list of URLs with rate limiting
claw batch extract "product name and price" \
  --urls products.txt \
  --json \
  --rate-limit 30/minute \
  --delay-jitter 20%
```

`--delay-jitter 20%` adds randomized variation so requests don't arrive at perfectly regular intervals.

## Respecting robots.txt

```bash
# Check if scraping is allowed before you start
claw robots-check https://example.com/products

# Output:
# /products: allowed
# /admin: disallowed
# Crawl-delay: 2
```

`Crawl-delay` in robots.txt is a suggestion, not a hard limit — but respecting it is both polite and reduces your block risk.

## Caching to reduce repeat hits

If your pipeline runs multiple times, cache pages you've already fetched:

```bash
claw extract "product details" \
  --url https://shop.example.com/product/123 \
  --cache 24h \
  --json
```

Same URL within the cache window returns the stored result without hitting the server. For data that doesn't change hourly, this dramatically cuts request volume.

## Detecting and handling rate limit responses

Sites signal rate limiting in different ways. Clawbrowser detects the common patterns:

```json
{
  "error": "rate_limited",
  "retry_after_seconds": 60,
  "url": "https://example.com/product/123"
}
```

Handle it explicitly:

```python
result = extract(url)

if result.get("error") == "rate_limited":
    retry_after = result.get("retry_after_seconds", 60)
    print(f"Rate limited. Waiting {retry_after}s...")
    time.sleep(retry_after)
    result = extract(url)  # retry once
```

## The daily volume question

There's no universal answer, but rough guidelines:

| Site type | Safe daily volume per IP |
|-----------|------------------------|
| Large e-commerce (Amazon, eBay) | 500–2000 pages |
| Mid-size retail | 200–500 pages |
| News/media | 1000–5000 pages |
| Social platforms | 50–200 pages |
| Small business sites | 50–100 pages |

Distribute across residential proxy IPs to multiply these limits.

## The long game

The goal isn't to scrape the most today. It's to have access tomorrow, next week, and next month.

Sites that detect aggressive scraping don't just block the request — they fingerprint the pattern and block future sessions from similar profiles. Polite scraping keeps your access intact, your profiles unburned, and your data pipeline running.

Slow is smooth. Smooth is continuous.
