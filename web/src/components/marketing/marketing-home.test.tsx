import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { HeroSection } from "./hero-section";
import { ProductDemoSection } from "./product-demo-section";
import { UseCasesSection } from "./use-cases-section";
import { FeaturesSection } from "./features-section";

describe("marketing home sections", () => {
  it("gives visitors one clear install action", () => {
    render(<HeroSection />);
    expect(screen.getByRole("heading", { level: 1, name: /let your ai do the browser work/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy install prompt/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign up/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /download/i })).not.toBeInTheDocument();
  });

  it("reveals onboarding steps after copying", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<HeroSection />);

    fireEvent.click(screen.getByRole("button", { name: /copy install prompt/i }));

    expect(writeText).toHaveBeenCalledOnce();
    const pasteStep = await screen.findByText(/paste into your agent/i);
    const pasteCard = pasteStep.closest("div.rounded-2xl");
    expect(pasteCard).not.toBeNull();
    expect(within(pasteCard as HTMLElement).getByText(/^codex$/i)).toBeInTheDocument();
    expect(within(pasteCard as HTMLElement).getByText(/^claude code$/i)).toBeInTheDocument();
    expect(screen.getByText(/generate api key/i)).toBeInTheDocument();
    expect(screen.getByText(/give the key to your agent/i)).toBeInTheDocument();
  });

  it("shows a concrete browser-work example", () => {
    render(<ProductDemoSection />);
    expect(screen.getByRole("heading", { level: 2, name: /ask for the outcome/i })).toBeInTheDocument();
    expect(screen.getByText(/36 product pages/i)).toBeInTheDocument();
  });

  it("shows the full use-case catalog without carousel controls", () => {
    render(<UseCasesSection />);
    expect(screen.getByRole("heading", { level: 2, name: /one browser, a few jobs people actually care about/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /turn prospect research into a ready-to-send list/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see all use cases/i })).toHaveAttribute("href", "/use-cases");
  });

  it("explains the technical layer after the examples", () => {
    render(<FeaturesSection />);
    expect(screen.getByText(/looks like a real browser/i)).toBeInTheDocument();
    expect(screen.getByText(/works with your existing tools/i)).toBeInTheDocument();
  });
});
