// Discussion: read-only when logged out, threading and depth cap, removed
// placeholder, posting (plain text), replies, reports, suggestions,
// load more, and the username gate.
import { test, expect } from "@playwright/test";
import { api, signupApi, unique, backendScript, login, watchConsole } from "./helpers.js";

const PUB = "vetswhocode-accelerator";
const ARCH = "hoh-corporate-fellowship";

test("discussion, reports and suggestions", async ({ page, browser }) => {
  const errors = watchConsole(page);
  const n = unique();
  const A = await signupApi("ca"), B = await signupApi("cb"), E = await signupApi("ce");
  const post = (body, tok, parentId) => api("POST", `/programs/${PUB}/comments`, { body, parentId }, tok);

  // a removed comment with a reply, and a reply chain 5 deep
  const removed = (await post("to be removed", A.token)).data;
  await post("reply under removed", B.token, removed.id);
  backendScript("test/integration/e2e-seed.js", "hide", removed.id);
  let parent = (await post("depth 0", B.token)).data;
  for (let d = 1; d <= 4; d++) parent = (await post(`depth ${d}`, d % 2 ? A.token : B.token, parent.id)).data;
  // 21 comments on the archived listing → two pages
  backendScript("test/integration/e2e-seed.js", "comments", ARCH, "21", A.email);

  await test.step("logged out: read-only", async () => {
    await page.goto(`/programs/${PUB}`);
    await expect(page.locator(".comment").first()).toBeVisible();
    // The removed comment keeps its place; its reply stays visible under it.
    const removedNode = page.locator(".comment", { hasText: "reply under removed" }).first();
    await expect(removedNode.locator(":scope > article")).toContainText("Removed by admin");
    await expect(removedNode.locator(".comment-replies")).toContainText("reply under removed");
    await expect(page.locator(".composer-gate")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Reply" })).toHaveCount(0);
  });

  await test.step("continue thread past 3 levels", async () => {
    await page.locator(".thread-link", { hasText: "Continue thread" }).first().click();
    await page.waitForURL(/\/comments\//);
    await expect(page.getByText("depth 4")).toBeVisible();
    await expect(page.getByText("View parent comment")).toBeVisible();
  });

  const p = await (await browser.newContext({ baseURL: test.info().project.use.baseURL })).newPage();
  const pErrors = watchConsole(p);
  await login(p, E);

  await test.step("post: shown as plain text, no Report on own", async () => {
    await p.goto(`/programs/${PUB}`);
    await p.locator(".discussion > .composer textarea").fill(`<b>not bold</b> e2e ${n}`);
    await p.getByRole("button", { name: "Post comment" }).click();
    const mine = p.locator(".comment", { hasText: `e2e ${n}` }).first();
    await expect(mine.locator(".comment-meta strong").first()).toHaveText(E.username);
    await expect(mine.locator(".comment-text b")).toHaveCount(0);
    await expect(mine.locator(".comment-text").first()).toContainText("<b>not bold</b>");
    await expect(mine.locator(":scope > article").getByRole("button", { name: "Report" })).toHaveCount(0);
  });

  await test.step("reply nests; report confirms", async () => {
    const other = p.locator(".comment", { hasText: "depth 0" }).first();
    await other.locator(":scope > article").getByRole("button", { name: "Reply" }).click();
    await other.locator(".composer textarea").fill(`reply ${n}`);
    await other.locator(".composer").getByRole("button", { name: "Reply" }).click();
    await expect(p.locator(".comment-replies .comment", { hasText: `reply ${n}` })).toBeVisible();
    await other.locator(":scope > article").getByRole("button", { name: "Report" }).click();
    await other.locator(".report-form textarea").fill("e2e report");
    await other.getByRole("button", { name: "Send report" }).click();
    await expect(other.getByText("Reported. An admin will review it.")).toBeVisible();
  });

  await test.step("suggest an update and a new program", async () => {
    await p.getByRole("link", { name: "Suggest an update" }).click();
    await p.waitForURL(/\/suggest\?program=/);
    await expect(p.locator(".program-name")).toBeVisible();
    await p.fill('textarea[name="body"]', `Cohort date moved ${n}`);
    await p.fill('input[name="sourceUrl"]', "https://example.org/news");
    await p.getByRole("button", { name: "Send suggestion" }).click();
    await expect(p.getByText("Thanks, it's in")).toBeVisible();
    await p.getByRole("link", { name: "your submissions" }).click();
    await expect(p.locator(".employer-card", { hasText: `Cohort date moved ${n}` })).toContainText("Pending review");
    await p.goto("/suggest");
    await p.fill('textarea[name="body"]', `New program lead ${n}`);
    await p.getByRole("button", { name: "Send suggestion" }).click();
    await expect(p.getByText("Thanks, it's in")).toBeVisible();
  });

  await test.step("load more on a long discussion", async () => {
    await p.goto(`/programs/${ARCH}`);
    await expect(p.locator(".comment-list > .comment")).toHaveCount(20);
    await p.getByRole("button", { name: "Load more comments" }).click();
    await expect(p.locator(".comment-list > .comment")).toHaveCount(21);
  });

  await test.step("username gate returns to the listing", async () => {
    const q = await (await browser.newContext({ baseURL: test.info().project.use.baseURL })).newPage();
    await login(q, { email: "legacy@example.com", password: "legacy-pass-1" });
    await q.goto(`/programs/${PUB}`);
    // Earlier specs may have given the fixture account a username already.
    if (await q.getByRole("link", { name: "Choose a username" }).count()) {
      await q.getByRole("link", { name: "Choose a username" }).click();
      await q.fill("input", `Fresh_${n}`.slice(0, 20));
      await q.getByRole("button", { name: "Save username" }).click();
      await q.waitForURL(new RegExp(`/programs/${PUB}$`));
    }
    await expect(q.locator(".discussion > .composer textarea")).toBeVisible();
  });

  expect([...errors, ...pErrors]).toEqual([]);
});
