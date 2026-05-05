import { expect, test } from "@playwright/test";

import { AUTH_STATE } from "../../playwright.config";

test.use({ storageState: AUTH_STATE });

test.describe("header navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for workspace shell to load
    await expect(page.getByPlaceholder("Search boards…")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("navigates to /tasks via header link", async ({ page }) => {
    await page.getByRole("link", { name: "Tasks" }).click();
    await expect(page).toHaveURL(/\/tasks/);
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  });

  test("navigates to /core via header link", async ({ page }) => {
    await page.getByRole("link", { name: "Core" }).click();
    await expect(page).toHaveURL(/\/core/);
  });

  test("navigates back to / from tasks", async ({ page }) => {
    await page.goto("/tasks");
    await page.getByRole("link", { name: "Board" }).click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("sign out", () => {
  test("sign out redirects to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByPlaceholder("Search boards…")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByTitle(/Sign out/).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

test.describe("core files editor", () => {
  test("renders core file tabs", async ({ page }) => {
    await page.goto("/core");
    // The core editor should show the CORE.md nav link
    await expect(
      page.getByRole("link", { name: "CORE.md" }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
