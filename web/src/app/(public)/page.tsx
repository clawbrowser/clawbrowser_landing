import type { Metadata } from "next";
import { AgentIntegrationSection } from "@/components/marketing/agent-integration-section";
import { AskAiSection } from "@/components/marketing/ask-ai-section";
import { RoadmapSection } from "@/components/marketing/roadmap-section";
import { ArchitectureSummary } from "@/components/marketing/architecture-summary";
import { CapabilityList } from "@/components/marketing/capability-list";
import { CliSection } from "@/components/marketing/cli-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { ProblemSolutionSection } from "@/components/marketing/problem-solution";
import { ProxySection } from "@/components/marketing/proxy-section";
import { WebsiteJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: { absolute: "Clawbrowser — Browser built for AI agents" },
  description: "Chromium fork with managed browser sessions, fingerprint profiles, and residential/datacenter proxy routing for AI agents. Works with Playwright, Puppeteer, and any CDP tool.",
  alternates: { canonical: "https://clawbrowser.ai" },
  openGraph: {
    title: "Clawbrowser — Browser built for AI agents",
    description: "Chromium fork with managed browser sessions, fingerprint profiles, and residential/datacenter proxy routing for AI agents. Works with Playwright, Puppeteer, and any CDP tool.",
    url: "https://clawbrowser.ai",
    siteName: "Clawbrowser",
    type: "website",
    images: [{ url: "https://clawbrowser.ai/side-bite.svg", width: 256, height: 256 }],
  },
  twitter: {
    card: "summary",
    title: "Clawbrowser — Browser built for AI agents",
    description: "Chromium fork with managed browser sessions, fingerprint profiles, and residential/datacenter proxy routing for AI agents.",
    images: ["https://clawbrowser.ai/side-bite.svg"],
  },
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
      <RoadmapSection />
      <AskAiSection />
    </div>
  );
}
