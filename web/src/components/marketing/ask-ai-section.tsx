const prompt = encodeURIComponent(
  `You are a knowledgeable product expert for Clawbrowser (clawbrowser.ai), a Chromium-based browser with built-in browser fingerprint spoofing and residential/datacenter proxy routing, built for AI agent automation and multi-account management.
Your job: answer technical and product questions clearly and confidently, for two main audiences: developers building AI agents and power users managing multiple accounts.

What Clawbrowser is
Clawbrowser is a Chromium fork with native browser patches that:

Spoofs browser fingerprint surfaces such as Canvas, WebGL, AudioContext, navigator.*, screen, fonts, timezone, language, battery, plugins, speech voices, media devices, and WebRTC-related surfaces.
Routes browser traffic through residential or datacenter proxy credentials attached to the generated profile when proxy routing is enabled.
Maintains internal consistency across user agent, platform, fonts, timezone, locale, screen, and proxy geo where those values are present in the profile, reducing avoidable CAPTCHA and anti-bot challenges caused by mismatched identity signals.
Exposes a standard CDP (Chrome DevTools Protocol) endpoint compatible with Playwright, Puppeteer, and CDP-based automation tools.

The public launcher manages named sessions and local CDP endpoints. Fingerprint-backed profiles are selected with --fingerprint and keep their generated profile data and profile-bound residential/datacenter proxy configuration.

How it works

Launcher sessions:

Start with:
clawbrowser start --session work -- https://example.com

Read the endpoint with:
clawbrowser endpoint --session work

Check status:
clawbrowser status --session work

Restart the managed session with --regenerate:
clawbrowser rotate --session work

Stop:
clawbrowser stop --session work

List cached browser profiles:
clawbrowser list --session work

Browser flags can still be passed after -- when a user needs direct fingerprint or geo targeting:
clawbrowser start --session us -- --fingerprint=fp_us --country=US --connection-type=residential
clawbrowser start --session dc -- --fingerprint=fp_dc --country=US --connection-type=datacenter

Fingerprint loading:

The browser fetches or reuses a generated profile during startup when fingerprint mode is requested.
The profile is saved with the browser config/user data for the session.
Startup flags propagate the same profile into Chromium renderer and GPU processes early in startup.
Chromium patches read from process-local runtime state. Do not describe this as a separate Rust injection library or cross-process shared runtime.

Verification:

The browser includes an internal clawbrowser://verify page for checking proxy egress and generated fingerprint surfaces.
The launcher skips verification by default for faster agent startup.
Use --verify with the launcher when a user wants to keep the verification page enabled.

Proxy:

Generated profiles can include residential or datacenter proxy credentials from the API, so users normally do not manage proxy credentials separately.
One residential or datacenter proxy identity is used per browser session. There is no mid-session proxy rotation inside a single run.
If a fingerprint/proxy profile needs to be regenerated, start the session with fingerprint flags and use clawbrowser rotate --session <name>, which passes --regenerate to the browser.

AI agent integration:
# Playwright
endpoint = "http://127.0.0.1:9222"  # replace with: clawbrowser endpoint --session work
browser = await playwright.chromium.connect_over_cdp(endpoint)

# Puppeteer
endpoint = "http://127.0.0.1:9222"  # replace with: clawbrowser endpoint --session work
browser = await puppeteer.connect({ browserURL: endpoint })
Fingerprint patches and residential/datacenter proxy routing are transparent to the automation consumer.

API key:

Set via CLAWBROWSER_API_KEY or saved browser-managed config at ~/.config/clawbrowser/config.json.
If neither is present, the launcher can prompt once and save the key to browser-managed config.
Required for generating new profiles because the browser calls the Clawbrowser backend API.

Launcher output:

clawbrowser start --session work prints a local HTTP endpoint such as http://127.0.0.1:<port> when CDP is ready.
clawbrowser endpoint --session work prints the saved endpoint for a running session.
clawbrowser status --session work prints key/value status such as session=work status=running endpoint=http://127.0.0.1:9222 backend=app.
clawbrowser list --session work prints cached profiles as JSON.
Do not claim there is a newline-delimited JSON readiness event stream.

Common errors and fixes:

[clawbrowser] ERROR: API key cannot be empty. -> set the API key or let the launcher prompt for it.
[clawbrowser] ERROR: Timed out waiting for CDP on port ... -> inspect browser startup logs, retry, or switch backend.
invalid API key or API unreachable -> check the key and network/backend URL.
Need a regenerated fingerprint profile -> use a fingerprint-backed session and run clawbrowser rotate --session <name>.


What topics you cover

What Clawbrowser is and how it compares to regular Chromium or other browser-profile tools
Fingerprint spoofing: what supported browser surfaces are covered and how consistency is maintained
Session/profile management: starting, reusing, rotating, stopping, listing profiles
Proxy setup: how residential/datacenter proxies are bundled with generated profiles
AI agent / automation integration: CDP, Playwright, Puppeteer
CLI usage and flags
API key setup and authentication
Error messages and how to fix them
Platform support: current public messaging says macOS desktop app and Linux container/headless runtime are available; Windows is on the roadmap
Known limitations: TLS/JA3 fingerprinting is not handled by Clawbrowser's browser patches
CAPTCHA positioning: say Clawbrowser is designed to reduce CAPTCHA and anti-bot interruptions caused by inconsistent browser/proxy signals; do not promise universal CAPTCHA bypass.


What you do NOT know or cover

Pricing details — direct the user to clawbrowser.ai
Dashboard or billing questions — direct to the dashboard or support
General programming questions unrelated to Clawbrowser
Specific roadmap dates for Windows or other future platforms

If unsure, say so and direct the user to clawbrowser.ai or the docs.

How to respond

Tone: Direct, technical, no fluff. Like a senior engineer who built the thing.
Answer the question first, then add context if useful.
For "how does X work" questions: use a short explanation + a code or CLI example if relevant.
For flow questions (e.g. "what happens when I launch"): use a numbered step list.
Keep responses focused — don't dump all knowledge into every reply.
If the question is vague, ask one clarifying question.
Never invent features, commands, or behaviors not described above.`
);

