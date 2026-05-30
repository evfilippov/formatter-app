// ПОЛНЫЙ UI-ПРОГОН · Часть 4 — раздел «Логи»: анализ, фильтры, поиск,
// сортировка, карточки, сравнение, экспорт, горячие клавиши, навигация.
//
// Тестовый лог (4 записи). Каждая строка начинается с "{" → отдельная запись
// (см. parseMultipleLogEntries). Записи невалидны как JSON → разбираются как TEXT,
// откуда паттернами извлекается вложенный JSON. Записи 1 и 3 идентичны →
// дубликат отбрасывается бэкендом. Итог: 3 уникальные карточки.
//   1) internalRequest — c traceId (попадёт в бейдж)
//   2) externalResponse
//   3) response
import { test, expect } from "@playwright/test";

const SAMPLE = [
  '{ internalRequest = {"id": 1, "traceId": "trace-aaa", "amount": 28351} }',
  '{ externalResponse = {"id": 2, "code": "E500"} }',
  '{ internalRequest = {"id": 1, "traceId": "trace-aaa", "amount": 28351} }',
  '{ response = {"id": 3, "status": "ok"} }',
].join("\n");

async function analyze(page) {
  await page.goto("/#logs");
  await page.fill("#logsInput", SAMPLE);
  await page.click("#btnNormalize");
  await expect(page.locator("#logsResult")).toBeVisible();
  await expect(page.locator(".item-card")).toHaveCount(3);
}

test.describe("Логи · анализ и сводка", () => {
  test("анализ переводит на страницу результатов со статистикой, графиком и traceId", async ({
    page,
  }) => {
    await analyze(page);

    await expect(page.locator("#logs")).toBeHidden();
    await expect(page.locator("#logsStats")).toContainText("Уникальных: 3");
    // График заполнен (класс active); сама полоска может схлопываться по высоте,
    // поэтому проверяем класс, а не геометрическую видимость.
    await expect(page.locator("#logsChart")).toHaveClass(/active/);

    // traceId вынесен в бейдж только у первой карточки (internalRequest).
    await expect(
      page.locator('.item-card .badge[title^="traceId"]')
    ).toHaveCount(1);
    await expect(
      page.locator('.item-card .badge[title^="traceId"]')
    ).toContainText("trace-aaa");
  });
});

test.describe("Логи · фильтры, поиск, сортировка", () => {
  test("фильтр по типу даёт ожидаемые количества", async ({ page }) => {
    await analyze(page);
    const cards = page.locator(".item-card");

    const cases = [
      ["all", 3],
      ["internal", 1],
      ["external", 1],
      ["request", 1],
      ["response", 2],
    ];
    for (const [value, count] of cases) {
      await page.selectOption("#logsFilter", value);
      await expect(cards).toHaveCount(count);
    }
  });

  test("фильтр по уровню: INFO — все, ERROR — пусто (уровень с бэкенда не приходит)", async ({
    page,
  }) => {
    await analyze(page);
    const cards = page.locator(".item-card");

    await page.selectOption("#logsFilter", "info");
    await expect(cards).toHaveCount(3);
    await page.selectOption("#logsFilter", "error");
    await expect(cards).toHaveCount(0);
    await page.selectOption("#logsFilter", "all");
    await expect(cards).toHaveCount(3);
  });

  test("сортировки переключаются без потери карточек", async ({ page }) => {
    await analyze(page);
    const cards = page.locator(".item-card");
    for (const value of ["type", "size", "timestamp", "number"]) {
      await page.selectOption("#logsSort", value);
      await expect(cards).toHaveCount(3);
    }
  });

  test("поиск фильтрует, ведёт счётчик и историю", async ({ page }) => {
    await analyze(page);
    const cards = page.locator(".item-card");

    await page.fill("#logsSearch", "trace-aaa");
    await expect(cards).toHaveCount(1);
    await expect(page.locator("#searchCounter")).toContainText("1 из");
    await expect(
      page.locator(".search-history-item", { hasText: "trace-aaa" })
    ).toBeVisible();

    await page.fill("#logsSearch", "");
    await expect(cards).toHaveCount(3);
  });

  test("Regex-поиск отбирает по выражению", async ({ page }) => {
    // #regexMode — чекбокс на странице ВВОДА (#logs), на странице результатов он
    // скрыт. Включаем до анализа; поиск на результатах учтёт флаг.
    await page.goto("/#logs");
    await page.check("#regexMode");
    await page.fill("#logsInput", SAMPLE);
    await page.click("#btnNormalize");
    await expect(page.locator("#logsResult")).toBeVisible();

    await page.fill("#logsSearch", "internal|external");
    await expect(page.locator(".item-card")).toHaveCount(2);
  });

  test("тумблер «Подсветка» включает/выключает раскраску тела", async ({
    page,
  }) => {
    await analyze(page);
    const tokens = page.locator(
      ".item-card .output .tok-str, .item-card .output .tok-key"
    );
    await expect(tokens.first()).toBeVisible();
    await page.uncheck("#highlightSearch");
    await expect(tokens).toHaveCount(0);
    await page.check("#highlightSearch");
    await expect(tokens.first()).toBeVisible();
  });

  test("флаги «только уникальные» / «дубликаты» не ломают выдачу", async ({
    page,
  }) => {
    // Эти флаги — на странице ВВОДА (#logs), на результатах скрыты. Выставляем
    // до анализа. Дубликаты бэкенд в items не отдаёт, поэтому счётчик стабилен.
    await page.goto("/#logs");
    await page.uncheck("#showOnlyUnique");
    await page.check("#showDuplicates");
    await page.fill("#logsInput", SAMPLE);
    await page.click("#btnNormalize");
    await expect(page.locator("#logsResult")).toBeVisible();
    await expect(page.locator(".item-card")).toHaveCount(3);
  });
});

