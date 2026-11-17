// Admin tools on the browse pages: edit in the popup, archive/unarchive and
// remove from the listing page, restore from Admin → Removed, edit an
// organization, permanent delete of an unused listing, then of the empty
// organization. Uses its own listing and organization so other suites'
// data is untouched.
import { test, expect } from "@playwright/test";
import { api, signupApi, unique, backendScript, login, watchConsole } from "./helpers.js";

test("admin manages listings and organizations from the browse pages", async ({ page, browser }) => {
  const n = unique();
  const name = `E2E Manage ${n}`;
  const orgName = `E2E Org ${n}`;
  const A = await signupApi("mgr");
  backendScript("prisma/make-admin.js", A.username);

  // A published listing in a new organization, created through the API.
  const created = await api("POST", "/admin/listings", {
    newOrganization: { name: orgName },
    name,
    description: "A program used by the manage e2e test.",
    veteranAccessRoute: "Veterans apply directly on the official page.",
    officialSourceUrl: "https://example.org/manage",
    format: "TRAINING",
    techTracks: ["DATA"],
    verifiedOn: new Date().toISOString().slice(0, 10),
    confirmVeteranRoute: true,
  }, A.token);
  expect(created.status).toBe(201);
  const { id, slug } = created.data;
  const draft = (await api("GET", "/admin/drafts", null, A.token)).data.find((d) => d.id === id);
  expect((await api("POST", `/admin/drafts/${id}/publish`, { contentHash: draft.contentHash }, A.token)).status).toBe(200);
  const orgSlug = (await api("GET", `/programs/${slug}`)).data.organization.slug;

  await test.step("visitors see no admin tools", async () => {
    const vp = await (await browser.newContext({ baseURL: test.info().project.use.baseURL })).newPage();
    await vp.goto(`/programs/${slug}`);
    await expect(vp.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(vp.locator(".admin-bar")).toHaveCount(0);
    await vp.close();
  });

  page.on("dialog", (d) => d.accept());
  const errors = watchConsole(page);
  await login(page, A);

  await test.step("edit in the browse popup; the popup shows the change", async () => {
    await page.goto(`/programs?q=${encodeURIComponent(name)}`);
    await page.locator(".tile .card-title-link", { hasText: name }).click();
    const modal = page.locator("dialog.program-modal");
    await modal.locator(".admin-bar").getByRole("button", { name: "Edit" }).click();
    await expect(modal.getByText("This listing is live.")).toBeVisible();
    await modal.getByLabel("Cost").fill("Free (e2e edit)");
    await modal.getByLabel(/I read the official page/).check();
    await modal.getByRole("button", { name: "Save changes" }).click();
    await expect(modal.getByText("Free (e2e edit)")).toBeVisible();
    await expect(page.getByRole("status")).toHaveText(`Updated "${name}".`);
  });

  await test.step("archive from the popup: leaves Browse", async () => {
    const modal = page.locator("dialog.program-modal");
    await modal.getByRole("button", { name: "Archive…" }).click();
    await modal.getByLabel("Why it's archived (shown publicly)").fill("Applications closed for good (e2e).");
    await modal.getByRole("button", { name: "Archive", exact: true }).click();
    await expect(modal).toHaveCount(0);
    await expect(page.getByRole("status")).toContainText(`Archived "${name}"`);
    await expect(page.locator(".tile", { hasText: name })).toHaveCount(0);
  });

  await test.step("unarchive from the listing page", async () => {
    await page.goto(`/programs/${slug}`);
    await expect(page.locator(".archived-banner")).toContainText("Applications closed for good (e2e).");
    await page.getByRole("button", { name: "Unarchive" }).click();
    await expect(page.getByRole("status")).toContainText("back in Browse");
    await expect(page.locator(".archived-banner")).toHaveCount(0);
  });

  await test.step("delete is blocked while a user has saved it; remove instead", async () => {
    const U = await signupApi("mgu");
    expect((await api("POST", "/saved-employers", { programId: id }, U.token)).status).toBe(201);
    await page.reload();
    await expect(page.getByRole("button", { name: "Delete permanently" })).toBeDisabled();
    await expect(page.locator(".admin-bar-note")).toContainText("Remove it instead");
    await page.getByRole("button", { name: "Remove" }).click();
    await page.waitForURL(/\/programs$/);
    await expect(page.getByRole("status")).toContainText(`Removed "${name}"`);
    expect((await api("GET", `/programs/${slug}`)).status).toBe(404);
    const saved = (await api("GET", "/dashboard", null, U.token)).data.savedPrograms.find((s) => s.program.id === id);
    expect(saved.program.publishStatus).toBe("REMOVED");
    // The user drops it, so it becomes deletable later.
    expect((await api("DELETE", `/saved-employers/program/${id}`, null, U.token)).status).toBe(204);
  });

  await test.step("restore from Admin → Removed", async () => {
    await page.goto("/admin?tab=removed");
    const item = page.locator(".admin-item", { hasText: name });
    await expect(item).toContainText("was published");
    await item.getByRole("button", { name: "Restore" }).click();
    await expect(item).toHaveCount(0);
    expect((await api("GET", `/programs/${slug}`)).status).toBe(200);
  });

  await test.step("edit the organization; delete is blocked while it has a listing", async () => {
    await page.goto(`/organizations/${orgSlug}`);
    await page.getByRole("button", { name: "Edit organization" }).click();
    await page.getByLabel("Name *").fill(`${orgName} (edited)`);
    await page.getByLabel("Website (https://)").fill("https://example.org/org");
    await page.getByRole("button", { name: "Save organization" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${orgName} (edited)`);
    await expect(page.getByRole("link", { name: /Website/ })).toHaveAttribute("href", "https://example.org/org");
    await expect(page.getByRole("button", { name: "Delete organization" })).toBeDisabled();
    await expect(page.locator("#org-delete-note")).toContainText("1 listing");
  });

  await test.step("delete the unused listing, then the empty organization", async () => {
    await page.goto(`/programs/${slug}`);
    await page.getByRole("button", { name: "Delete permanently" }).click();
    await page.waitForURL(/\/programs$/);
    await expect(page.getByRole("status")).toContainText(`Deleted "${name}" permanently`);
    expect((await api("GET", `/admin/listings/${id}`, null, A.token)).status).toBe(404);

    // Nothing public left: only admins can open the organization page now.
    await page.goto(`/organizations/${orgSlug}`);
    await expect(page.getByText("Only admins can see this page")).toBeVisible();
    await page.getByRole("button", { name: "Delete organization" }).click();
    await page.waitForURL(/\/programs$/);
    await expect(page.getByRole("status")).toContainText("Deleted the organization");
    expect((await api("GET", `/admin/organizations/${orgSlug}`, null, A.token)).status).toBe(404);
  });

  expect(errors).toEqual([]);
});
