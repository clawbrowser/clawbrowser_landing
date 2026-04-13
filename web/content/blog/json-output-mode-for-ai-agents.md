---
title: "Why JSON Output Mode Changes Everything for AI Agent Pipelines"
excerpt: "The difference between an agent that works and one that hallucinates is often just structured output. Here's how Clawbrowser's --json mode works."
date: "2025-05-01"
author: "Clawbrowser Team"
tags: ["agents", "output", "json"]
---

The biggest failure mode in AI agent pipelines isn't the LLM. It's the data pipeline feeding the LLM.

When your agent receives unstructured text — raw HTML, markdown dumps, truncated page content — it has to guess at structure. That guessing introduces errors that compound across multi-step tasks. By step five, the agent is confidently wrong.

Structured output is not a nice-to-have. It's load-bearing.

## The problem with raw page content

Here's what a typical web scraping pipeline looks like without structured output:

```python
# Agent receives this:
page_content = """
<div class="product-card">
  <h3 class="title">Wireless Keyboard Pro</h3>
  <span class="price">$89.99</span>
  <span class="badge in-stock">In Stock</span>
  <div class="rating" data-score="4.3">★★★★☆</div>
</div>
... 800 more lines of HTML ...
"""

# Agent has to parse this, introducing:
# - Token waste on HTML structure
# - Ambiguity between attributes and content  
# - Context window pressure
# - Hallucination risk when content is truncated
```

Your LLM is spending tokens understanding HTML when it should be reasoning about the data.

## Clawbrowser's --json mode

With `--json`, Clawbrowser handles the parsing and returns typed, structured data:

```bash
claw extract "product name, price, availability, and rating" \
  --url https://shop.example.com/product/123 \
  --json
```

```json
{
  "product_name": "Wireless Keyboard Pro",
  "price": "$89.99",
  "availability": "In Stock",
  "rating": 4.3
}
```

The agent receives data, not markup. Every token counts toward reasoning.

## Schema enforcement

For production pipelines, you need consistent types — not just best-effort extraction. Pass a schema:

```bash
claw extract "product details" \
  --url https://shop.example.com/product/123 \
  --json \
  --schema '{
    "product_name": "string",
    "price_usd": "number",
    "in_stock": "boolean",
    "rating": "number"
  }'
```

```json
{
  "product_name": "Wireless Keyboard Pro",
  "price_usd": 89.99,
  "in_stock": true,
  "rating": 4.3
}
```

Types are enforced. `price_usd` is a `number`, not a string with a dollar sign. `in_stock` is `true`, not `"In Stock"`. Your downstream code never has to parse these.

## Multi-item extraction

Extract arrays of items from listing pages:

```bash
claw extract "all products: name, price, and rating" \
  --url https://shop.example.com/category/keyboards \
  --json \
  --array
```

```json
[
  { "name": "Wireless Keyboard Pro", "price": 89.99, "rating": 4.3 },
  { "name": "Mechanical Keyboard V2", "price": 129.00, "rating": 4.7 },
  { "name": "Compact Keyboard Mini", "price": 59.99, "rating": 3.9 }
]
```

One command. A typed array your agent can iterate.

## Handling extraction failures

When content isn't found, `--json` returns structured errors — not empty strings or crashes:

```json
{
  "error": "field_not_found",
  "field": "rating",
  "reason": "No rating element present on this product page",
  "partial": {
    "product_name": "Wireless Keyboard Pro",
    "price": "$89.99"
  }
}
```

Your agent gets actionable information. It can decide to proceed with partial data, retry, or escalate — not guess.

## Integrating with LLM pipelines

```python
import subprocess
import json

def get_product_data(url: str) -> dict:
    result = subprocess.run(
        ["claw", "extract", "product name, price, availability, rating",
         "--url", url, "--json"],
        capture_output=True, text=True
    )
    return json.loads(result.stdout)

# Feed clean data to your LLM
product = get_product_data("https://shop.example.com/product/123")

prompt = f"""
Analyze this product and suggest whether to stock it:

Product: {product['product_name']}
Price: ${product['price_usd']}
In stock: {product['in_stock']}
Rating: {product['rating']}/5

Respond with: recommend/pass and one sentence reason.
"""
```

No HTML parsing. No prompt engineering around markup. The LLM reasons about data.

## The compounding effect

In a 10-step agent pipeline, structured output at each step means:

- Errors don't compound — bad parse at step 1 doesn't corrupt step 7
- Token usage drops — LLM processes data, not markup
- Reliability goes up — no ambiguity, no guessing

The agents that work reliably in production are the ones where every data handoff is typed and explicit. `--json` makes that the default.