test.describe("Логи · карточки", () => {
  test("клик по заголовку сворачивает/разворачивает", async ({ page }) => {
    await analyze(page);
    const card = page.locator(".item-card").first();
    await expect(card).toHaveClass(/expanded/);
    await card.locator(".item-header").click();
    await expect(card).toHaveClass(/collapsed/);
    await card.locator(".item-header").click();
    await expect(card).toHaveClass(/expanded/);
  });

  test("«Свернуть все» и «Развернуть все»", async ({ page }) => {
    await analyze(page);
    const cards = page.locator(".item-card");

    await page.click("#btnCollapseAll");
    await expect(cards.first()).toHaveClass(/collapsed/);
    await expect(
      page.locator(".notification", { hasText: "свернуты" })
    ).toBeVisible();

    await page.click("#btnExpandAll");
    await expect(cards.first()).toHaveClass(/expanded/);
  });

  test("звезда добавляет в избранное", async ({ page }) => {
    await analyze(page);
    // Звезда видна только при наведении на карточку (display:none по умолчанию),
    // поэтому сначала наводим курсор, затем кликаем.
    const card = page.locator(".item-card").first();
    await card.hover();
    const star = card.locator(".item-star");
    await expect(star).toBeVisible();
    await star.click();
    await expect(card.locator(".item-star")).toHaveClass(/starred/);
  });

  test("кнопки карточки: копировать JSON / блок и скачать", async ({ page }) => {
    await analyze(page);
    const card = page.locator(".item-card").first();

    await card.getByRole("button", { name: /Копировать JSON/ }).click();
    await expect(
      page.locator(".notification", { hasText: "JSON скопирован" })
    ).toBeVisible();

    await card.getByRole("button", { name: /Копировать блок/ }).click();
    await expect(
      page.locator(".notification", { hasText: "Блок скопирован" })
    ).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      card.getByRole("button", { name: /Скачать/ }).click(),
    ]);
    expect(download.suggestedFilename()).toContain("message-");
  });

  test("сравнение через кнопки карточек открывает модалку", async ({ page }) => {
    await analyze(page);
    await page
      .locator(".item-card")
      .nth(0)
      .getByRole("button", { name: /Сравнить/ })
      .click();
    await expect(
      page.locator(".notification", { hasText: "второй элемент" })
    ).toBeVisible();

    await page
      .locator(".item-card")
      .nth(1)
      .getByRole("button", { name: /Сравнить/ })
      .click();
    await expect(page.locator("#compareModal")).toBeVisible();
    await page.click(".modal-close");
    await expect(page.locator("#compareModal")).toBeHidden();
  });
});

test.describe("Логи · экспорт и сравнение через тулбар", () => {
  test("выбор двух карточек включает экспорт и сравнение", async ({ page }) => {
    await analyze(page);
    const cards = page.locator(".item-card");

    await expect(page.locator("#btnExportSelected")).toBeDisabled();
    await expect(page.locator("#btnCompare")).toBeDisabled();

    await cards.nth(0).locator(".item-checkbox").check();
    await expect(page.locator("#btnExportSelected")).toBeEnabled();

    await cards.nth(1).locator(".item-checkbox").check();
    await expect(page.locator("#btnCompare")).toBeEnabled();

    // Экспорт выбранных → скачивание файла.
    const [dl] = await Promise.all([
      page.waitForEvent("download"),
      page.click("#btnExportSelected"),
    ]);
    expect(dl.suggestedFilename()).toContain("selected-messages");

    // Сравнение выбранных → модалка.
    await page.click("#btnCompare");
    await expect(page.locator("#compareModal")).toBeVisible();
    await page.click(".modal-close");
    await expect(page.locator("#compareModal")).toBeHidden();
  });

  test("общий отчёт: скачать и скопировать", async ({ page }) => {
    await analyze(page);

    await expect(page.locator("#btnDownload")).toBeEnabled();
    const [dl] = await Promise.all([
      page.waitForEvent("download"),
      page.click("#btnDownload"),
    ]);
    expect(dl.suggestedFilename()).toBe("output.json");

    await page.click("#btnCopyExport");
    await expect(
      page.locator(".notification", { hasText: "Отчет скопирован" })
    ).toBeVisible();
  });

  test("Ctrl+G — переход к сообщению по номеру", async ({ page }) => {
    await analyze(page);
    await page.keyboard.press("Control+g");
    await expect(page.locator("#jumpDialog")).toBeVisible();
    await page.fill("#jumpInput", "1");
    await page.click('#jumpDialog button[value="go"]');
    await expect(page.locator("#jumpDialog")).toBeHidden();
    await expect(
      page.locator(".notification", { hasText: "Переход к сообщению" })
    ).toBeVisible();
  });
});

test.describe("Логи · навигация и сброс", () => {
  test("«Назад к вводу» и «Последний результат»", async ({ page }) => {
    await analyze(page);

    await page.click(".btn-back");
    await expect(page.locator("#logs")).toBeVisible();
    await expect(page.locator("#logsResult")).toBeHidden();

    const last = page.locator("#btnShowLastResult");
    await expect(last).toBeVisible();
    await last.click();
    await expect(page.locator("#logsResult")).toBeVisible();
  });

  test("«Очистить всё» сбрасывает ввод и состояние", async ({ page }) => {
    await analyze(page);
    await page.click(".btn-back");
    await expect(page.locator("#logs")).toBeVisible();

    await page.click("#btnLogsReset");
    await expect(
      page.locator(".notification", { hasText: "очищены" })
    ).toBeVisible();
    await expect(page.locator("#logsInput")).toHaveValue("");
  });
});
