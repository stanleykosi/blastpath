import { expect, test, type Page } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? [], "browser console and page errors").toEqual([]);
});

test("operator can inspect evidence and replay containment", async ({ page }) => {
  await page.goto("/incidents/GHSA-g7cv-rxg3-hmpx");
  await expect(page.getByText("Impacted services")).toBeVisible();
  await expect(page.getByText("Checkout Service")).toBeVisible();
  await expect(page.getByText("Confirmed execution")).toBeVisible();
  await expect(page.getByText("@blastpath/checkout-shell")).toBeVisible();
  await page.getByRole("row", { name: /Checkout Service/ }).click();
  await expect(page.getByText("@blastpath/checkout-shell")).toBeVisible();
  await expect(page.getByLabel("Loading evidence path")).not.toBeVisible();
  await page.getByRole("button", { name: /How HydraDB proved this/ }).click();
  await expect(page.getByText(/algo\.(SP|SS)paths/)).toBeVisible();
  await expect(page.getByText("QUERY IDS")).toBeVisible();
  await expect(page.locator(".query-ids li").first()).not.toBeEmpty();
  await page.getByRole("button", { name: "Simulate containment" }).click();
  await expect(page.getByText(/Simulation over observed paths/)).toBeVisible();
  const removedServices = page.locator(".removed-services");
  await expect(removedServices.getByText("Checkout Service")).toBeVisible();
  await expect(removedServices.getByText("Admin Console")).toBeVisible();
  await expect(page.getByText("0", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Reset simulation" }).click();
  await page.route("**/services/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.continue();
  });
  await page.getByRole("row", { name: /Analytics Worker/ }).click();
  await expect(page.getByLabel("Loading evidence path")).toBeVisible();
  await expect(page.getByText("@blastpath/checkout-shell")).not.toBeVisible();
  await expect(page.getByText("No affected path")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test("console fits a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/incidents/GHSA-g7cv-rxg3-hmpx");
  await expect(page.getByRole("heading", { name: "Build timeline" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("Escape closes containment only on mobile", async ({ page }) => {
  await page.goto("/incidents/GHSA-g7cv-rxg3-hmpx");
  await expect(page.getByRole("button", { name: "Simulate containment" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Simulate containment" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Show simulation detail" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Simulate containment" })).not.toBeVisible();

  await page.setViewportSize({ width: 900, height: 844 });
  await expect(page.getByRole("button", { name: "Simulate containment" })).toBeVisible();
});

test("malformed successful detail data shows the safe error panel", async ({ page }) => {
  await page.route("**/services/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: { paths: "not-an-array" },
        meta: { requestId: "e2e-invalid-detail" },
      }),
    });
  });
  await page.goto("/incidents/GHSA-g7cv-rxg3-hmpx");

  await expect(page.getByRole("heading", { name: "Service detail failed" })).toBeVisible();
  await expect(page.getByText("The server returned an invalid response.")).toBeVisible();
});

test("malformed successful replay data shows the safe error panel", async ({ page }) => {
  await page.route("**/replay", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: { removedServiceIds: "not-an-array" },
        meta: { requestId: "e2e-invalid-replay" },
      }),
    });
  });
  await page.goto("/incidents/GHSA-g7cv-rxg3-hmpx");
  await page.getByRole("button", { name: "Simulate containment" }).click();

  await expect(page.getByRole("heading", { name: "Simulation failed" })).toBeVisible();
  await expect(page.getByText("The server returned an invalid response.")).toBeVisible();
});

test("operator sees a safe replay error and can retry", async ({ page }) => {
  await page.route("**/replay", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "HYDRADB_UNAVAILABLE",
          message: "HydraDB is not available. Retry after the database is ready.",
          requestId: "e2e-replay-error",
          retryable: true,
        },
      }),
    });
  });
  await page.goto("/incidents/GHSA-g7cv-rxg3-hmpx");
  await page.getByRole("button", { name: "Simulate containment" }).click();

  await expect(page.getByRole("heading", { name: "Simulation failed" })).toBeVisible();
  await expect(
    page.getByText("HydraDB is not available. Retry after the database is ready."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry request" })).toBeVisible();
});

test("a stale detail retry cannot replace the selected service evidence", async ({ page }) => {
  let serviceRequestCount = 0;
  let releaseRetry: (() => void) | undefined;
  const retryGate = new Promise<void>((resolve) => {
    releaseRetry = resolve;
  });
  await page.route("**/services/**", async (route) => {
    serviceRequestCount += 1;
    if (serviceRequestCount === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "HYDRADB_UNAVAILABLE",
            message: "HydraDB is not available.",
            requestId: "e2e-detail-error",
            retryable: true,
          },
        }),
      });
      return;
    }
    if (serviceRequestCount === 2) await retryGate;
    await route.continue();
  });

  await page.goto("/incidents/GHSA-g7cv-rxg3-hmpx");
  await expect(page.getByRole("heading", { name: "Service detail failed" })).toBeVisible();
  await page.getByRole("button", { name: "Retry request" }).click();
  await expect.poll(() => serviceRequestCount).toBe(2);
  await page.getByRole("row", { name: /Analytics Worker/ }).click();
  await expect(page.getByText("No affected path")).toBeVisible();
  releaseRetry?.();

  await expect(page.getByText("Analytics Worker").last()).toBeVisible();
  await expect(page.getByText("@blastpath/checkout-shell")).not.toBeVisible();
});
