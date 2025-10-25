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
  console.log("��� Application starting...");

  try {
    // Инициализация роутера
    initRouter();

    // Инициализация модальных окон
    initModals();

    // Инициализация модулей по роутам
    initModulesByRoute();

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
 * Обработка навигации на home странице
 */
function initHomeNavigation() {
  const cards = document.querySelectorAll(".card[data-route]");

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const route = card.dataset.route;
      if (route) {
        window.location.hash = route;
      }
    });
  });
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
  });
} else {
  initApp();
  initHomeNavigation();
}

console.log("��� App.js loaded");

// ============================================
// ЭКСПОРТ ФУНКЦИЙ В ГЛОБАЛЬНУЮ ОБЛАСТЬ
// ============================================

import { 
  toggleCard, 
  toggleSelection, 
  toggleStar, 
  copyJson, 
  copyBlock, 
  downloadItem, 
  addToCompare,
  closeCompareModal 
} from './modules/logs/logs.js';

// Экспорт функций логов
window.toggleCard = toggleCard;
window.toggleSelection = toggleSelection;
window.toggleStar = toggleStar;
window.copyJson = copyJson;
window.copyBlock = copyBlock;
window.downloadItem = downloadItem;
window.addToCompare = addToCompare;
window.closeCompareModal = closeCompareModal;

console.log('✅ Global functions exported');
