// About, FAQ, and the contact-admin loop: user sends → admin replies →
// user reads the reply on My messages.
import { test, expect } from "@playwright/test";
import { signupApi, unique, backendScript, login, watchConsole } from "./helpers.js";

test("about, FAQ and contact admin", async ({ page, browser }) => {
  const errors = watchConsole(page);
  const n = unique();

  await test.step("About and FAQ are public and linked from the navbar and footer", async () => {
    await page.goto("/programs");
    await page.locator(".navbar").getByRole("link", { name: "About" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "About Project Exfil" })).toBeVisible();
    await page.locator(".footer").getByRole("link", { name: "FAQ" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Frequently asked questions" })).toBeVisible();
    await page.getByText("Why isn't SkillBridge listed?").click();
    await expect(page.getByText("DoD SkillBridge is only for active-duty")).toBeVisible();
  });

  await test.step("logged out: contact asks you to log in", async () => {
    await page.locator(".navbar").getByRole("link", { name: "Contact" }).click();
    await expect(page.locator(".composer-gate")).toContainText("to send a message");
  });

  const U = await signupApi("msg");
  await test.step("user sends a message", async () => {
    await login(page, U);
    await page.goto("/contact");
    await page.getByLabel("Subject").fill(`Question ${n}`);
    await page.getByLabel("Message").fill("When does the next cohort open?");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Message sent")).toBeVisible();
    await page.getByRole("link", { name: "My messages" }).click();
    await expect(page.locator(".employer-card", { hasText: `Question ${n}` })).toContainText("Waiting for a reply");
  });

  await test.step("admin replies from the Messages tab", async () => {
    const A = await signupApi("madm");
    backendScript("prisma/make-admin.js", A.username);
    const ap = await (await browser.newContext({ baseURL: test.info().project.use.baseURL })).newPage();
    await login(ap, A);
    await expect(ap.locator(".navbar").getByRole("link", { name: "Contact" })).toHaveCount(0);
    await ap.goto("/admin?tab=messages");
    const item = ap.locator(".admin-item", { hasText: `Question ${n}` });
    await expect(item).toContainText(U.email);
    await item.getByPlaceholder(/Reply/).fill("Next cohort opens in March.");
    await item.getByRole("button", { name: /Send reply/ }).click();
    await expect(item).toHaveCount(0);
    await ap.close();
  });

  await test.step("user sees the reply", async () => {
    await page.goto("/account/messages");
    const card = page.locator(".employer-card", { hasText: `Question ${n}` });
    await expect(card).toContainText("Answered");
    await expect(card).toContainText("Next cohort opens in March.");
  });

  expect(errors).toEqual([]);
});
