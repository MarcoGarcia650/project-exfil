// Accounts: signup with username, reset link ending other sessions,
// username prompt for pre-username accounts.
import { test, expect } from "@playwright/test";
import { api, unique, backendScript, login, watchConsole } from "./helpers.js";

const LEGACY = { email: "legacy@example.com", password: "legacy-pass-1" };

test("signup, password reset, username prompt", async ({ page, browser }) => {
  const errors = watchConsole(page);
  const n = unique();
  const email = `e2e-acct-${n}@example.com`, username = `EAcct_${n}`.slice(0, 20);

  await test.step("signup requires a valid username", async () => {
    await page.goto("/signup");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="username"]', "Admin");
    await page.fill('input[name="password"]', "longenough");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.locator(".error")).toContainText("reserved");
    await page.fill('input[name="username"]', username);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/\/programs$/);
    await page.goto("/dashboard");
    await expect(page.locator(".summary")).toBeVisible();
    await expect(page.locator(".prompt-banner")).toHaveCount(0);
  });

  await test.step("reset in another tab ends this session", async () => {
    // The link's host is the dev frontend; follow its path on the test frontend.
    const raw = new URL(backendScript("prisma/reset-link.js", username).trim().split("\n").pop());
    const link = raw.pathname + raw.search;
    const other = await (await browser.newContext({ baseURL: test.info().project.use.baseURL })).newPage();
    await other.goto(link);
    await other.fill('input[name="password"]', "brandnewpass");
    await other.fill('input[name="confirm"]', "different!!");
    await other.getByRole("button", { name: "Set new password" }).click();
    await expect(other.locator(".error")).toContainText("match");
    await other.fill('input[name="confirm"]', "brandnewpass");
    await other.getByRole("button", { name: "Set new password" }).click();
    await other.waitForURL(/\/login$/);
    await expect(other.locator(".success")).toContainText("Password updated");
    await login(other, { email: email.toUpperCase(), password: "brandnewpass" });

    await page.goto("/dashboard");
    await expect(page.locator(".navbar").getByText("Log in")).toBeVisible();

    await other.goto(link);
    await other.fill('input[name="password"]', "anotherpass1");
    await other.fill('input[name="confirm"]', "anotherpass1");
    await other.getByRole("button", { name: "Set new password" }).click();
    await expect(other.locator(".error")).toContainText("invalid or has expired");
    await other.goto("/reset-password");
    await expect(other.getByText("This reset link is incomplete")).toBeVisible();
    await other.close();
  });

  await test.step("pre-username account: prompt → taken → choose → gone", async () => {
    const lp = await (await browser.newContext({ baseURL: test.info().project.use.baseURL })).newPage();
    await login(lp, LEGACY);
    await lp.goto("/dashboard");
    await expect(lp.locator(".prompt-banner")).toBeVisible();
    await lp.getByRole("link", { name: "Choose one" }).click();
    await lp.getByLabel("Username").fill(username.toLowerCase());
    await lp.getByRole("button", { name: "Save username" }).click();
    await expect(lp.locator(".error")).toContainText("taken");
    await lp.getByLabel("Username").fill(`Leg_${n}`.slice(0, 20));
    await lp.getByRole("button", { name: "Save username" }).click();
    await lp.waitForURL(/\/dashboard$/);
    await expect(lp.locator(".summary")).toBeVisible();
    await expect(lp.locator(".prompt-banner")).toHaveCount(0);
    await lp.goto("/account/username");
    await lp.waitForURL(/\/dashboard$/);
    await lp.close();
  });

  expect(errors).toEqual([]);
});
