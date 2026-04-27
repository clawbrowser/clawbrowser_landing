import type { Metadata } from "next";
import { AgentIntegrationSection } from "@/components/marketing/agent-integration-section";
import { AskAiSection } from "@/components/marketing/ask-ai-section";
import { ArchitectureSummary } from "@/components/marketing/architecture-summary";
import { CapabilityList } from "@/components/marketing/capability-list";
import { CliSection } from "@/components/marketing/cli-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { ProblemSolutionSection } from "@/components/marketing/problem-solution";
import { ProxySection } from "@/components/marketing/proxy-section";
import { WebsiteJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Clawbrowser — Browser built for AI agents",
  description: "Chromium fork with managed browser sessions, fingerprint profiles, and residential/datacenter proxy routing for AI agents. Works with Playwright, Puppeteer, and any CDP tool.",
  alternates: { canonical: "https://clawbrowser.ai" },
};

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <WebsiteJsonLd />
      <HeroSection />
      <ProblemSolutionSection />
      <ArchitectureSummary />
      <CapabilityList />
      <ProxySection />
      <CliSection />
      <AgentIntegrationSection />
      <AskAiSection />
    </div>
  );
}
