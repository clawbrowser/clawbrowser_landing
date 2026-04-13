---
title: "Building a Price Monitoring Agent with Clawbrowser"
excerpt: "A complete walkthrough: from zero to a working agent that monitors competitor prices across 200 product pages and alerts you to changes."
date: "2025-04-15"
author: "Clawbrowser Team"
tags: ["how-to", "agents", "python"]
---

Price monitoring is one of the most common real-world use cases for browser automation. It's also a good case study because it hits all the hard problems: scale, bot detection, session management, structured output.

Let's build it end to end.

## What we're building

- Monitor 200 competitor product pages
- Extract price, availability, and product name
- Store results in a CSV
- Alert when price changes by more than 5%
- Run on a schedule, unattended

## Prerequisites

- Clawbrowser CLI installed
- Python 3.10+
- A list of product URLs

## Step 1: Create a monitoring profile

```bash
claw profile create --name price-monitor \
  --os windows \
  --browser chrome \
  --proxy "residential:us:rotating" \
  --timezone America/Chicago
```

We use a residential US proxy and a Windows/Chrome fingerprint — the most common browser profile, least likely to trigger bot detection.

## Step 2: Test extraction on one URL

Before scaling, verify the extraction works on a single product page:

```bash
claw extract "product name, current price, availability status" \
  --url "https://competitor.com/product/123" \
  --profile price-monitor \
  --json
```

Expected output:
```json
{
  "product_name": "Wireless Keyboard Pro X",
  "current_price": "$89.99",
  "availability_status": "In stock"
}
```

Tweak the extraction prompt if needed until you get clean output.

## Step 3: The monitoring script

```python
import subprocess
import json
import csv
import time
from datetime import datetime
from pathlib import Path

URLS_FILE = "products.txt"
OUTPUT_CSV = "prices.csv"
PROFILE = "price-monitor"
EXTRACTION_PROMPT = "product name, current price, and availability status"

def extract_price(url: str) -> dict | None:
    result = subprocess.run(
        [
            "claw", "extract", EXTRACTION_PROMPT,
            "--url", url,
            "--profile", PROFILE,
            "--json",
            "--timeout", "30",
        ],
        capture_output=True,
        text=True,
    )
    
    if result.returncode != 0:
        print(f"Failed: {url} — {result.stderr.strip()}")
        return None
    
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        print(f"Bad JSON from {url}")
        return None

def load_previous_prices() -> dict:
    if not Path(OUTPUT_CSV).exists():
        return {}
    
    prices = {}
    with open(OUTPUT_CSV, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            prices[row["url"]] = row["price"]
    return prices

def parse_price(price_str: str) -> float | None:
    try:
        return float(price_str.replace("$", "").replace(",", "").strip())
    except ValueError:
        return None

def check_alert(url: str, old_price: str, new_price: str) -> None:
    old = parse_price(old_price)
    new = parse_price(new_price)
    
    if old is None or new is None:
        return
    
    change_pct = abs(new - old) / old * 100
    if change_pct >= 5:
        direction = "↓" if new < old else "↑"
        print(f"ALERT {direction} {change_pct:.1f}% price change: {url}")
        print(f"  Was: {old_price}  Now: {new_price}")

def run():
    urls = Path(URLS_FILE).read_text().splitlines()
    urls = [u.strip() for u in urls if u.strip()]
    
    previous = load_previous_prices()
    timestamp = datetime.utcnow().isoformat()
    rows = []
    
    print(f"Monitoring {len(urls)} products...")
    
    for i, url in enumerate(urls, 1):
        print(f"[{i}/{len(urls)}] {url}")
        data = extract_price(url)
        
        if data:
            price = data.get("current_price", "")
            
            if url in previous:
                check_alert(url, previous[url], price)
            
            rows.append({
                "timestamp": timestamp,
                "url": url,
                "product_name": data.get("product_name", ""),
                "price": price,
                "availability": data.get("availability_status", ""),
            })
        
        # Polite delay between requests
        time.sleep(1)
    
    with open(OUTPUT_CSV, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["timestamp", "url", "product_name", "price", "availability"])
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"Done. Results saved to {OUTPUT_CSV}")

if __name__ == "__main__":
    run()
```

## Step 4: Prepare your URL list

`products.txt` — one URL per line:

```
https://competitor.com/product/wireless-keyboard-pro
https://competitor.com/product/mechanical-keyboard-v2
https://competitor.com/product/gaming-mouse-x500
...
```

## Step 5: Run it

```bash
python monitor.py
```

Output:
```
Monitoring 200 products...
[1/200] https://competitor.com/product/wireless-keyboard-pro
[2/200] https://competitor.com/product/mechanical-keyboard-v2
ALERT ↓ 12.3% price change: https://competitor.com/product/gaming-mouse-x500
  Was: $79.99  Now: $69.99
[3/200] https://competitor.com/product/gaming-mouse-x500
...
Done. Results saved to prices.csv
```

## Step 6: Schedule it

Run on a cron schedule (Linux/Mac):

```bash
# Run every 6 hours
0 */6 * * * cd /path/to/project && python monitor.py >> monitor.log 2>&1
```

Windows Task Scheduler or a simple GitHub Actions workflow also work.

## What this handles automatically

- **Bot detection** — residential proxy + realistic fingerprint
- **Session persistence** — the `price-monitor` profile reuses cookies
- **Structured output** — JSON from `claw extract`, no selector maintenance
- **Error handling** — failed extractions are logged, script continues

200 product pages, running every 6 hours, unattended. That's a production price monitoring agent in under 100 lines of Python.
