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
  it('hero states product differentiator and offers docs + signup', () => {
    render(<HeroSection />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /fingerprint control and proxy routing/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /get started/i })).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('link', { name: /documentation/i })).toHaveAttribute('href', '/docs');
  });

  it('problem section names AI agents and multi-account users', () => {
    render(<ProblemSolutionSection />);
    const section = screen.getByRole('region', { name: /who clawbrowser is for/i });
    expect(within(section).getByText(/ai agents/i)).toBeInTheDocument();
    expect(within(section).getByText(/multi-account/i)).toBeInTheDocument();
  });

  it('architecture mentions Chromium and libclaw', () => {
    render(<ArchitectureSummary />);
    expect(screen.getByText(/chromium/i)).toBeInTheDocument();
    expect(screen.getByText(/libclaw/i)).toBeInTheDocument();
  });

  it('capabilities include canvas, webgl, and webrtc policy', () => {
    render(<CapabilityList />);
    expect(screen.getByText(/canvas/i)).toBeInTheDocument();
    expect(screen.getByText(/webgl/i)).toBeInTheDocument();
    expect(screen.getByText(/webrtc/i)).toBeInTheDocument();
  });

  it('proxy section states credentials come from profile', () => {
    render(<ProxySection />);
    expect(screen.getByText(/fingerprint profile/i)).toBeInTheDocument();
    expect(screen.getByText(/--regenerate/i)).toBeInTheDocument();
  });

  it('CLI section shows list and remote-debugging-port', () => {
    render(<CliSection />);
    expect(screen.getByText(/--list/i)).toBeInTheDocument();
    expect(screen.getByText(/--remote-debugging-port=9222/i)).toBeInTheDocument();
  });

  it('agent section shows Playwright and Puppeteer CDP URLs', () => {
    render(<AgentIntegrationSection />);
    expect(screen.getByText(/connect_over_cdp/i)).toBeInTheDocument();
    expect(screen.getByText(/connectOverCDP/i)).toBeInTheDocument();
    expect(screen.getByText(/browserURL/i)).toBeInTheDocument();
  });

  it('platform note states macOS MVP', () => {
    render(<PlatformNote />);
    expect(screen.getByText(/macos/i)).toBeInTheDocument();
  });
});
