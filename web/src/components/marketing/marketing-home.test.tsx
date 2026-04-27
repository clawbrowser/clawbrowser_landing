import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { HeroSection } from './hero-section';
import { ProblemSolutionSection } from './problem-solution';
import { ArchitectureSummary } from './architecture-summary';
import { CapabilityList } from './capability-list';
import { ProxySection } from './proxy-section';
import { CliSection } from './cli-section';
import { AgentIntegrationSection } from './agent-integration-section';
import { PlatformNote } from './platform-note';

describe('marketing home sections', () => {
  it('hero states product differentiator and offers docs + download', () => {
    render(<HeroSection />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /browser built for ai agents/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /download/i })).toHaveAttribute('href', 'https://github.com/clawbrowser/clawbrowser/releases');
    expect(screen.getByRole('link', { name: /documentation/i })).toHaveAttribute('href', '/docs');
  });

  it('problem section names AI agents and multi-account users', () => {
    render(<ProblemSolutionSection />);
    const section = screen.getByRole('region', { name: /who clawbrowser is for/i });
    expect(within(section).getByRole('heading', { level: 3, name: /ai agents/i })).toBeInTheDocument();
    expect(within(section).getByRole('heading', { level: 3, name: /multi-account operators/i })).toBeInTheDocument();
  });

  it('architecture mentions Chromium and native patches', () => {
    render(<ArchitectureSummary />);
    expect(screen.getByText(/chromium/i)).toBeInTheDocument();
    expect(screen.getByText(/native patches/i)).toBeInTheDocument();
  });

  it('capabilities include canvas, webgl, and webrtc policy', () => {
    render(<CapabilityList />);
    expect(screen.getByText(/canvas/i)).toBeInTheDocument();
    expect(screen.getByText(/webgl/i)).toBeInTheDocument();
    expect(screen.getByText(/webrtc/i)).toBeInTheDocument();
  });

  it('proxy section states credentials come from profile', () => {
    render(<ProxySection />);
    expect(screen.getByText(/generated profile/i)).toBeInTheDocument();
    expect(screen.getByText(/clawbrowser rotate --session <name>/i)).toBeInTheDocument();
  });

  it('CLI section shows managed session commands', () => {
    render(<CliSection />);
    expect(screen.getByText(/clawbrowser list/i)).toBeInTheDocument();
    expect(screen.getAllByText(/--session work/i).length).toBeGreaterThan(0);
  });

  it('agent section shows Playwright and Puppeteer CDP URLs', () => {
    render(<AgentIntegrationSection />);
    expect(screen.getByText(/connect_over_cdp/i)).toBeInTheDocument();
    expect(screen.getByText(/connectOverCDP/i)).toBeInTheDocument();
    expect(screen.getByText(/browserURL/i)).toBeInTheDocument();
  });

  it('platform note states supported platforms', () => {
    render(<PlatformNote />);
    expect(screen.getByText(/macos/i)).toBeInTheDocument();
  });
});
