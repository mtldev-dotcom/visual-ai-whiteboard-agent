import { expect, test } from "@playwright/test";

import { AUTH_STATE } from "../../playwright.config";

test.use({ storageState: AUTH_STATE });

test.describe("tasks page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tasks");
  });

  test("renders Tasks heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Tasks" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows New task button", async ({ page }) => {
    await expect(page.getByRole("button", { name: "New task" })).toBeVisible();
  });

  test("opens task creation form", async ({ page }) => {
    await page.getByRole("button", { name: "New task" }).click();
    await expect(page.getByPlaceholder("Task title")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add task" })).toBeVisible();
  });

  test("creates a task", async ({ page }) => {
    const title = `E2E Task ${Date.now()}`;

    await page.getByRole("button", { name: "New task" }).click();
    await page.getByPlaceholder("Task title").fill(title);
    await page.getByRole("button", { name: "Add task" }).click();

    await expect(
      page.getByRole("heading", { name: title }),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("marks a task complete", async ({ page }) => {
    const title = `Complete Me ${Date.now()}`;

    // Create the task first
    await page.getByRole("button", { name: "New task" }).click();
    await page.getByPlaceholder("Task title").fill(title);
    await page.getByRole("button", { name: "Add task" }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible({
      timeout: 8_000,
    });

    // Complete it
    const taskCard = page.getByRole("heading", { name: title }).locator("..");
    await taskCard
      .locator("..")
      .getByRole("button", { name: "Mark complete" })
      .click();

    await expect(
      page.getByRole("heading", { name: title }),
    ).not.toBeVisible({ timeout: 8_000 });
  });

  test("cancel button hides form", async ({ page }) => {
    await page.getByRole("button", { name: "New task" }).click();
    await expect(page.getByPlaceholder("Task title")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByPlaceholder("Task title")).not.toBeVisible();
  });
});
