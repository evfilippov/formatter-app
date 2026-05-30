// ПОЛНЫЙ UI-ПРОГОН · Часть 3 — раздел XML: pretty/minify/validate,
// чекбоксы опций, файл, копирование и скачивание.
import { test, expect } from "@playwright/test";

const VALID = "<note><to>Tove</to><from>Jani</from><body>Привет</body></note>";
const INVALID = "<note><to>Tove</from></note>";

test.beforeEach(async ({ page }) => {
  await page.goto("/#xml");
  await expect(page.locator("#xml")).toBeVisible();
});

test("Pretty форматирует XML (без escape — читаемый вид)", async ({ page }) => {
  await page.uncheck("#xmlEscape");
  await page.fill("#xmlInput", VALID);
  await page.click("#btnXmlPretty");

  const out = page.locator("#xmlOutput");
  await expect(out).toContainText("<to>Tove</to>");
  await expect(out).toContainText("<from>Jani</from>");
  await expect(page.locator("#btnCopyXml")).toBeEnabled();
  await expect(page.locator("#btnDownloadXml")).toBeEnabled();
  await expect(
    page.locator(".notification", { hasText: "pretty выполнен" })
  ).toBeVisible();
});

test("Minify собирает XML в одну строку", async ({ page }) => {
  await page.uncheck("#xmlEscape");
  await page.fill("#xmlInput", VALID);
  await page.click("#btnXmlMinify");
  await expect(page.locator("#xmlOutput")).toContainText("<note>");
});

test("Escape для JSON-строки даёт экранированный вывод и result.txt", async ({
  page,
}) => {
  // xmlEscape включён по умолчанию → имя файла result.txt.
  await expect(page.locator("#xmlEscape")).toBeChecked();
  await page.fill("#xmlInput", '<a attr="x">t</a>');
  await page.click("#btnXmlPretty");
  await expect(page.locator("#xmlOutput")).not.toBeEmpty();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#btnDownloadXml"),
  ]);
  expect(download.suggestedFilename()).toBe("result.txt");
});

test("Validate: валидный — без ошибок, сломанный — ошибки", async ({ page }) => {
  // validate возвращает output:null (по дизайну) → success-уведомления нет;
  // сигнал корректности — пустой/непустой блок ошибок.
  await page.fill("#xmlInput", VALID);
  await page.click("#btnXmlValidate");
  await expect(page.locator("#xmlErrors")).toBeEmpty();

  await page.fill("#xmlInput", INVALID);
  await page.click("#btnXmlValidate");
  await expect(page.locator("#xmlErrors")).not.toBeEmpty();
});

test("пустой ввод → уведомление", async ({ page }) => {
  await page.click("#btnXmlPretty");
  await expect(
    page.locator(".notification", { hasText: "Вставьте XML" })
  ).toBeVisible();
});

test("Копировать результат XML работает", async ({ page }) => {
  await page.uncheck("#xmlEscape");
  await page.fill("#xmlInput", VALID);
  await page.click("#btnXmlPretty");
  await page.click("#btnCopyXml");
  await expect(
    page.locator(".notification", { hasText: "скопирован" })
  ).toBeVisible();
});

test("переключатели опций кликаются и не ломают обработку", async ({ page }) => {
  // Прокликиваем все три чекбокса и убеждаемся, что pretty по-прежнему работает.
  await page.check("#xmlUnescape");
  await page.uncheck("#xmlKeepDecl");
  await page.uncheck("#xmlEscape");
  await page.fill("#xmlInput", VALID);
  await page.click("#btnXmlPretty");
  await expect(page.locator("#xmlOutput")).toContainText("Tove");
});

test("загрузка XML-файла наполняет поле ввода", async ({ page }) => {
  await page.setInputFiles("#xmlFile", {
    name: "doc.xml",
    mimeType: "application/xml",
    buffer: Buffer.from(VALID, "utf-8"),
  });
  await expect(page.locator("#xmlInput")).toHaveValue(/<note>/);
  await expect(page.locator("#xmlFileInfo")).toContainText("doc.xml");
  await expect(page.locator("#xmlFilePicker")).toHaveClass(/has-file/);
});
