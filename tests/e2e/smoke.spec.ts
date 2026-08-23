import { expect, test } from "@playwright/test";

test("protected dashboard redirects unauthenticated users to home", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Login to your account" })
  ).toBeVisible();
});

test("login route redirects to home", async ({ page }) => {
  await page.goto("/login");

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Login to your account" })
  ).toBeVisible();
});

test("root renders login shell for unauthenticated users", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Login to your account" })
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});
