import { expect, test } from "@playwright/test";

test("protected dashboard redirects unauthenticated users to login", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "AEGIS" })).toBeVisible();
});

test("login page renders the production shell", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "AEGIS" })).toBeVisible();
  await expect(page.getByText("Secure Access")).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});
