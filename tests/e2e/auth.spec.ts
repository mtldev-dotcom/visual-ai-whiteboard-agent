import { expect, test } from "@playwright/test";

// Auth tests run without stored session
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("unauthenticated redirect", () => {
  test("/ redirects to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/tasks redirects to /login", async ({ page }) => {
    await page.goto("/tasks");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/core redirects to /login", async ({ page }) => {
    await page.goto("/core");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("shows login form", async ({ page }) => {
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in" }),
    ).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByText("Invalid email or password"),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("stays on /login after failed attempt", async ({ page }) => {
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForTimeout(2_000);
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("signup page", () => {
  test("shows signup form when signup is enabled", async ({ page }) => {
    await page.goto("/signup");
    // If signup is disabled the page shows a sign-in link instead of a form
    const hasForm = await page
      .getByRole("button", { name: "Create account" })
      .isVisible()
      .catch(() => false);
    const hasDisabledMsg = await page
      .getByText("New account creation is currently disabled")
      .isVisible()
      .catch(() => false);
    expect(hasForm || hasDisabledMsg).toBe(true);
  });
});
