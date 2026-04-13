---
title: "5 Patterns That Make Web Agents Actually Reliable"
excerpt: "Most agent pipelines are fragile. These five patterns are the difference between a demo and a production system."
date: "2025-05-12"
author: "Clawbrowser Team"
tags: ["agents", "reliability", "architecture"]
---

Building a web agent that works in a demo is easy. Building one that runs unattended for weeks without breaking is not.

Here are the five patterns we've seen separate reliable production agents from brittle prototypes.

## Pattern 1: Describe intent, not selectors

Brittle agents navigate by CSS selectors:

```python
# Breaks when the site redesigns
await page.click("#checkout-button-v2")
await page.fill(".email-input-field", email)
```

Reliable agents describe what they want:

```bash
claw click "the checkout button"
claw fill "email address field" --value "user@example.com"
```

Clawbrowser resolves the intent to the actual element at runtime. A class name change doesn't break your agent. A layout redesign doesn't break your agent. The intent — "click checkout" — remains stable even when the DOM changes.

## Pattern 2: Explicit wait states

The most common cause of flaky agents: acting before the page is ready.

```bash
# Bad: navigate then immediately extract
claw navigate https://app.example.com/dashboard
claw extract "account balance"  # might fire before data loads

# Good: wait for a specific element that signals readiness
claw navigate https://app.example.com/dashboard \
  --wait-for "account balance widget"
claw extract "account balance"
```

Define what "ready" means for each page. Don't rely on timeouts.

## Pattern 3: Structured error handling

Agents fail silently when errors aren't handled explicitly. Define what your agent should do for each failure mode:

```python
import subprocess
import json

def navigate_with_retry(url: str, profile: str, max_retries: int = 3) -> dict:
    for attempt in range(max_retries):
        result = subprocess.run(
            ["claw", "navigate", url, "--profile", profile, "--json"],
            capture_output=True, text=True
        )
        
        if result.returncode == 0:
            return json.loads(result.stdout)
        
        error = json.loads(result.stderr)
        
        match error.get("error"):
            case "rate_limited":
                time.sleep(60 * (attempt + 1))  # backoff
                continue
            case "auth_required":
                reauth(profile)  # refresh session
                continue
            case "page_not_found":
                return {"error": "not_found", "url": url}
            case _:
                if attempt == max_retries - 1:
                    raise RuntimeError(f"Failed after {max_retries} attempts: {error}")
```

Every error type gets an explicit handler. No silent failures, no generic retries.

## Pattern 4: Session checkpointing

Long multi-step tasks need checkpoints. If step 8 fails, you shouldn't have to redo steps 1–7.

```bash
# Save state at each milestone
claw profile snapshot --name checkout-flow --checkpoint "after-cart"

# Restore from checkpoint if something fails later
claw profile restore --name checkout-flow --checkpoint "after-cart"
```

For Python pipelines, checkpoint to a file:

```python
import json
from pathlib import Path

CHECKPOINT_FILE = "agent_state.json"

def save_checkpoint(state: dict):
    Path(CHECKPOINT_FILE).write_text(json.dumps(state))

def load_checkpoint() -> dict | None:
    if Path(CHECKPOINT_FILE).exists():
        return json.loads(Path(CHECKPOINT_FILE).read_text())
    return None

# Resume from where we left off
state = load_checkpoint() or {"step": 0, "results": []}

for i, url in enumerate(urls[state["step"]:], state["step"]):
    result = process(url)
    state["results"].append(result)
    state["step"] = i + 1
    save_checkpoint(state)
```

## Pattern 5: Canary validation

Before running a full pipeline, validate that your extraction still works on a sample:

```python
CANARY_URL = "https://target.com/known-product"
EXPECTED_KEYS = ["product_name", "price", "in_stock"]

def validate_extraction() -> bool:
    result = subprocess.run(
        ["claw", "extract", "product name, price, availability",
         "--url", CANARY_URL, "--json"],
        capture_output=True, text=True
    )
    
    if result.returncode != 0:
        return False
    
    data = json.loads(result.stdout)
    return all(k in data for k in EXPECTED_KEYS)

# Run canary before the full pipeline
if not validate_extraction():
    alert("Extraction broken — site may have changed structure")
    exit(1)

# Site structure is intact — proceed
run_full_pipeline()
```

If the target site restructures its page, the canary catches it before you've wasted compute on 200 failed extractions.

## The reliability stack

| Pattern | What it prevents |
|---------|-----------------|
| Intent-based navigation | Selector rot from site redesigns |
| Explicit wait states | Race conditions on dynamic content |
| Structured error handling | Silent failures, infinite retries |
| Session checkpointing | Losing progress on long tasks |
| Canary validation | Undetected extraction breakage |

None of these are complex. Each one eliminates a whole class of production incidents. Apply all five and you have an agent that runs unattended.
