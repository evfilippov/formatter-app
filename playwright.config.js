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

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: "docker compose up --build",
    url: "http://localhost:8080",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
