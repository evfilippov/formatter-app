import { test, expect } from "@playwright/test";

const SAMPLE = 'INFO internalRequest = {"id": 1, "traceId": "abc-123-xyz"}';

test("извлечение лога переводит на страницу результата и показывает карточку", async ({
  page,
}) => {
  await page.goto("/#logs");
  await page.fill("#logsInput", SAMPLE);
  await page.click("#btnNormalize");

  // После анализа — переход на страницу результатов.
  await expect(page.locator("#logsResult")).toBeVisible();
  await expect(page.locator("#logs")).toBeHidden();

  // Извлечена одна карточка с типом internalRequest.
  await expect(page.locator(".item-card")).toHaveCount(1);
  await expect(page.locator(".item-card").first()).toContainText(
    "internalRequest",
    { ignoreCase: true }
  );

  // traceId вытащен в шапку (отдельный бейдж с title="traceId: ...").
  await expect(
    page.locator('.item-card .badge[title^="traceId"]')
  ).toContainText("abc-123-xyz");
});

test("кнопка «Назад к вводу» возвращает на страницу ввода", async ({ page }) => {
  await page.goto("/#logs");
  await page.fill("#logsInput", SAMPLE);
  await page.click("#btnNormalize");
  await expect(page.locator("#logsResult")).toBeVisible();

  await page.click(".btn-back");
  await expect(page.locator("#logs")).toBeVisible();
  await expect(page.locator("#logsResult")).toBeHidden();
});

test("пакетный рендер: первые 150 + «Показать ещё»", async ({ page }) => {
  // 160 уникальных сообщений. Каждая строка начинается с "{" → отдельная
  // запись (см. parseMultipleLogEntries); разный id → без дедупликации.
  const many = Array.from(
    { length: 160 },
    (_, i) => `{ internalRequest = {"id": ${i}, "name": "n${i}"} }`
  ).join("\n");

  await page.goto("/#logs");
  await page.fill("#logsInput", many);
  await page.click("#btnNormalize");
  await expect(page.locator("#logsResult")).toBeVisible();

  // Первая пачка — 150 карточек + кнопка с остатком.
  await expect(page.locator(".item-card")).toHaveCount(150);
  const showMore = page.locator(".show-more-btn");
  await expect(showMore).toBeVisible();
  await expect(showMore).toContainText("осталось 10");

  // Догрузка остатка.
  await showMore.click();
  await expect(page.locator(".item-card")).toHaveCount(160);
  await expect(page.locator(".show-more-btn")).toHaveCount(0);
});

test("клик по заголовку сворачивает и разворачивает карточку", async ({
  page,
}) => {
  await page.goto("/#logs");
  await page.fill("#logsInput", SAMPLE);
  await page.click("#btnNormalize");

  const card = page.locator(".item-card").first();
  await expect(card).toHaveClass(/expanded/);
  await card.locator(".item-header").click();
  await expect(card).toHaveClass(/collapsed/);
  await card.locator(".item-header").click();
  await expect(card).toHaveClass(/expanded/);
});

test("выбор двух сообщений открывает и закрывает окно сравнения", async ({
  page,
}) => {
  await page.goto("/#logs");
  await page.fill(
    "#logsInput",
    '{ internalRequest = {"id": 1, "name": "a"} }\n{ internalRequest = {"id": 2, "name": "b"} }'
  );
  await page.click("#btnNormalize");
  await expect(page.locator(".item-card")).toHaveCount(2);

  await expect(page.locator("#btnCompare")).toBeDisabled();
  await page.locator(".item-card").nth(0).locator(".item-checkbox").check();
  await page.locator(".item-card").nth(1).locator(".item-checkbox").check();
  await expect(page.locator("#btnCompare")).toBeEnabled();

  await page.click("#btnCompare");
  await expect(page.locator("#compareModal")).toBeVisible();
  await page.click(".modal-close");
  await expect(page.locator("#compareModal")).toBeHidden();
});

test("Ctrl+G открывает диалог перехода и переходит к сообщению", async ({
  page,
}) => {
  await page.goto("/#logs");
  await page.fill("#logsInput", SAMPLE);
  await page.click("#btnNormalize");
  await expect(page.locator(".item-card")).toHaveCount(1);

  await page.keyboard.press("Control+g");
  const dialog = page.locator("#jumpDialog");
  await expect(dialog).toBeVisible();

  await page.fill("#jumpInput", "1");
  await page.click('#jumpDialog button[value="go"]');
  await expect(dialog).toBeHidden();
  await expect(
    page.locator(".notification", { hasText: "Переход к сообщению" })
  ).toBeVisible();
});

test("тумблер «Подсветка» переключает раскраску тела карточки", async ({
  page,
}) => {
  await page.goto("/#logs");
  await page.fill("#logsInput", SAMPLE);
  await page.click("#btnNormalize");

  const tokens = page.locator(
    ".item-card .output .tok-str, .item-card .output .tok-key"
  );
  await expect(tokens.first()).toBeVisible(); // подсветка включена по умолчанию

  await page.uncheck("#highlightSearch");
  await expect(tokens).toHaveCount(0); // выкл → обычный текст без раскраски

  await page.check("#highlightSearch");
  await expect(tokens.first()).toBeVisible(); // вкл → раскраска вернулась
});

test("поиск фильтрует сообщения", async ({ page }) => {
  await page.goto("/#logs");
  await page.fill("#logsInput", SAMPLE);
  await page.click("#btnNormalize");
  await expect(page.locator(".item-card")).toHaveCount(1);

  // Несуществующий запрос — карточек нет.
  await page.fill("#logsSearch", "zzz-not-present");
  await expect(page.locator(".item-card")).toHaveCount(0);

  // Очистка — карточка снова видна.
  await page.fill("#logsSearch", "");
  await expect(page.locator(".item-card")).toHaveCount(1);
});
