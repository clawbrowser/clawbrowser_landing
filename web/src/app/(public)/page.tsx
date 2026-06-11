import type { Metadata } from "next";
import { BenefitsSection } from "@/components/marketing/benefits-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { ProductDemoSection } from "@/components/marketing/product-demo-section";
import { UseCasesSection } from "@/components/marketing/use-cases-section";
import { WebsiteJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: { absolute: "Clawbrowser — Let your AI do the browser work" },
  description: "Give Claude, Codex, Gemini, and your own AI agents a real browser for research, data collection, website testing, and persistent logged-in workflows.",
  alternates: { canonical: "https://clawbrowser.ai" },
  openGraph: {
    title: "Clawbrowser — Let your AI do the browser work",
    description: "A real browser for AI agents to research, collect data, test websites, and run logged-in workflows.",
    url: "https://clawbrowser.ai",
    siteName: "Clawbrowser",
    type: "website",
    images: [{ url: "https://clawbrowser.ai/side-bite.svg", width: 256, height: 256 }],
  },
  twitter: {
    card: "summary",
    title: "Clawbrowser — Let your AI do the browser work",
    description: "A real browser for AI agents to research, collect data, test websites, and run logged-in workflows.",
    images: ["https://clawbrowser.ai/side-bite.svg"],
  },
};

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <WebsiteJsonLd />
      <HeroSection />
      <ProductDemoSection />
      <UseCasesSection />
      <FeaturesSection />
      <BenefitsSection />
    </div>
  );
}
