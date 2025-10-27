/* ============================================
   APP.JS - Главный файл приложения
   ============================================ */

import { initRouter, navigateTo } from "./core/router.js";
import { initLogs, cleanupLogs } from "./modules/logs/logsInit.js";
import { initJson, cleanupJson } from "./modules/json/jsonInit.js";
import { initXml, cleanupXml } from "./modules/xml/xmlInit.js";

/**
 * Инициализация приложения
 */
function initApp() {
  console.log("🚀 Запуск приложения LogParser Pro...");

  // 1. Инициализация роутера
  initRouter(handleSectionChange);

  // 2. Определяем текущую секцию из URL
  const hash = window.location.hash.slice(1) || "logs";
  navigateTo(hash);

  // 3. Приветственное сообщение
  console.log(`
╔════════════════════════════════════════════╗
║                                            ║
║         📊 LogParser Pro v1.0              ║
║                                            ║
║   ✅ Logs Parser - Анализ логов           ║
║   ✅ JSON Formatter - Форматирование       ║
║   ✅ XML Formatter - Форматирование        ║
║                                            ║
║   🎯 Готово к работе!                      ║
║                                            ║
╚════════════════════════════════════════════╝
  `);

  console.log("✅ Приложение запущено");
}

/**
 * Обработчик смены секции
 * @param {string} section - Название секции (logs/json/xml)
 */
function handleSectionChange(section) {
  console.log(`🔄 Переключение на секцию: ${section}`);

  // Очищаем предыдущую секцию
  cleanupPreviousSection();

  // Инициализируем новую секцию
  switch (section) {
    case "logs":
      initLogs();
      break;
    case "json":
      initJson();
      break;
    case "xml":
      initXml();
      break;
    default:
      console.warn(`⚠️ Неизвестная секция: ${section}`);
  }
}

/**
 * Очистка предыдущей секции
 */
function cleanupPreviousSection() {
  const currentSection = document.querySelector(".section:not(.hidden)");
  if (!currentSection) return;

  const sectionId = currentSection.id;

  switch (sectionId) {
    case "logs":
      cleanupLogs();
      break;
    case "json":
      cleanupJson();
      break;
    case "xml":
      cleanupXml();
      break;
  }
}

// === ЗАПУСК ПРИЛОЖЕНИЯ ===
document.addEventListener("DOMContentLoaded", initApp);

// === ЭКСПОРТ ДЛЯ ГЛОБАЛЬНОГО ДОСТУПА ===
window.app = {
  version: "1.0.0",
  navigateTo,
};

console.log("📦 app.js загружен");
