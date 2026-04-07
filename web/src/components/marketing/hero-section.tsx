import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section
      className="relative w-full overflow-hidden px-6 py-28 text-center md:py-36"
      aria-labelledby="hero-heading"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,183,250,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 20%, rgba(67,10,240,0.05) 0%, transparent 60%), #FAFAF8",
      }}
    >
      <div className="relative mx-auto max-w-4xl space-y-7">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-medium text-zinc-500 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
          Early access — now open
        </div>

        <h1
          id="hero-heading"
          className="text-4xl font-semibold tracking-tight text-zinc-950 md:text-6xl lg:text-[4.5rem]"
          style={{ letterSpacing: "-1.5px" }}
        >
          Browser built for AI agents
        </h1>

        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-zinc-500 md:text-xl">
          Clawbrowser is a Chromium fork with built-in fingerprint management
          and transparent proxy routing. Stop fighting captchas and bot detection at scale.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" href="/signup">Get started free</Button>
          <Button size="lg" variant="outline" href="/docs">Documentation</Button>
        </div>

        <p className="text-sm text-zinc-400">
          Works with Playwright, Puppeteer, and any CDP-compatible tool
        </p>
      </div>
    </section>
  );
}
