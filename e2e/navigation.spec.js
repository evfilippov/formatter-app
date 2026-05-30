import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("главная показывает карточки Логи / JSON / XML", async ({ page }) => {
  // Подписи берутся из словаря (core/strings.js) через data-i18n; карточка
  // логов выровнена на RU — «Логи» (раньше было «Logs»).
  await expect(page.locator(".home-cards .card", { hasText: "Логи" })).toBeVisible();
  await expect(page.locator(".home-cards .card", { hasText: "JSON" })).toBeVisible();
  await expect(page.locator(".home-cards .card", { hasText: "XML" })).toBeVisible();
});

test("сайдбар переключает разделы", async ({ page }) => {
  await page.click('.sidebar-nav a[data-route="json"]');
  await expect(page.locator("#json")).toBeVisible();
  await expect(page.locator("#xml")).toBeHidden();

  await page.click('.sidebar-nav a[data-route="xml"]');
  await expect(page.locator("#xml")).toBeVisible();
  await expect(page.locator("#json")).toBeHidden();
});

test("переключатель темы меняет data-theme", async ({ page }) => {
  const html = page.locator("html");
  const before = await html.getAttribute("data-theme");
  await page.click("#themeToggle");
  await expect(html).not.toHaveAttribute("data-theme", before ?? "dark");
});
