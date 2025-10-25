// ============================================
// MAIN APPLICATION
// ============================================

import { initRouter } from "./core/router.js";
import { initModals } from "./components/modal.js";
import { initLogs } from "./modules/logs/logs.js";
import { initJson } from "./modules/json/json.js";
import { initXml } from "./modules/xml/xml.js";
import { initGraphQL } from "./modules/graphql/graphql.js";

/**
 * Инициализация приложения
 */
async function initApp() {
  console.log("🚀 Application starting...");

  try {
    // Инициализация роутера
    initRouter();

    // Инициализация модальных окон
    initModals();

    // Инициализация модулей по роутам
    initModulesByRoute();

    // Обновление лимитов в header
    updateLimits();

    console.log("✅ Application ready!");
  } catch (error) {
    console.error("❌ Application initialization failed:", error);
  }
}

/**
 * Инициализация модулей на основе роута
 */
function initModulesByRoute() {
  const hash = window.location.hash?.substring(1) || "home";

  // Инициализируем модули только при переходе на соответствующую страницу
  window.addEventListener("routeChange", (e) => {
    const route = e.detail.route;

    switch (route) {
      case "logs":
        initLogs();
        break;
      case "json":
        initJson();
        break;
      case "xml":
        initXml();
        break;
      case "graphql":
        initGraphQL();
        break;
    }
  });

  // Инициализация текущего модуля при загрузке
  switch (hash) {
    case "logs":
      initLogs();
      break;
    case "json":
      initJson();
      break;
    case "xml":
      initXml();
      break;
    case "graphql":
      initGraphQL();
      break;
  }
}

/**
 * Обновление информации о лимитах в header
 */
async function updateLimits() {
  try {
    const response = await fetch("/actuator/health");
    if (response.ok) {
      const data = await response.json();
      const limitsEl = document.querySelector(".limits");

      if (limitsEl && data.details) {
        // Если бэкенд возвращает информацию о лимитах
        const memory = data.details.diskSpace?.total || "N/A";
        limitsEl.textContent = `Memory: ${formatBytes(memory)}`;
      }
    }
  } catch (error) {
    console.warn("Could not fetch limits:", error);
  }
}

/**
 * Форматирование байтов
 */
function formatBytes(bytes) {
  if (!bytes || bytes === "N/A") return "N/A";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Обработка навигации на home странице
 */
function initHomeNavigation() {
  // Карточки на главной странице
  const cards = document.querySelectorAll(".card.clickable");

  cards.forEach((card) => {
    card.addEventListener("click", (e) => {
      const route = card.dataset.route;
      if (route) {
        window.location.hash = route;
      }
    });
  });
}

/**
 * Инициализация горячих клавиш глобальных
 */
function initGlobalHotkeys() {
  document.addEventListener("keydown", (e) => {
    // Ctrl + H - Home
    if ((e.ctrlKey || e.metaKey) && e.key === "h") {
      e.preventDefault();
      window.location.hash = "home";
    }

    // Ctrl + 1-4 - быстрая навигация
    if ((e.ctrlKey || e.metaKey) && e.key >= "1" && e.key <= "4") {
      e.preventDefault();
      const routes = ["logs", "json", "xml", "graphql"];
      const index = parseInt(e.key) - 1;
      if (routes[index]) {
        window.location.hash = routes[index];
      }
    }
  });
}

/**
 * Показ подсказки о горячих клавишах
 */
function showHotkeysHint() {
  const hint = document.createElement("div");
  hint.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: rgba(15, 23, 42, 0.9);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 13px;
    z-index: 1000;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
  `;
  hint.innerHTML = `
    <strong>⌨️ Горячие клавиши:</strong><br>
    Ctrl+H - Главная<br>
    Ctrl+1-4 - Быстрая навигация<br>
    Ctrl+F - Поиск (в модулях)<br>
    ESC - Закрыть модальное окно
  `;

  document.body.appendChild(hint);

  setTimeout(() => {
    hint.style.animation = "slideOutLeft 0.3s ease-out";
    setTimeout(() => hint.remove(), 300);
  }, 5000);
}

/**
 * Обработка ошибок глобально
 */
window.addEventListener("error", (e) => {
  console.error("Global error:", e.error);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled promise rejection:", e.reason);
});

// Запуск приложения при загрузке DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initApp();
    initHomeNavigation();
    initGlobalHotkeys();

    // Показываем подсказку о горячих клавишах через 2 секунды
    setTimeout(showHotkeysHint, 2000);
  });
} else {
  initApp();
  initHomeNavigation();
  initGlobalHotkeys();
  setTimeout(showHotkeysHint, 2000);
}

// Экспорт для отладки
window.app = {
  version: "2.0.0",
  modules: {
    logs: () => import("./modules/logs/logs.js"),
    json: () => import("./modules/json/json.js"),
    xml: () => import("./modules/xml/xml.js"),
    graphql: () => import("./modules/graphql/graphql.js"),
  },
};

console.log("📦 App.js loaded");
