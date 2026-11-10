// Public directory: browse, URL filters, listing/org pages, save flow.
import { test, expect } from "@playwright/test";
import { api, signupApi, login, watchConsole } from "./helpers.js";

test("public directory and saving", async ({ page }) => {
  const errors = watchConsole(page);
  const pub = (await api("GET", "/programs")).data;
  const first = pub[0];

  const AVAIL = { ACCEPTING: "Accepting applications", ROLLING: "Rolling applications", CLOSED: "Applications closed", UNKNOWN: "Application status unknown" };
  const filterPanel = page.locator(".filter-panel");

  await test.step("logged-out browse", async () => {
    await page.goto("/programs");
    await expect(page.locator(".result-count")).toBeVisible();
    await expect(page.locator(".tile")).toHaveCount(pub.length);
    await expect(page.getByRole("link", { name: /^Log in to save/ }).first()).toBeVisible();
    await expect(page.locator(".navbar").getByRole("link", { name: "Browse" })).toBeVisible();
  });

  await test.step("checkbox filters live in the URL; empty state; clear", async () => {
    // A value no published listing has, so the empty state must appear.
    const other = Object.keys(AVAIL).find((a) => !pub.some((p) => p.applicationAvailability === a));
    await filterPanel.getByLabel(AVAIL[other]).click();
    await expect(filterPanel.getByLabel(AVAIL[other])).toBeChecked();
    await expect(page.locator(".empty-state")).toBeVisible();
    expect(page.url()).toContain(`availability=${other}`);
    await expect(page.locator(".empty-state").getByRole("link", { name: "Suggest a program" })).toBeVisible();
    // Adding a second value widens the results (any-of).
    await filterPanel.getByLabel(AVAIL[first.applicationAvailability]).click();
    await expect(page.locator(".tile").first()).toBeVisible();
    expect(decodeURIComponent(page.url())).toMatch(new RegExp(`availability=(${other},${first.applicationAvailability}|${first.applicationAvailability},${other})`));
    await filterPanel.getByRole("button", { name: "Clear all" }).click();
    await expect(page.locator(".tile")).toHaveCount(pub.length);
    expect(new URL(page.url()).search).toBe("");
    await page.goto(`/programs?availability=${first.applicationAvailability}&techTrack=BOGUS`);
    await expect(filterPanel.getByLabel(AVAIL[first.applicationAvailability])).toBeChecked();
    // The bogus techTrack is ignored; only the availability filter applies.
    await expect(page.locator(".tile")).toHaveCount(pub.filter((p) => p.applicationAvailability === first.applicationAvailability).length);
  });

  await test.step("navbar search lives in the URL", async () => {
    await page.goto("/organizations/hoh");
    await page.getByLabel("Search programs").fill("vets who");
    await page.getByLabel("Search programs").press("Enter");
    await page.waitForURL(/\/programs\?q=vets/);
    await expect(page.locator(".tile")).toHaveCount(1);
    await expect(page.locator(".tile")).toContainText("Vets Who Code");
    await expect(page.locator(".search-chip")).toContainText("vets who");
    await page.getByLabel("Search programs").fill("zzz-nothing");
    await page.getByLabel("Search programs").press("Enter");
    await expect(page.getByText("No programs match “zzz-nothing”")).toBeVisible();
    await page.locator(".empty-state").getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByLabel("Search programs")).toHaveValue("");
    await expect(page.locator(".tile")).toHaveCount(pub.length);
  });

  await test.step("card opens a modal over the grid; Escape, ✕ and Back close it", async () => {
    await page.goto("/programs");
    await page.locator(".tile .card-title-link").first().click();
    const dialog = page.getByRole("dialog", { name: first.name });
    await expect(dialog).toBeVisible();
    expect(page.url()).toContain(`listing=${first.slug}`);
    await expect(dialog.locator(".veteran-route")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    expect(page.url()).not.toContain("listing=");
    await expect(page.locator(".tile .card-title-link").first()).toBeFocused();
    await page.locator(".tile .card-title-link").first().click();
    await page.getByRole("button", { name: "Close details" }).click();
    await expect(dialog).toHaveCount(0);
    await page.locator(".tile .card-title-link").first().click();
    await expect(dialog).toBeVisible();
    await page.goBack();
    await expect(dialog).toHaveCount(0);
    // A shared link opens straight into the modal.
    await page.goto(`/programs?listing=${first.slug}`);
    await expect(dialog).toBeVisible();
  });

  await test.step("legacy /employers redirect keeps query", async () => {
    await page.goto("/employers?format=TRAINING");
    await page.waitForURL(/\/programs\?format=TRAINING/);
  });

  await test.step("listing page via the modal's Open full page", async () => {
    await page.goto("/programs");
    await page.locator(".tile .card-title-link").first().click();
    await page.getByRole("dialog").getByRole("link", { name: "Open full page" }).click();
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
    await expect(page.locator(".tile").first()).toBeVisible();
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

  await test.step("unsave from the listing and from the dashboard; home stays reachable", async () => {
    page.on("dialog", (d) => d.accept());
    await page.goto(`/programs/${first.slug}`);
    await page.locator(".save-button", { hasText: "Saved" }).click();
    await expect(page.locator(".save-button", { hasText: /^Save$/ })).toBeVisible();
    await page.locator(".save-button").click();
    await expect(page.locator(".save-button", { hasText: "Saved" })).toBeVisible();
    await page.goto("/dashboard");
    await page.locator(".saved-card").getByRole("button", { name: "Remove" }).click();
    await expect(page.locator(".saved-card")).toHaveCount(0);
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Go to your dashboard" })).toBeVisible();
  });

  expect(errors).toEqual([]);
});
