---
title: "Proxy Management for Web Scraping: Residential, Datacenter, and Rotating"
excerpt: "Not all proxies are equal. Choosing the wrong type gets you blocked. Here's the full breakdown."
date: "2025-03-28"
author: "Clawbrowser Team"
tags: ["proxies", "scraping", "infrastructure"]
---

IP reputation is one of the first things anti-bot systems check. Your fingerprint can be perfect, your browser behavior can be human-like — but if your IP is a known datacenter address, you're flagged before the page loads.

Proxy strategy matters. Here's how to think about it.

## The three proxy types

### Datacenter proxies

IPs hosted in server farms (AWS, DigitalOcean, etc.). Fast, cheap, easy to get.

**The problem:** Every major anti-bot system maintains blocklists of datacenter IP ranges. AWS us-east-1 subnets are flagged automatically on most protected sites. For anything with serious bot protection, datacenter proxies fail immediately.

**Good for:** Internal testing, unprotected sites, speed-critical pipelines where blocking isn't a concern.

**Cost:** $0.5–2 per GB

### Residential proxies

IPs from real consumer ISPs — devices in homes and offices. Traffic appears to come from a real user's internet connection.

**The tradeoff:** Much harder to detect, but slower and more expensive. Shared pools mean other users' behavior affects your IP reputation.

**Good for:** Most production scraping use cases. The default choice when datacenter proxies fail.

**Cost:** $5–15 per GB

### Mobile proxies

IPs from mobile carrier networks (4G/5G). The highest trust score — mobile IPs are almost never flagged because blocking them risks blocking legitimate mobile users.

**The tradeoff:** Most expensive option. Bandwidth is limited.

**Good for:** High-value targets with aggressive bot protection. Social platforms, financial data, e-commerce.

**Cost:** $20–50 per GB

## Rotation strategies

| Strategy | How it works | Best for |
|----------|-------------|---------|
| Per-request | New IP every request | High-volume, stateless scraping |
| Per-session | Same IP for entire session | Authenticated flows, multi-step tasks |
| Sticky | Same IP for N minutes | Checkout flows, form submissions |
| Geo-targeted | IPs from specific country/city | Geo-restricted content |

Rotating per-request sounds appealing but breaks session-based flows. If you rotate IP mid-session, the site sees a new user and may invalidate your auth.

## Configuring proxies in Clawbrowser

```bash
# Assign a proxy to a profile
claw profile create --name research \
  --proxy "residential:us:rotating"

# Use a specific proxy provider
claw profile create --name checkout \
  --proxy "http://user:pass@proxy.provider.com:8080" \
  --proxy-sticky 10m

# Verify your current IP
claw navigate https://api.ipify.org --profile research --json
```

## Geo-targeting

Some data is only available from specific locations. Clawbrowser supports country and city-level targeting:

```bash
# Get US pricing
claw profile create --name us-research \
  --proxy "residential:us:new-york"

# Get EU pricing  
claw profile create --name eu-research \
  --proxy "residential:de:berlin"
```

Run both in parallel to compare geo-specific content side by side.

## Proxy health monitoring

Proxies go bad. IPs get burned, providers rotate pools, latency spikes. Clawbrowser tracks proxy health automatically:

```bash
claw proxy status
```

```
Profile         Provider        IP              Latency    Status
research        residential-us  104.28.x.x      142ms      healthy
checkout        residential-us  98.113.x.x      891ms      slow
eu-research     residential-de  185.220.x.x     —          blocked
```

Blocked or slow proxies are flagged so you can rotate them before they affect your pipeline.

## The cost math

For most teams, the right setup is:

1. **Residential proxies** for production agent tasks
2. **Datacenter** for internal testing and dev
3. **Mobile** reserved for the handful of high-value targets that need it

Don't pay mobile rates for everything. Don't use datacenter proxies and wonder why you keep getting blocked. Match the proxy tier to the target.
