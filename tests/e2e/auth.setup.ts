import fs from "fs";
import path from "path";

import { test as setup } from "@playwright/test";

import { AUTH_STATE } from "../../playwright.config";

const TEST_EMAIL = "e2etest@playwright.local";
const TEST_PASSWORD = "PlaywrightTest123!";

setup("authenticate test user", async ({ page, request }) => {
  fs.mkdirSync(path.dirname(AUTH_STATE), { recursive: true });

  // Try signup — ok if it fails (user already exists or signup is disabled)
  await request.post("/api/auth/signup", {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD, name: "E2E Test" },
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill(TEST_EMAIL);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL("/", { timeout: 15_000 });

  await page.context().storageState({ path: AUTH_STATE });
});
