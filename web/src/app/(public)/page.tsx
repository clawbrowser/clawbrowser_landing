import type { Metadata } from "next";
import { AskAiSection } from "@/components/marketing/ask-ai-section";
import { BenefitsSection } from "@/components/marketing/benefits-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { ProblemSolutionSection } from "@/components/marketing/problem-solution";
import { RoadmapSection } from "@/components/marketing/roadmap-section";
import { UseCasesSection } from "@/components/marketing/use-cases-section";
import { WebsiteJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: { absolute: "Clawbrowser — Browser built for AI agents" },
  description: "Clawbrowser gives every browser session its own identity — unique fingerprint, real IP, isolated cookies. AI agents and scripts run further without hitting blocks or CAPTCHAs.",
  alternates: { canonical: "https://clawbrowser.ai" },
  openGraph: {
    title: "Clawbrowser — Browser built for AI agents",
    description: "Clawbrowser gives every browser session its own identity — unique fingerprint, real IP, isolated cookies. AI agents and scripts run further without hitting blocks or CAPTCHAs.",
    url: "https://clawbrowser.ai",
    siteName: "Clawbrowser",
    type: "website",
    images: [{ url: "https://clawbrowser.ai/side-bite.svg", width: 256, height: 256 }],
  },
  twitter: {
    card: "summary",
    title: "Clawbrowser — Browser built for AI agents",
    description: "Clawbrowser gives every browser session its own identity — unique fingerprint, real IP, isolated cookies.",
    images: ["https://clawbrowser.ai/side-bite.svg"],
  },
};

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <WebsiteJsonLd />
      <HeroSection />
      <ProblemSolutionSection />
      <FeaturesSection />
      <BenefitsSection />
      <UseCasesSection />
      <RoadmapSection />
      <AskAiSection />
    </div>
  );
}
