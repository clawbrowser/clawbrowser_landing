import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { GitHubStarsLink } from "./github-stars-link";

describe("GitHubStarsLink", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the current star count from GitHub", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ stargazers_count: 7 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<GitHubStarsLink />);

    const loadingLink = screen.getByRole("link", { name: "Clawbrowser on GitHub, stars loading" });
    expect(within(loadingLink).queryByText("6")).not.toBeInTheDocument();

    expect(await screen.findByRole("link", { name: "Clawbrowser on GitHub, 7 stars" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/clawbrowser/clawbrowser",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});