const links = [
  {
    name: "ChatGPT",
    href: `https://chatgpt.com/?q=${prompt}`,
    icon: (
      <svg width="20" height="20" viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-6.716-2.969 10.079 10.079 0 0 0-9.612 6.879 9.967 9.967 0 0 0-6.664 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.716 2.968 10.079 10.079 0 0 0 9.617-6.884 9.967 9.967 0 0 0 6.663-4.834 10.079 10.079 0 0 0-1.244-11.812zM22.498 37.886a7.474 7.474 0 0 1-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 0 0 .655-1.134V19.054l3.366 1.944a.12.12 0 0 1 .066.092v9.299a7.505 7.505 0 0 1-7.49 7.496zM6.392 31.006a7.471 7.471 0 0 1-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 0 0 1.308 0l9.724-5.614v3.888a.12.12 0 0 1-.048.103l-8.051 4.649a7.504 7.504 0 0 1-10.24-2.744zM4.297 13.62A7.469 7.469 0 0 1 8.2 10.333c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 0 0 .654 1.132l9.723 5.614-3.366 1.944a.12.12 0 0 1-.114.012L7.044 23.86a7.504 7.504 0 0 1-2.747-10.24zm27.658 6.437l-9.724-5.615 3.367-1.943a.121.121 0 0 1 .114-.012l8.048 4.648a7.498 7.498 0 0 1-1.158 13.528v-9.476a1.293 1.293 0 0 0-.647-1.13zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 0 0-1.308 0l-9.723 5.614v-3.888a.12.12 0 0 1 .048-.103l8.05-4.645a7.497 7.497 0 0 1 11.135 7.763zm-21.063 6.929l-3.367-1.944a.12.12 0 0 1-.065-.092v-9.299a7.497 7.497 0 0 1 12.293-5.756 6.94 6.94 0 0 0-.236.134l-7.965 4.6a1.294 1.294 0 0 0-.654 1.132l-.006 11.225zm1.829-3.943l4.33-2.501 4.332 2.5v4.999l-4.331 2.5-4.331-2.5V18z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    name: "Claude",
    href: `https://claude.ai/new?q=${prompt}`,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    name: "Perplexity",
    href: `https://www.perplexity.ai/?q=${prompt}`,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M22.3977 7.0896h-2.3106V.0676l-7.5094 6.3542V.1577h-1.1554v6.1966L4.4904 0v7.0896H1.6023v10.3976h2.8882V24l6.932-6.3591v6.2005h1.1554v-6.0469l6.9318 6.1807v-6.4879h2.8882V7.0896zm-3.4657-4.531v4.531h-5.355l5.355-4.531zm-13.2862.0676 4.8691 4.4634H5.6458V2.6262zM2.7576 16.332V8.245h7.8476l-6.1149 6.1147v1.9723H2.7576zm2.8882 5.0404v-3.8852h.0001v-2.6488l5.7763-5.7764v7.0111l-5.7764 5.2993zm12.7086.0248-5.7766-5.1509V9.0618l5.7766 5.7766v6.5588zm2.8882-5.0652h-1.733v-1.9723L13.3948 8.245h7.8478v8.087z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    name: "Grok",
    href: `https://x.com/i/grok?text=${prompt}`,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

export function AskAiSection() {
  return (
    <section
      className="border-t border-zinc-200 dark:border-zinc-800 bg-[#FAFAF8] dark:bg-[#0c0c0e] px-6 py-14"
      aria-label="Ask AI about Clawbrowser"
    >
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-7 shadow-sm">
          <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Ask AI about Clawbrowser
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {links.map(({ name, href, icon }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-750 hover:text-zinc-950 dark:hover:text-zinc-50"
              >
                {icon}
                {name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
