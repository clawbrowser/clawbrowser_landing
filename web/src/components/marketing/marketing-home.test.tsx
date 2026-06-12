import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HeroSection } from "./hero-section";
import { ProductDemoSection } from "./product-demo-section";
import { UseCasesSection } from "./use-cases-section";
import { FeaturesSection } from "./features-section";

describe("marketing home sections", () => {
  it("gives visitors one clear primary action", () => {
    render(<HeroSection />);
    expect(screen.getByRole("heading", { level: 1, name: /give your agent a browser that does not get blocked/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /get started free/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy prompt/i })).toBeInTheDocument();
  });

  it("shows paste instructions after copying", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<HeroSection />);

    fireEvent.click(screen.getByRole("button", { name: /copy prompt/i }));

    expect(writeText).toHaveBeenCalledOnce();
    expect(await screen.findByText(/now paste it into your agent/i)).toBeInTheDocument();
    expect(screen.getByText(/paste into claude code, codex, cursor, or gemini/i)).toBeInTheDocument();
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
