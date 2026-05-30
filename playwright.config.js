import { defineConfig, devices } from "@playwright/test";

// E2E-тесты гоняются против запущенного приложения на http://localhost:8080.
// Подними приложение перед прогоном:  docker compose up --build  (или -d).
// webServer настроен на ПЕРЕИСПОЛЬЗОВАНИЕ уже запущенного сервера; если он не
// поднят — Playwright сам стартует контейнер и дождётся порт.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Быстрый дымовой набор — гоняется часто, headless, параллельно.
    {
      name: "chromium",
      testDir: "./e2e",
      use: { ...devices["Desktop Chrome"] },
    },
    // Полный UI-прогон — каждая кнопка/действие во всех разделах.
    // ВСЕГДА с видимым браузером и замедлением (slowMo), чтобы можно было
    // глазами проследить шаги. Запускать вручную после крупного блока работ:
    //   npm run test:ui-full
    {
      name: "ui-full",
      testDir: "./e2e-full",
      use: {
        ...devices["Desktop Chrome"],
        headless: false, // браузер обязателен — смотрим вживую
        viewport: { width: 1440, height: 900 },
        launchOptions: { slowMo: 550 }, // пауза между действиями, мс
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
  ],

  webServer: {
    command: "docker compose up --build",
    url: "http://localhost:8080",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
