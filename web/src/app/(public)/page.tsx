import { AgentIntegrationSection } from "@/components/marketing/agent-integration-section";
import { AskAiSection } from "@/components/marketing/ask-ai-section";
import { ArchitectureSummary } from "@/components/marketing/architecture-summary";
import { CapabilityList } from "@/components/marketing/capability-list";
import { CliSection } from "@/components/marketing/cli-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { PlatformNote } from "@/components/marketing/platform-note";
import { ProblemSolutionSection } from "@/components/marketing/problem-solution";
import { ProxySection } from "@/components/marketing/proxy-section";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <ProblemSolutionSection />
      <ArchitectureSummary />
      <CapabilityList />
      <ProxySection />
      <CliSection />
      <AgentIntegrationSection />
      <AskAiSection />
      <PlatformNote />
    </div>
  );
}
