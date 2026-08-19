import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";

const refresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import { ErrorPanel } from "@/components/error-panel";

describe("server-rendered failure states", () => {
  it("enables retry for the incident HydraDB error branch", () => {
    const incidentPage = readFileSync("app/incidents/[incidentId]/page.tsx", "utf8");
    const hydradbBranch = incidentPage.match(
      /if \(state === "hydradb"\)([\s\S]*?)\n  return \(/,
    )?.[1];

    expect(hydradbBranch).toContain("<ErrorPanel");
    expect(hydradbBranch).toMatch(/\n\s+retry\s*\n\s*\/>/);
  });

  it("renders a retry control for a server failure", () => {
    const markup = renderToStaticMarkup(
      createElement(ErrorPanel, {
        message: "HydraDB did not return the incident evidence.",
        retry: true,
      }),
    );

    expect(markup).toContain("<button");
    expect(markup).toContain("Retry request");
  });
});
