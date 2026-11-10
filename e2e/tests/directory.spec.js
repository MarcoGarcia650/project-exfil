// Public directory: browse, URL filters, listing/org pages, save flow.
import { test, expect } from "@playwright/test";
import { api, signupApi, login, watchConsole } from "./helpers.js";

test("public directory and saving", async ({ page }) => {
  const errors = watchConsole(page);
  const pub = (await api("GET", "/programs")).data;
  const first = pub[0];

  await test.step("logged-out browse", async () => {
    await page.goto("/programs");
    await expect(page.locator(".result-count")).toBeVisible();
    await expect(page.locator(".employer-card")).toHaveCount(pub.length);
    await expect(page.getByText("Log in to save").first()).toBeVisible();
    await expect(page.locator(".navbar").getByText("Browse")).toBeVisible();
  });

  await test.step("filters live in the URL; empty state; clear", async () => {
    // A value no published listing has, so the empty state must appear.
    const other = ["ACCEPTING", "ROLLING", "CLOSED", "UNKNOWN"].find((a) => !pub.some((p) => p.applicationAvailability === a));
    await page.selectOption('select[name="availability"]', other);
    await expect(page.locator(".empty-state")).toBeVisible();
    expect(page.url()).toContain(`availability=${other}`);
    await expect(page.getByRole("link", { name: "Suggest a program" })).toBeVisible();
    await page.locator(".empty-state").getByRole("button", { name: "Clear filters" }).click();
    await expect(page.locator(".employer-card").first()).toBeVisible();
    expect(new URL(page.url()).search).toBe("");
    await page.goto(`/programs?availability=${first.applicationAvailability}&techTrack=BOGUS`);
    await expect(page.locator('select[name="availability"]')).toHaveValue(first.applicationAvailability);
    // The bogus techTrack is ignored; only the availability filter applies.
    await expect(page.locator(".employer-card")).toHaveCount(pub.filter((p) => p.applicationAvailability === first.applicationAvailability).length);
  });

  await test.step("legacy /employers redirect keeps query", async () => {
    await page.goto("/employers?format=TRAINING");
    await page.waitForURL(/\/programs\?format=TRAINING/);
  });

  await test.step("listing page", async () => {
    await page.goto("/programs");
    await page.locator(".card-title-link").first().click();
    await page.waitForURL(new RegExp(`/programs/${first.slug}$`));
    await expect(page.locator(".veteran-route")).toBeVisible();
    await expect(page.getByText(/Last verified/)).toBeVisible();
    await expect(page).toHaveTitle(new RegExp(`^${first.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  });

  await test.step("archived, draft and unknown pages", async () => {
    await page.goto("/programs/hoh-corporate-fellowship");
    await expect(page.locator(".archived-banner p")).toContainText("Archived");
    await expect(page.getByText(/Log in to save|^Save$/)).toHaveCount(0);
    await page.goto("/programs/amazon-technical-apprenticeship"); // never published by any spec
    await expect(page.getByText("We couldn't find that program")).toBeVisible();
    await page.goto("/no-such-route");
    await expect(page.getByText("We couldn't find that page")).toBeVisible();
  });

  await test.step("organization pages", async () => {
    await page.goto(`/organizations/${first.organization.slug}`);
    await expect(page.locator(".employer-card").first()).toBeVisible();
    await page.goto("/organizations/hoh");
    await expect(page.getByText("No longer active")).toBeVisible();
    await page.goto("/organizations/amazon");
    await expect(page.getByText("We couldn't find that organization")).toBeVisible();
  });

  await test.step("log in to save returns to the listing; saved state shown", async () => {
    const u = await signupApi("dir");
    await api("POST", "/saved-employers", { programId: first.id }, u.token);
    await page.goto(`/programs/${first.slug}`);
    await page.getByText("Log in to save").click();
    await page.waitForURL(/\/login/);
    await page.fill('input[name="email"]', u.email);
    await page.fill('input[name="password"]', u.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL(new RegExp(`/programs/${first.slug}$`));
    await expect(page.locator(".save-button", { hasText: "Saved" })).toBeVisible();
    await page.goto("/dashboard");
    await expect(page.locator(`.saved-card a[href="/programs/${first.slug}"]`)).toHaveCount(1);
  });

  expect(errors).toEqual([]);
});
