// ПОЛНЫЙ UI-ПРОГОН · Часть 1 — навигация, сайдбар, тема, главная.
// Запуск: npm run test:ui-full  (видимый браузер + замедление).
import { test, expect } from "@playwright/test";

test.describe("Навигация и оболочка", () => {
  test("сайдбар переключает все разделы и подсвечивает активный пункт", async ({
    page,
  }) => {
    await page.goto("/#home");
    await expect(page.locator("#home")).toBeVisible();

    const routes = [
      { route: "logs", section: "#logs" },
      { route: "json", section: "#json" },
      { route: "xml", section: "#xml" },
      { route: "home", section: "#home" },
    ];

    for (const { route, section } of routes) {
      const link = page.locator(`.sidebar-nav a[data-route="${route}"]`);
      await link.click();
      await expect(page.locator(section)).toBeVisible();
      await expect(link).toHaveClass(/active/);
    }
  });

  test("карточки на главной ведут в Logs / JSON / XML", async ({ page }) => {
    await page.goto("/#home");

    const cards = page.locator(".home-cards .card");
    await expect(cards).toHaveCount(3);

    await cards.nth(0).click();
    await expect(page.locator("#logs")).toBeVisible();
    await page.goto("/#home");

    await cards.nth(1).click();
    await expect(page.locator("#json")).toBeVisible();
    await page.goto("/#home");

    await cards.nth(2).click();
    await expect(page.locator("#xml")).toBeVisible();
  });

  test("переключатель темы: тёмная ⇄ светлая (с подписью и иконкой)", async ({
    page,
  }) => {
    await page.goto("/#home");
    const html = page.locator("html");
    const label = page.locator("#themeToggleLabel");

    // По умолчанию — тёмная.
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(label).toHaveText("Тёмная тема");

    // Клик → светлая.
    await page.click("#themeToggle");
    await expect(html).toHaveAttribute("data-theme", "light");
    await expect(label).toHaveText("Светлая тема");
    await expect(page.locator("#themeToggleIcon")).toHaveText("☀");

    // Клик → обратно тёмная.
    await page.click("#themeToggle");
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(label).toHaveText("Тёмная тема");
  });
});
