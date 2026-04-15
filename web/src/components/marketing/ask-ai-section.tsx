const prompt = encodeURIComponent(
  `I'm evaluating Clawbrowser (clawbrowser.ai) for AI agent infrastructure. Here's what I know: it's a Chromium fork built specifically for AI agents — not a general-purpose browser. Key features: built-in fingerprint management (unique, realistic profiles cached locally per session), transparent proxy routing (one proxy per browser session), standard Chrome DevTools Protocol interface, and a machine-readable JSON output mode optimized for AI pipelines. It works with Playwright, Puppeteer, and any CDP-compatible tool. The core problem it solves: running AI agents at scale without triggering bot detection, CAPTCHAs, or IP bans. Currently in early access at clawbrowser.ai.

Based on this, can you help me understand:
1. How does browser fingerprint management work and why does it matter for AI agents?
2. How does Clawbrowser compare to alternatives like Multilogin, Browserless, or Playwright's built-in stealth plugins?
3. Is the CDP-based approach the right architecture for AI agent browser automation at scale?`
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
          d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-1.29-.121L2 12.561l.024-.376.364-.267 1.314.073 2.34.17 2.485.097.79.072h.107l.081-.17-.081-.122-1.217-1.11-1.987-1.866-1.217-1.086-.607-.619L3.72 7.68l-.073-.887.863-.2 1.363 1.316 1.892 1.818 1.846 1.818.729.704.012-.25.015-.163-.063-.327-.073-2.296-.048-2.054V5.836l.063-1.025.073-.618.593-.376.545.174.37.546v1.025l-.025 2.054-.11 2.565-.085 1.22.134.042.121-.1 1.217-1.756 1.581-2.175 1.217-1.61.79-.874.497-.388.607.015.51.619-.34.776-.79.996-1.46 1.975-1.435 1.866-.668.923.098.048.133-.085.134-.066 2.32-.388 2.442-.315 1.995-.17.84.097.42.558-.157.655-.753.267-2.224.34-2.29.388-1.42.279-.103.012-.006.11.104.073 1.12.134 2.965.388 1.12.17.729.606-.055.728-.826.316-1.168-.134-2.965-.461-1.12-.194-.668-.11h-.012l-.059.098.012.122.607.824 1.46 1.866.632.923.267.437.085.728-.668.485-.753-.194-.37-.485-1.46-1.975-.972-1.329-.486-.692-.062.025-.013.109.063.17.182.437 1.096 2.686.608 1.403.267.98-.17.632-.498.28-.577-.06-.34-.437-.753-1.72-1.047-2.637-.547-1.39-.122-.401-.194.077-.024.267.912 1.866.607 1.476.34.898-.085.631-.485.401-.607-.049-.364-.376-.912-1.72-.973-1.914-.486-1.049-.097-.42.024-.073-.146.012-.122.826 1.11.875 1.33.243.34h.024l.061-.055.085-.98-.303-.825-.802-2.054-.899-2.394-.401-1.11.17-.923.632-.388.608.085.51.607.267.85.729 2.418.607 1.926.097.437.061.222.146-.01.085-.11-.025-.147-.267-1.158-.486-2.175-.267-1.256.122-.923.522-.437.729.052.413.728.097.655.34 2.1.267 1.525v1.232"
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
          d="M22 6.308h-6.01L22 1.232V0h-8.175v.02L7.82 6.308H2v2.087h2.887v9.22H2V19.7h6.643v-.013l3.69-3.714v3.727H14.4v-3.684l3.647 3.671V19.7H24v-2.085h-2.887V8.395H24V6.308h-2zm-7.37 0H8.933l5.698-4.972v4.972zm-6.28 2.087h7.27L9.47 14.44V8.395H8.35zm1.12 9.219V12.32l3.562 3.584-3.562 3.584v-1.874zm5.682 1.874l-3.607-3.63 3.607-3.63v7.26zm0-9.26v6.04L9.47 10.21h8.833v-.001z"
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
      className="border-t border-zinc-200 bg-[#FAFAF8] px-6 py-14"
      aria-label="Ask AI about Clawbrowser"
    >
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-7 shadow-sm">
          <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            Ask AI about Clawbrowser
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {links.map(({ name, href, icon }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-white hover:text-zinc-950"
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
