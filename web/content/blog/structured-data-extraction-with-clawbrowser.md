---
title: "Structured Data Extraction: From Raw HTML to Typed JSON"
excerpt: "Getting useful data out of a webpage is harder than it looks. Here's how Clawbrowser's extraction pipeline works."
date: "2025-04-10"
author: "Clawbrowser Team"
tags: ["data", "extraction", "how-to"]
coverImage: "/blog/extraction-cover.png"
---

Raw HTML is useless to an AI agent. A wall of tags, scripts, and styles — none of it typed, none of it structured. The agent needs *data*, not markup.

This is the extraction problem, and it's one of the hardest parts of building reliable agent pipelines.

## Why simple selectors break

The obvious approach: CSS selectors or XPath. `document.querySelector('.price')`. Works until the site redesigns. Works until you hit a page where the price is in a different element. Works until the content is rendered client-side and your selector fires before the data loads.

## What Clawbrowser's extraction does

Clawbrowser combines three techniques:

**1. Wait for stability**  
Before extracting, Clawbrowser waits until the DOM has stopped changing — no more network requests, no more mutations. You get a snapshot of the final rendered page.

**2. Semantic extraction**  
Instead of selectors, you describe what you want in plain language:

```bash
claw extract "product name, price, and availability" \
  --url https://shop.example.com/product/123 \
  --json
```

Output:
```json
{
  "product_name": "Wireless Keyboard Pro",
  "price": "$89.99",
  "availability": "In stock"
}
```

**3. Schema enforcement**  
Pass a JSON schema and Clawbrowser will coerce the extracted data to match it — including type conversion, null handling, and validation.

## Real-world example: competitive price monitoring

An agent pipeline that monitors competitor pricing across 200 product pages:

```python
import subprocess, json

products = load_product_urls()

for url in products:
    result = subprocess.run([
        "claw", "extract",
        "product name and current price",
        "--url", url,
        "--json"
    ], capture_output=True)
    
    data = json.loads(result.stdout)
    store_price(url, data["price"])
```

Run this with Clawbrowser's parallel sessions and you're scanning 200 pages in the time it takes to load one sequentially.

## When extraction fails

Not every page cooperates. Clawbrowser returns structured errors so your agent can decide what to do:

```json
{
  "error": "extraction_failed",
  "reason": "content_behind_auth",
  "suggestion": "try with an authenticated session profile"
}
```

Your agent gets actionable information, not a crash.
