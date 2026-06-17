import { test, expect } from "@playwright/test";

test("login page renders the sign-in form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
});

test("unauthenticated user is redirected from a protected route", async ({ page }) => {
  await page.goto("/some-org/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("signup page validates a weak password", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Test User");
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Password").fill("weak");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
});
