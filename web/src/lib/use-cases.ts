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
          "Watch the live browser stream to debug agent behavior. Replay sessions to identify where the agent went wrong without adding custom logging.",
      },
    ],
    benefits: [
      {
        title: "Works with any agent SDK",
        description:
          "Standard CDP means Playwright, Puppeteer, browser-use, Stagehand, and custom agents all work without modifications.",
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
        title: "Connect your scraper",
        description:
          "Point Playwright, Puppeteer, or a Claude agent at the CDP endpoint. Your code does the extraction; Clawbrowser manages the identity layer end-to-end.",
      },
    ],
    benefits: [
      {
        title: "Fewer CAPTCHA interruptions",
        description:
          "Consistent, realistic browser signals lower bot-detection trigger rates across Cloudflare, Datadome, and PerimeterX.",
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
      "Every account lives in a fully isolated browser profile. Cookies, localStorage, IndexedDB, canvas fingerprints, and proxy IPs never touch across profiles — platforms see independent users on different devices.",
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
          "Bundle platform-specific extensions into a profile at creation time. When you open the profile the environment is ready — no manual setup per account.",
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
    slug: "lead-generation",
    title: "Lead Generation & Sales Prospecting",
    tagline: "Research and enrich leads without getting accounts flagged",
    description:
      "Automate outreach research, contact extraction, and CRM enrichment using AI agents that browse as real users. Profile-bound proxies and fingerprint rotation prevent the account flags that kill manual prospecting tools.",
    problem:
      "Prospecting tools get accounts banned because they drive browsers that look nothing like a real user: no browsing history, uniform fingerprint, datacenter IP, and machine-speed interaction patterns. Sales platforms have tuned their bot detection specifically for these patterns.",
    steps: [
      {
        title: "Build warm profiles",
        description:
          "Create profiles with realistic browsing history, consistent timezone, language, and residential proxies in the rep's location. Profiles build up session history over time.",
      },
      {
        title: "Run the research agent",
        description:
          "Point a Claude or GPT-4 agent at your prospect list. The agent searches profiles, extracts contact data, and writes summaries — while looking like a logged-in human.",
      },
      {
        title: "Enrich and export",
        description:
          "The agent populates fields directly into your CRM or exports structured JSON. One run can enrich hundreds of records without manual copy-paste.",
      },
      {
        title: "Pace the work naturally",
        description:
          "Introduce human-like delays between actions. Session persistence means the agent can pause and resume across working hours rather than hammering in one burst.",
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
  {
    slug: "price-monitoring",
    title: "Price & Inventory Monitoring",
    tagline: "Track prices and stock across any site, continuously",
    description:
      "Run real-time monitoring jobs across e-commerce sites, marketplaces, and price comparison pages. Rotating fingerprints and geo-targeted proxies keep monitors running even on sites with aggressive scraping defenses.",
    problem:
      "Price monitoring scripts get blocked fast because they make repetitive, patterned requests from the same IP and browser fingerprint. Sites recognize the pattern within hours and either ban the IP or serve stale cached data — making your monitoring data unreliable.",
    steps: [
      {
        title: "Define your targets",
        description:
          "List the URLs and data fields — price, stock status, seller info, variant availability. Use Playwright scripts or a Claude agent to extract structured data from each page.",
      },
      {
        title: "Rotate profiles across runs",
        description:
          "Each monitoring run uses a different fingerprint profile. Sites see varied browser environments, not a single bot making repetitive requests.",
      },
      {
        title: "Use geo-targeted proxies",
        description:
          "Monitor localized pricing with proxies in the target country. See prices and availability that real local users see — not default or fallback content.",
      },
      {
        title: "Schedule, diff, and alert",
        description:
          "Trigger monitoring jobs on a schedule and compare against the previous run. Receive alerts when prices change, items go in or out of stock, or new variants appear.",
      },
    ],
    benefits: [
      {
        title: "Reliable live data",
        description:
          "Varied fingerprints and IPs reduce the chance of being served cached responses or block pages instead of current prices.",
      },
      {
        title: "Geo-accurate pricing",
        description:
          "Residential proxies in target markets show the localized prices your customers actually see — not generic fallback content.",
      },
      {
        title: "Continuous without maintenance",
        description:
          "Profile rotation and proxy assignment are automatic. Monitoring jobs keep running without intervention when IPs get rate-limited.",
      },
    ],
    metaDescription:
      "Monitor competitor prices and inventory in real time with rotating fingerprints and geo-targeted proxies. Clawbrowser keeps your monitoring jobs running.",
  },
  {
    slug: "seo-research",
    title: "SEO & Competitive Research",
    tagline: "Track rankings and spy on competitors without getting rate-limited",
    description:
      "Automate SERP monitoring, competitor content analysis, and keyword tracking with browser sessions that look like real searches. Get accurate local rankings, AI Overview data, and competitor intelligence at scale.",
    problem:
      "Google and other search engines are highly sensitive to automated queries — they recognize datacenter IPs, headless browsers, and repeated search patterns within seconds. Most SEO tools that scrape SERPs either use heavy proxy rotation with limited accuracy, or get blocked and return stale or incomplete data.",
    steps: [
      {
        title: "Set up geo-specific profiles",
        description:
          "Create profiles with residential proxies and locales for each market you want to track. Rankings in New York look different from rankings in London — each profile gives you ground-truth local SERPs.",
      },
      {
        title: "Run search queries via agent",
        description:
          "Use a Playwright script or Claude agent to perform queries, scroll through results, and extract URLs, snippets, and AI Overview blocks. The browser looks like a real user session.",
      },
      {
        title: "Monitor competitor pages",
        description:
          "Crawl competitor landing pages, blog posts, and product pages on a schedule. Extract content structure, meta signals, internal linking, and schema markup.",
      },
      {
        title: "Track and alert on changes",
        description:
          "Diff ranking positions and page content over time. Get notified when you gain or lose positions, when competitors update copy, or when new SERP features appear.",
      },
    ],
    benefits: [
      {
        title: "Accurate local rankings",
        description:
          "Residential proxies give you real search results from each target locale — not data center IPs that trigger Google's bot scoring.",
      },
      {
        title: "AI Overview visibility",
        description:
          "Capture full SERP pages including AI Overviews, People Also Ask, and Knowledge Panels that API-based tools miss entirely.",
      },
      {
        title: "No rate limits or bans",
        description:
          "Rotating fingerprints and session history keep queries looking organic. Run daily tracking across thousands of keywords without IP blocks.",
      },
    ],
    metaDescription:
      "Automate SERP tracking and competitor research with realistic browser sessions. Clawbrowser gives you accurate local rankings and AI Overview data without rate limits.",
  },
  {
    slug: "ad-intelligence",
    title: "Ad Intelligence & Marketing Research",
    tagline: "Monitor competitor ads and campaigns across every platform",
    description:
      "Scrape ad libraries, landing pages, and marketing assets from Facebook, Google, TikTok, and competitor sites — with browser sessions that bypass ad platform bot detection and render creative exactly as a real user would see it.",
    problem:
      "Ad platforms actively block scrapers from their ad libraries and analytics pages. Tools that rely on datacenter proxies or headless Chrome get blocked at the authentication step. Even when access works, inconsistent fingerprints cause platforms to show degraded or bot-specific ad content rather than real campaigns.",
    steps: [
      {
        title: "Access ad libraries as real users",
        description:
          "Create profiles that browse ad libraries from a genuine-looking residential IP in the target market. Facebook's Ad Library and Google Ads Transparency Center both see a real browser, not a bot.",
      },
      {
        title: "Extract ad creative and copy",
        description:
          "Use a Claude agent or Playwright script to navigate ad libraries, search by advertiser or keyword, and extract creative assets, ad copy, call-to-action text, and landing page URLs.",
      },
      {
        title: "Monitor landing pages",
        description:
          "Track competitor landing pages for copy changes, offer updates, and A/B test variants. Render pages fully with JavaScript to capture dynamic content.",
      },
      {
        title: "Build a competitive intelligence feed",
        description:
          "Store and diff extracted data over time. Get alerts when competitors launch new campaigns, change their messaging, or target new audiences.",
      },
    ],
    benefits: [
      {
        title: "Full ad rendering",
        description:
          "Browser sessions render dynamic ad content, video thumbnails, and carousel creatives that API calls and raw HTML parsing miss.",
      },
      {
        title: "Bypass ad platform bot detection",
        description:
          "Residential proxies and realistic fingerprints let you access ad libraries consistently — no block pages or degraded content.",
      },
      {
        title: "Multi-market coverage",
        description:
          "Run parallel profiles in different countries to see market-specific campaigns, pricing strategies, and regional messaging differences.",
      },
    ],
    metaDescription:
      "Monitor competitor ads, scrape ad libraries, and track landing pages with realistic browser sessions. Clawbrowser bypasses ad platform bot detection for accurate intelligence.",
  },
  {
    slug: "social-media",
    title: "Social Media Management",
    tagline: "Manage multiple brand accounts without triggering platform bans",
    description:
      "Operate social media accounts at scale with full browser isolation per account. Each profile has a unique fingerprint, dedicated proxy, and independent storage — platforms see separate users, not one tool managing many accounts.",
    problem:
      "Social platforms are among the most aggressive at detecting multi-account operations: they track canvas fingerprints, WebGL signatures, login patterns, and IP relationships to link accounts. A single shared fingerprint signal across accounts can cause simultaneous bans across your entire portfolio.",
    steps: [
      {
        title: "One profile per account",
        description:
          "Each social account gets a dedicated browser profile with a unique fingerprint seed and proxy. No two accounts share any browser signal — the platform can't link them.",
      },
      {
        title: "Warm up accounts gradually",
        description:
          "Use agents to simulate realistic browsing patterns before performing actions. Visit content, scroll feeds, and interact naturally before outreach or posting.",
      },
      {
        title: "Automate content and engagement",
        description:
          "Connect an AI agent or Playwright script to post content, respond to messages, monitor mentions, and track analytics — at human-realistic pacing.",
      },
      {
        title: "Monitor and rotate when needed",
        description:
          "Track account health metrics and rotate IPs when velocity signals increase. Session persistence means accounts don't lose history when proxies change.",
      },
    ],
    benefits: [
      {
        title: "Accounts stay separate",
        description:
          "Full fingerprint and storage isolation means platforms can't link your accounts through any browser signal — canvas, WebGL, cookies, or IP.",
      },
      {
        title: "Human-like pacing built in",
        description:
          "Session persistence and realistic fingerprints let agents operate at natural speed without triggering velocity checks.",
      },
      {
        title: "Works across all platforms",
        description:
          "The same CDP-based approach works on LinkedIn, X, Instagram, TikTok, Reddit, and any other platform with a web interface.",
      },
    ],
    metaDescription:
      "Manage multiple social media accounts at scale with full browser isolation. Clawbrowser prevents fingerprint linking that causes simultaneous bans.",
  },
  {
    slug: "ecommerce-ops",
    title: "E-commerce & Retail Operations",
    tagline: "Automate product research, monitoring, and restocking workflows",
    description:
      "From inventory monitoring to product research across multiple marketplaces, run e-commerce automation workflows with browser sessions that survive anti-bot protection on major retail platforms.",
    problem:
      "Retail sites like Amazon, Walmart, and specialty e-commerce stores have some of the strictest bot detection — PerimeterX, Akamai, and custom WAFs that fingerprint every session. Automation that works today can fail tomorrow when anti-bot signatures update.",
    steps: [
      {
        title: "Set up market-specific profiles",
        description:
          "Create profiles with proxies and locales matching each marketplace. Amazon US, Amazon UK, and regional sites all need locally consistent browser identities.",
      },
      {
        title: "Monitor product availability and pricing",
        description:
          "Run agents that check product pages, variant availability, and seller pricing. Detect restocks, price drops, and listing changes as they happen.",
      },
      {
        title: "Research products and categories",
        description:
          "Use AI agents to browse category pages, extract product data, read reviews, and analyze competitive listings — at scale and without manual effort.",
      },
      {
        title: "Automate checkout flows for testing",
        description:
          "Test purchase flows, verify promo codes, and validate geo-specific offers using isolated browser sessions that look like real shoppers from different locations.",
      },
    ],
    benefits: [
      {
        title: "Survives anti-bot on major retailers",
        description:
          "Realistic fingerprints reduce block rates on PerimeterX and Akamai-protected sites where basic headless browsers fail.",
      },
      {
        title: "Accurate regional data",
        description:
          "Geo-targeted proxies show you localized prices, availability, and promotions — not default or CDN-cached content.",
      },
      {
        title: "Parallel marketplace coverage",
        description:
          "Run independent sessions across multiple platforms simultaneously, each with its own identity, so one blocked session doesn't affect others.",
      },
    ],
    metaDescription:
      "Automate e-commerce research, inventory monitoring, and checkout testing with browser sessions that bypass retail anti-bot systems.",
  },
  {
    slug: "developer-testing",
    title: "Developer Testing & QA",
    tagline: "Test against real-world browser conditions without flaky results",
    description:
      "Run end-to-end tests and staging verifications with browser profiles that match production conditions: real fingerprints, geo-specific proxies, and authentic session states. Catch issues that only appear in production browser environments.",
    problem:
      "Standard test browsers use default Chromium with no fingerprint variation, no proxy routing, and no session history. Tests pass in CI but fail in production because the production environment — with real anti-bot protection and geo-specific content delivery — behaves completely differently from the test browser.",
    steps: [
      {
        title: "Create test profiles matching production",
        description:
          "Set up browser profiles with fingerprints and proxies that match your production users' typical environments. Test against the same browser conditions your users face.",
      },
      {
        title: "Run geo-specific verification",
        description:
          "Use profiles with proxies in target regions to verify geo-specific content, localized pricing, and region-locked features from multiple locations simultaneously.",
      },
      {
        title: "Test anti-bot integration",
        description:
          "Verify that your product works for users browsing through security tools and VPNs. Use different fingerprint profiles to simulate the diversity of real user devices.",
      },
      {
        title: "Monitor production user journeys",
        description:
          "Run synthetic monitoring scripts that simulate real user sessions — full browser, real fingerprints, production environment. Catch regressions before users do.",
      },
    ],
    benefits: [
      {
        title: "Tests match production",
        description:
          "Browser fingerprints and proxy routing replicate real user conditions, closing the gap between CI test results and production behavior.",
      },
      {
        title: "Geo testing without VPN juggling",
        description:
          "Spin up profiles in any country instantly. Test regional pricing, content delivery, and locale-specific features without manual VPN switching.",
      },
      {
        title: "AI-powered test agents",
        description:
          "Connect Browser Use or Claude Code to run complex multi-step test scenarios that adapt to UI changes — more resilient than brittle selector-based tests.",
      },
    ],
    metaDescription:
      "Run E2E tests and production monitoring with real browser fingerprints and geo-targeted proxies. Clawbrowser closes the gap between CI and production conditions.",
  },
];

export function getUseCase(slug: string): UseCase | undefined {
  return USE_CASES.find((uc) => uc.slug === slug);
}

export function getAllUseCaseSlugs(): string[] {
  return USE_CASES.map((uc) => uc.slug);
}
