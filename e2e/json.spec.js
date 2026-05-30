import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/#json");
  await expect(page.locator("#json")).toBeVisible();
});

test("Pretty форматирует JSON", async ({ page }) => {
  await page.fill("#jsonInput", '{"a":1,"b":[2,3]}');
  await page.click("#btnPretty");
  const out = page.locator("#jsonOutput");
  await expect(out).toContainText('"a"');
  await expect(out).toContainText('"b"');
  await expect(page.locator("#btnCopyJson")).toBeEnabled();
});

test("Minify убирает пробелы", async ({ page }) => {
  await page.fill("#jsonInput", '{\n  "a": 1\n}');
  await page.click("#btnMinify");
  await expect(page.locator("#jsonOutput")).toContainText('{"a":1}');
});

test("пустой ввод показывает уведомление", async ({ page }) => {
  await page.click("#btnPretty");
  await expect(
    page.locator(".notification", { hasText: "Вставьте JSON" })
  ).toBeVisible();
});

test("Числа → value собирает JSON-массив", async ({ page }) => {
  await page.fill("#jsonInput", "28351 123, 9");
  await page.check('input[name="jsonMode"][value="wrapper"]');
  await expect(page.locator("#btnWrapNumbers")).toBeVisible();
  await page.click("#btnWrapNumbers");

  const out = page.locator("#jsonOutput");
  await expect(out).toContainText('{"value": "28351"}');
  await expect(out).toContainText('{"value": "123"}');
  await expect(out).toContainText('{"value": "9"}');
});

test("Unwrap разворачивает обёртки {value} внутри массива", async ({ page }) => {
  await page.fill("#jsonInput", '{"payment_ids":[{"value":"22341"}]}');
  await page.check('input[name="jsonMode"][value="wrapper"]');
  await page.click("#btnUnwrap");

  const out = page.locator("#jsonOutput");
  await expect(out).toContainText("22341");
  await expect(out).not.toContainText("value");
});
