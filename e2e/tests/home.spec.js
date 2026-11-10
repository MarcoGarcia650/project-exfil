// Home page: hero search, track shortcuts, recently verified listings, and
// the signed-out call to action.
import { test, expect } from "@playwright/test";
import { watchConsole } from "./helpers.js";

test("home page search, tracks and recent listings", async ({ page }) => {
  const errors = watchConsole(page);

  await test.step("hero, photo and signed-out call to action", async () => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("A way in is.");
    await expect(page.locator(".home-photo img")).toBeVisible();
    // The home page has its own search, so the navbar one is hidden here.
    await expect(page.locator(".navbar .header-search")).toHaveCount(0);
    await expect(page.locator(".home-callout").getByRole("link", { name: "Sign up" })).toBeVisible();
  });

  await test.step("recently verified shows up to three published listings", async () => {
    const tiles = page.locator(".home-section .tile");
    await expect(tiles.first()).toBeVisible();
    expect(await tiles.count()).toBeLessThanOrEqual(3);
  });

  await test.step("search goes to browse with the query", async () => {
    await page.getByLabel("Search programs").fill("cloud");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/programs\?q=cloud$/);
    await expect(page.locator(".navbar .header-search input")).toHaveValue("cloud");
  });

  await test.step("a track shortcut opens browse filtered to that track", async () => {
    await page.goto("/");
    await page.locator(".home-tracks").getByRole("link", { name: "Cybersecurity" }).click();
    await expect(page).toHaveURL(/\/programs\?techTrack=CYBERSECURITY$/);
  });

  expect(errors).toEqual([]);
});
