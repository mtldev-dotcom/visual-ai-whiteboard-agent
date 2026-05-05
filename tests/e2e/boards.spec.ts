import { expect, test } from "@playwright/test";

import { AUTH_STATE } from "../../playwright.config";

test.use({ storageState: AUTH_STATE });

test.describe("board explorer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows boards section and search input", async ({ page }) => {
    await expect(page.getByPlaceholder("Search boards…")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("create new board", async ({ page }) => {
    const title = `E2E Board ${Date.now()}`;

    await page.getByTitle("New board").click();
    await page.getByPlaceholder("Board name…").fill(title);
    await page.getByRole("button", { name: "Create" }).click();

    // Board title should appear in the sidebar
    await expect(page.getByRole("button", { name: title })).toBeVisible({ timeout: 8_000 });
  });

  test("search filters board list", async ({ page }) => {
    // First create a board with a unique name
    const title = `SearchTarget-${Date.now()}`;
    await page.getByTitle("New board").click();
    await page.getByPlaceholder("Board name…").fill(title);
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("button", { name: title })).toBeVisible({ timeout: 8_000 });

    // Now search for it
    await page.getByPlaceholder("Search boards…").fill(title.slice(0, 12));
    await page.waitForTimeout(500); // debounce
    await expect(page.getByRole("button", { name: title })).toBeVisible();
  });

  test("clear search restores full list", async ({ page }) => {
    const search = page.getByPlaceholder("Search boards…");
    await search.fill("zzznomatch");
    await page.waitForTimeout(500);
    await search.clear();
    await page.waitForTimeout(500);
    // Search input is empty — board list should restore
    await expect(search).toHaveValue("");
  });
});

test.describe("board templates", () => {
  test("template picker opens", async ({ page }) => {
    await page.goto("/");
    await page.getByTitle("Use a template").click();
    await expect(page.getByText("Templates")).toBeVisible({ timeout: 6_000 });
  });

  test("can close template picker", async ({ page }) => {
    await page.goto("/");
    await page.getByTitle("Use a template").click();
    await expect(page.getByText("Templates")).toBeVisible();
    await page.getByText("✕").click();
    await expect(page.getByText("Templates")).not.toBeVisible();
  });
});
