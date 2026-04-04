import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section
      className="mx-auto max-w-4xl space-y-6 px-6 py-20 text-center md:py-28"
      aria-labelledby="hero-heading"
    >
      <h1
        id="hero-heading"
        className="text-4xl font-bold tracking-tight md:text-5xl"
      >
        Fingerprint control and proxy routing for AI agents
      </h1>
      <p className="mx-auto max-w-2xl text-lg text-zinc-600 md:text-xl dark:text-zinc-400">
        Clawbrowser is a Chromium-based browser with built-in fingerprint management
        and transparent proxy routing. Cut down captcha churn and inconsistent
        signals when you automate at scale—or run many accounts with stable,
        coherent identities.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Button size="lg" href="/signup">
          Get started
        </Button>
        <Button size="lg" variant="outline" href="/docs">
          Documentation
        </Button>
      </div>
    </section>
  );
}
