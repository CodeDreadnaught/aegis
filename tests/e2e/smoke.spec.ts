import { expect, test } from "@playwright/test";

test("protected dashboard redirects unauthenticated users to home", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "AEGIS" })).toBeVisible();
});

test("login route redirects to home", async ({ page }) => {
  await page.goto("/login");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "AEGIS" })).toBeVisible();
});

test("root renders login shell for unauthenticated users", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "AEGIS" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Password" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show password" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Login" })).toBeDisabled();
});

test("failed login keeps submitted fields and shows a toast", async ({ page }) => {
  await page.goto("/");

  const email = page.getByLabel("Email address");
  const password = page.getByRole("textbox", { name: "Password" });
  const login = page.getByRole("button", { name: "Login" });

  await email.fill("wrong.operator@aegis.demo");
  await expect(login).toBeDisabled();
  await password.fill("WrongPassword123!");
  await expect(login).toBeEnabled({ timeout: 10_000 });
  await login.click();

  await expect(page.locator("h2").filter({ hasText: "Sign in failed" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(email).toHaveValue("wrong.operator@aegis.demo");
  await expect(password).toHaveValue("WrongPassword123!");
});
