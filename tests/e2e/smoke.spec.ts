import { expect, test } from "@playwright/test";

test("homepage introduces the practice without borrowed facts", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Spine care, carefully aligned." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Contact the practice" }).first()).toBeVisible();
  await expect(page.getByText("Orthopedic spine surgery").first()).toBeVisible();
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/Big Apple|Medipark|Zocdoc|Arutyunyan|14 Wall|646-216-6222/i);
});

test("draft clinical page explains emergencies and stays out of the public index", async ({ page }) => {
  await page.goto("/preview/conditions/neck-pain");
  await expect(page.getByRole("heading", { level: 1, name: "Neck pain" })).toBeVisible();
  await expect(page.getByText("Emergency care", { exact: true })).toBeVisible();
  await expect(page.getByText("Draft preview")).toBeVisible();

  await page.goto("/conditions/neck-pain");
  await expect(page.getByRole("heading", { level: 1, name: "This page is not on the site." })).toBeVisible();
});

test("contact form refuses medical details", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByText("Do not include medical information")).toBeVisible();
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByLabel("Note, optional").fill("I have severe back pain after surgery");
  await page.getByRole("button", { name: "Submit inquiry" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "medical information" })).toBeVisible();
});

test("missing pages use the custom 404", async ({ page }) => {
  await page.goto("/this-page-does-not-exist");
  await expect(page.getByRole("heading", { name: "This page is not on the site." })).toBeVisible();
});

test("admin is behind a login wall", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("heading", { name: /Staff sign-in|Sign in|Demo sign-in|Supabase is not connected/ })).toBeVisible();
});
