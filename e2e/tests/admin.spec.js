// Admin page: access, reports (hide), submissions (reject with note),
// users (suspend/unsuspend, reset link), drafts (checklist-gated publish,
// awaiting-research block, reject → Rejected tab → return to drafts).
import { test, expect } from "@playwright/test";
import { api, signupApi, unique, backendScript, login, watchConsole } from "./helpers.js";

const PUB = "vetswhocode-accelerator";

test("admin page", async ({ page, browser }) => {
  const n = unique();
  const A = await signupApi("adm"), U = await signupApi("au"), V = await signupApi("av");
  backendScript("prisma/make-admin.js", A.username);
  const bad = (await api("POST", `/programs/${PUB}/comments`, { body: `e2e reported ${n}` }, U.token)).data;
  await api("POST", `/comments/${bad.id}/reports`, { reason: `e2e reason ${n}` }, V.token);
  await api("POST", "/submissions", { kind: "NEW_LISTING_LEAD", body: `e2e lead ${n}` }, U.token);

  await test.step("non-admin: no link, redirected away", async () => {
    const vp = await (await browser.newContext({ baseURL: test.info().project.use.baseURL })).newPage();
    await login(vp, V);
    await expect(vp.locator(".navbar").getByText("Admin")).toHaveCount(0);
    await vp.goto("/admin");
    await vp.waitForURL((u) => !u.pathname.startsWith("/admin"));
    await vp.close();
  });

  page.on("dialog", (d) => d.accept());
  const errors = watchConsole(page);
  await login(page, A);
  await page.locator(".navbar").getByRole("link", { name: "Admin" }).click();
  await expect(page.locator(".admin-tab.active .admin-count")).toBeVisible();

  await test.step("reports: hide with reason", async () => {
    const item = page.locator(".admin-item", { hasText: `e2e reported ${n}` });
    await expect(item.getByText(`e2e reason ${n}`)).toBeVisible();
    await expect(item.getByRole("button", { name: "Hide comment" })).toBeDisabled();
    await item.getByPlaceholder("Reason for hiding (admin-only)").fill("e2e hide");
    await item.getByRole("button", { name: "Hide comment" }).click();
    await expect(item).toHaveCount(0);
    const pubView = (await api("GET", `/programs/${PUB}/comments`)).data.comments.find((c) => c.id === bad.id);
    expect(pubView.hidden).toBe(true);
  });

  await test.step("submissions: reject with note", async () => {
    await page.getByRole("tab", { name: /Submissions/ }).click();
    expect(page.url()).toContain("tab=submissions");
    const s = page.locator(".admin-item", { hasText: `e2e lead ${n}` });
    await s.getByPlaceholder(/Note to the submitter/).fill("Not open to veterans");
    await s.getByRole("button", { name: "Reject" }).click();
    await expect(s).toHaveCount(0);
    const mine = (await api("GET", "/submissions/mine", null, U.token)).data.find((x) => x.body === `e2e lead ${n}`);
    expect([mine.status, mine.adminNote]).toEqual(["REJECTED", "Not open to veterans"]);
  });

  await test.step("users: suspend, unsuspend, reset link", async () => {
    await page.getByRole("tab", { name: "Users" }).click();
    await page.getByPlaceholder("Username or email").fill(U.username.toLowerCase());
    await page.getByRole("button", { name: "Search" }).click();
    const row = page.locator(".admin-item", { hasText: U.email });
    await row.getByRole("button", { name: "Suspend" }).click();
    await expect(row.getByText("suspended")).toBeVisible();
    expect((await api("GET", "/auth/me", null, U.token)).data.suspended).toBe(true);
    await row.getByRole("button", { name: "Unsuspend" }).click();
    await expect(row.getByRole("button", { name: "Suspend" })).toBeVisible();
    await row.getByRole("button", { name: "Generate reset link" }).click();
    await expect(row.getByLabel("Reset link")).toHaveValue(/\/reset-password\?token=/);
  });

  await test.step("drafts: awaiting research has no Approve; checklist gates publish", async () => {
    await page.getByRole("tab", { name: /Drafts to review/ }).click();
    const oracle = page.locator(".admin-item", { hasText: "Awaiting research" });
    await expect(oracle.getByRole("button", { name: "Approve & publish" })).toHaveCount(0);
    await expect(oracle.getByRole("button", { name: "Reject…" })).toHaveCount(1);
    const mssa = page.locator(".admin-item", { has: page.locator("h2", { hasText: "Microsoft" }) });
    const approve = mssa.getByRole("button", { name: "Approve & publish" });
    await expect(approve).toBeDisabled();
    const boxes = mssa.locator(".checklist input[type=checkbox]");
    for (let i = 0; i < (await boxes.count()); i++) await boxes.nth(i).check();
    await expect(approve).toBeEnabled();
    await approve.click();
    await expect(mssa).toHaveCount(0);
    expect((await api("GET", "/programs/microsoft-mssa")).status).toBe(200);
  });

  await test.step("drafts: reject → Rejected tab → return to drafts", async () => {
    const item = page.locator(".admin-item", { has: page.locator("h2", { hasText: "Fortinet" }) });
    await item.getByRole("button", { name: "Reject…" }).click();
    await expect(item.getByRole("button", { name: "Reject draft" })).toBeDisabled();
    await item.getByPlaceholder("What's wrong? (admin-only)").fill(`e2e reject ${n}`);
    await item.getByRole("button", { name: "Reject draft" }).click();
    await expect(item).toHaveCount(0);
    expect((await api("GET", "/programs/fortinet-veterans")).status).toBe(404);
    await page.getByRole("tab", { name: "Rejected" }).click();
    const r = page.locator(".admin-item", { hasText: `e2e reject ${n}` });
    await r.getByRole("button", { name: "Return to drafts" }).click();
    await expect(r).toHaveCount(0);
    await page.getByRole("tab", { name: /Drafts to review/ }).click();
    await expect(page.locator(".admin-item h2", { hasText: "Fortinet" })).toBeVisible();
  });

  expect(errors).toEqual([]);
});
