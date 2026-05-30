// ПОЛНЫЙ UI-ПРОГОН · Часть 2 — раздел JSON: все кнопки обоих режимов,
// валидные/невалидные данные, файл, копирование и скачивание.
import { test, expect } from "@playwright/test";

const VALID = '{"user":{"id":42,"name":"Иван","active":true,"tags":[1,2,3],"note":null}}';
const INVALID = '{"a": , bad}';

test.beforeEach(async ({ page }) => {
  await page.goto("/#json");
  await expect(page.locator("#json")).toBeVisible();
});

test.describe("JSON · режим форматирования", () => {
  test("Pretty форматирует и активирует копирование/скачивание", async ({
    page,
  }) => {
    await page.fill("#jsonInput", VALID);
    await page.click("#btnPretty");

    const out = page.locator("#jsonOutput");
    await expect(out).toContainText('"name"');
    await expect(out).toContainText('"Иван"');
    // Подсветка синтаксиса: есть токены ключей/строк.
    await expect(out.locator(".tok-key").first()).toBeVisible();
    await expect(page.locator("#btnCopyJson")).toBeEnabled();
    await expect(page.locator("#btnDownloadJson")).toBeEnabled();
    await expect(page.locator("#jsonStats")).toContainText("Вход:");
    await expect(
      page.locator(".notification", { hasText: "pretty выполнен" })
    ).toBeVisible();
  });

  test("Minify собирает в одну строку", async ({ page }) => {
    await page.fill("#jsonInput", VALID);
    await page.click("#btnMinify");
    await expect(page.locator("#jsonOutput")).toContainText('{"user":{');
  });

  test("Validate: валидный — без ошибок, сломанный — ошибки", async ({
    page,
  }) => {
    // validate возвращает output:null (по дизайну) → success-уведомления нет;
    // сигнал корректности — пустой/непустой блок ошибок.
    await page.fill("#jsonInput", VALID);
    await page.click("#btnValidate");
    await expect(page.locator("#jsonErrors")).toBeEmpty();

    await page.fill("#jsonInput", INVALID);
    await page.click("#btnValidate");
    await expect(page.locator("#jsonErrors")).not.toBeEmpty();
  });

  test("пустой ввод → уведомление", async ({ page }) => {
    await page.click("#btnPretty");
    await expect(
      page.locator(".notification", { hasText: "Вставьте JSON" })
    ).toBeVisible();
  });

  test("Копировать и Скачать результат работают", async ({ page }) => {
    await page.fill("#jsonInput", VALID);
    await page.click("#btnPretty");

    await page.click("#btnCopyJson");
    await expect(
      page.locator(".notification", { hasText: "скопирован" })
    ).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click("#btnDownloadJson"),
    ]);
    expect(download.suggestedFilename()).toBe("result.json");
  });

  test("загрузка JSON-файла наполняет поле ввода", async ({ page }) => {
    await page.setInputFiles("#jsonFile", {
      name: "sample.json",
      mimeType: "application/json",
      buffer: Buffer.from(VALID, "utf-8"),
    });
    await expect(page.locator("#jsonInput")).toHaveValue(/"user"/);
    await expect(page.locator("#jsonFileInfo")).toContainText("sample.json");
    await expect(page.locator("#jsonFilePicker")).toHaveClass(/has-file/);
  });
});

test.describe("JSON · режим Value Wrapper", () => {
  test.beforeEach(async ({ page }) => {
    await page.check('input[name="jsonMode"][value="wrapper"]');
    // Кнопки форматирования прячутся, появляются кнопки обёртки.
    await expect(page.locator("#formatButtons")).toBeHidden();
    await expect(page.locator("#wrapperButtons")).toBeVisible();
    await expect(page.locator("#jsonModeHint")).toContainText("Wrap");
  });

  test("Wrap оборачивает значения в {value}", async ({ page }) => {
    await page.fill("#jsonInput", '{"a":1,"b":"x"}');
    await page.click("#btnWrap");
    await expect(page.locator("#jsonOutput")).toContainText("value");
    await expect(page.locator("#btnCopyJson")).toBeEnabled();
  });

  test("Unwrap разворачивает обёртки {value} внутри массива", async ({
    page,
  }) => {
    await page.fill("#jsonInput", '{"ids":[{"value":"22341"},{"value":"99"}]}');
    await page.click("#btnUnwrap");
    const out = page.locator("#jsonOutput");
    await expect(out).toContainText("22341");
    await expect(out).not.toContainText("value");
  });

  test("Числа → value собирает JSON-массив из любых чисел", async ({ page }) => {
    await page.fill("#jsonInput", "28351 123; 9 \n 777");
    await page.click("#btnWrapNumbers");
    const out = page.locator("#jsonOutput");
    await expect(out).toContainText('{"value": "28351"}');
    await expect(out).toContainText('{"value": "777"}');
    await expect(page.locator("#jsonStats")).toContainText("Обёрнуто чисел: 4");
  });
});
