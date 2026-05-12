export type UseCase = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  problem: string;
  steps: { title: string; description: string }[];
  benefits: { title: string; description: string }[];
  metaDescription: string;
};

export const USE_CASES: UseCase[] = [
  {
    slug: "web-scraping",
    title: "Web Scraping at Scale",
    tagline: "Extract data from any site without getting blocked",
    description:
      "Run parallel browser sessions with rotating fingerprints and residential proxies. Each session looks like a real user from a different location — adblockers cut page weight and proxy bandwidth.",
    problem:
      "Most scrapers hit rate limits, IP bans, and CAPTCHA walls within minutes. The root cause isn't request volume — it's that every session shares the same browser fingerprint and canvas signature, making bots trivially detectable at the TLS and JavaScript layer.",
    steps: [
      {
        title: "Create isolated profiles",
        description:
          "Each scraping job gets its own fingerprint profile with unique canvas, WebGL, audio, and font signatures. No two sessions share any identity signal.",
      },
      {
        title: "Bind a proxy per profile",
        description:
          "Attach a residential or datacenter IP at the profile level. Traffic exits from the region your target expects, matching language, currency, and geo signals.",
      },
      {
        title: "Block ads and trackers",
        description:
          "uBlock Origin ships pre-installed. Tracker calls and ad payloads are stripped before they execute, cutting page weight and reducing the surface area for fingerprinting scripts.",
      },
      {
        title: "Connect your scraper or agent",
        description:
          "Point Playwright, Puppeteer, or a Claude agent at the CDP endpoint. Your code does the extraction; Clawbrowser manages the identity layer end-to-end.",
      },
    ],
    benefits: [
      {
        title: "Fewer CAPTCHA interruptions",
        description:
          "Consistent, realistic browser signals lower bot-detection trigger rates across anti-bot vendors.",
      },
      {
        title: "Lower proxy spend",
        description:
          "Adblockers remove megabytes of tracking payload per page, cutting billable bandwidth on residential proxies.",
      },
      {
        title: "Parallel sessions without bleed",
        description:
          "Dozens of isolated profiles run simultaneously. Cookies, storage, and fingerprint state never cross profile boundaries.",
      },
    ],
    metaDescription:
      "Scrape at scale with rotating fingerprints, per-profile proxies, and built-in adblockers. Clawbrowser reduces CAPTCHA hits and cuts proxy bandwidth.",
  },
  {
    slug: "multi-account-management",
    title: "Multi-Account Management",
    tagline: "Run unlimited accounts without triggering bans",
    description:
      "Every account lives in a fully isolated browser profile. Cookies, localStorage, IndexedDB, canvas fingerprints, and proxy IPs never touch across profiles — platforms see independent users.",
    problem:
      "Platforms detect linked accounts by comparing browser fingerprints across sessions: canvas hash, WebGL renderer, installed fonts, screen resolution, and timezone. Using separate logins inside one browser still leaves a shared fingerprint trail that flags all accounts simultaneously.",
    steps: [
      {
        title: "Create a profile per account",
        description:
          "Each profile gets its own fingerprint seed, storage partition, and optionally a dedicated proxy. Opening ten profiles is no different from ten physical machines to the target site.",
      },
      {
        title: "Assign consistent proxies",
        description:
          "Lock each account to a stable residential IP in the expected geo. Consistent ASN and IP history avoids the velocity signals that trigger review queues.",
      },
      {
        title: "Pre-install account extensions",
        description:
          "Bundle platform-specific extensions or password managers into a profile at creation time. When you open the profile the environment is ready — no manual setup per account.",
      },
      {
        title: "Automate with agents or scripts",
        description:
          "Use Playwright, Puppeteer, or an AI agent to operate multiple accounts in parallel. Each automation session stays inside its own profile boundary.",
      },
    ],
    benefits: [
      {
        title: "True isolation",
        description:
          "Storage and fingerprint partitioning that goes deeper than incognito mode or separate Chrome profiles.",
      },
      {
        title: "No manual fingerprint tuning",
        description:
          "Clawbrowser generates realistic, internally consistent fingerprints — no spoofing every parameter by hand.",
      },
      {
        title: "Scale to hundreds of accounts",
        description:
          "Profile management via API. Create, clone, start, and stop profiles programmatically from your automation code.",
      },
    ],
    metaDescription:
      "Manage hundreds of isolated browser accounts without cross-contamination. Clawbrowser gives each account a unique fingerprint, storage, and proxy.",
  },
  {
    slug: "ai-agent-automation",
    title: "AI Agent Automation",
    tagline: "Give your AI agent a browser that doesn't get blocked",
    description:
      "LLM-based agents need a browser they can drive without hitting bot walls. Clawbrowser exposes a standard CDP endpoint so any agent framework works — and handles the fingerprint and proxy layer so the agent focuses on the task.",
    problem:
      "AI agents running browser automation fail not because the LLM makes mistakes, but because the browser looks like a bot: headless flags in the user-agent, missing canvas noise, uniform viewport, no stored cookies. Sites detect and block these sessions before the agent can complete a single step.",
    steps: [
      {
        title: "Start a managed session",
        description:
          "Call clawctl or the API to launch a browser session with a pre-configured fingerprint profile. Get back a CDP endpoint in milliseconds.",
      },
      {
        title: "Connect your agent framework",
        description:
          "Pass the CDP URL to Playwright, Puppeteer, browser-use, or any CDP-compatible library. Claude Code, LangChain, and custom agents all connect the same way.",
      },
      {
        title: "Let the agent work",
        description:
          "The agent navigates, fills forms, clicks, and reads content. Clawbrowser handles TLS fingerprinting, canvas noise, WebGL masking, and proxy routing transparently.",
      },
      {
        title: "Stream or observe the session",
        description:
          "Watch the live browser stream to debug agent behavior without VNC or screen sharing. Replay sessions to identify where the agent went wrong.",
      },
    ],
    benefits: [
      {
        title: "Works with any agent SDK",
        description:
          "Standard CDP means Playwright, Puppeteer, browser-use, Selenium, and custom agents all work without modifications.",
      },
      {
        title: "Less time fighting bot detection",
        description:
          "Agents spend cycles on the actual task instead of retry loops caused by CAPTCHA and block pages.",
      },
      {
        title: "Persistent sessions",
        description:
          "Resume a named session across runs. Cookies and login state are preserved, so the agent doesn't re-authenticate on every invocation.",
      },
    ],
    metaDescription:
      "Give AI agents a browser that passes bot detection. Clawbrowser exposes a CDP endpoint with fingerprint profiles and proxy routing for any LLM agent framework.",
  },
  {
    slug: "market-monitoring",
    title: "Market & Price Monitoring",
    tagline: "Track competitors and prices without getting rate-limited",
    description:
      "Run continuous monitoring jobs across e-commerce sites, SaaS pricing pages, and market data sources. Rotating profiles and proxies keep your monitor running even on sites with aggressive scraping defenses.",
    problem:
      "Price and market monitoring scripts get blocked quickly because they make repetitive, patterned requests from the same IP and browser identity. Sites recognize the pattern within hours and serve stale cached data — or block entirely — making your monitoring data unreliable.",
    steps: [
      {
        title: "Define your monitoring targets",
        description:
          "List the URLs, CSS selectors, or data fields you want to track. Use Playwright scripts or a Claude agent to extract structured data from each page.",
      },
      {
        title: "Rotate profiles across runs",
        description:
          "Each monitoring run uses a different fingerprint profile. Sites see varied browser environments, not a single bot making repetitive requests.",
      },
      {
        title: "Use geo-targeted proxies",
        description:
          "Monitor localized pricing with proxies in the target country. See the prices and product availability that real local users see.",
      },
      {
        title: "Schedule and alert",
        description:
          "Trigger monitoring jobs on a schedule and diff the output against the previous run. Receive alerts when prices change or new products appear.",
      },
    ],
    benefits: [
      {
        title: "Reliable data, not cached responses",
        description:
          "Varied fingerprints and IPs reduce the chance of being served stale data or block pages instead of live content.",
      },
      {
        title: "Geo-accurate pricing",
        description:
          "Residential proxies in target markets show the localized prices your customers actually see, not generic fallback content.",
      },
      {
        title: "Low maintenance",
        description:
          "Profile rotation and proxy assignment are automatic. Monitoring jobs keep running without manual intervention when IPs get rate-limited.",
      },
    ],
    metaDescription:
      "Monitor competitor prices and market data reliably with rotating fingerprints and geo-targeted proxies. Clawbrowser keeps your monitoring jobs running.",
  },
  {
    slug: "sales-prospecting",
    title: "Sales & Lead Prospecting",
    tagline: "Automate lead research without LinkedIn bans or CAPTCHA walls",
    description:
      "Research leads, extract contact data, and enrich CRM records using AI agents that browse as real users. Profile-bound proxies and fingerprint rotation prevent the account flags that kill manual prospecting tools.",
    problem:
      "Prospecting tools get accounts banned because they drive browsers that look nothing like a real user: no browsing history, uniform fingerprint, datacenter IP, and machine-speed interaction patterns. Sales platforms have tuned their bot detection specifically for these patterns.",
    steps: [
      {
        title: "Build a warm profile",
        description:
          "Create a profile with a realistic browsing history, consistent timezone, language, and a residential proxy in the rep's location. The profile builds up session history over time.",
      },
      {
        title: "Run the research agent",
        description:
          "Point a Claude or GPT-4 agent at your prospect list. The agent searches profiles, extracts structured data, and writes summaries — while looking like a logged-in human.",
      },
      {
        title: "Enrich and export",
        description:
          "The agent populates fields directly into your CRM or exports structured JSON. One automation run can enrich hundreds of records without manual copy-paste.",
      },
      {
        title: "Respect rate limits naturally",
        description:
          "Introduce human-paced delays between actions. Clawbrowser's session persistence means the agent can pause and resume across working hours rather than hammering in one burst.",
      },
    ],
    benefits: [
      {
        title: "Residential IP per rep profile",
        description:
          "Each sales rep's automation profile uses a proxy in their geo, matching the IP history the platform expects for that account.",
      },
      {
        title: "Survives session restarts",
        description:
          "Named sessions persist cookies and local storage. Agents resume mid-workflow without re-login prompts breaking the automation.",
      },
      {
        title: "Scales from one rep to a team",
        description:
          "Create a profile per rep or territory. All profiles managed through a single API with no per-seat browser licenses.",
      },
    ],
    metaDescription:
      "Automate lead research and CRM enrichment with AI agents that browse as real users. Clawbrowser prevents the fingerprint patterns that get sales tools banned.",
  },
];

export function getUseCase(slug: string): UseCase | undefined {
  return USE_CASES.find((uc) => uc.slug === slug);
}

export function getAllUseCaseSlugs(): string[] {
  return USE_CASES.map((uc) => uc.slug);
}
