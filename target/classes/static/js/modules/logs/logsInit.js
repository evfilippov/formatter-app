/* ============================================
   LOGS INIT - Инициализация модуля Logs
   ============================================ */

import {
  handleProcessLogs,
  handleClearLogs,
  handleFileUpload,
} from "./logsProcessor.js";
import { searchLogs, clearFilters } from "./logsSearch.js";
import {
  exportAll,
  exportSelected,
  toggleSelection,
  toggleStar,
  copyJson,
  copyBlock,
  downloadItem,
} from "./logsActions.js";
import { addToCompare, compareSelected } from "./logsCompare.js";
import { initChart } from "./logsChart.js";
import { initHotkeys, showHotkeysHelp } from "./logsHotkeys.js";
import {
  initAutoSave,
  restoreFromLocalStorage,
  loadSettings,
  applySettings,
  saveSettings,
  getCurrentSettings,
} from "./logsStorage.js";
import {
  toggleCard,
  expandAllCards,
  collapseAllCards,
  scrollToCard,
} from "./logsRender.js";
import { showNotification } from "../../components/notification.js";
import { debounce } from "../../core/utils.js";

/**
 * Инициализация модуля Logs
 */
export function initLogs() {
  console.log("🚀 Инициализация модуля Logs...");

  // 1. Инициализация графика
  initChart();

  // 2. Инициализация горячих клавиш
  initHotkeys();

  // 3. Инициализация автосохранения
  initAutoSave();

  // 4. Восстановление данных из LocalStorage
  const restored = restoreFromLocalStorage();
  if (restored) {
    showNotification("📦 Данные восстановлены из LocalStorage");
  }

  // 5. Загрузка настроек
  const settings = loadSettings();
  applySettings(settings);

  // 6. Привязка событий
  bindEvents();

  // 7. Экспорт функций в window (для onclick в HTML)
  exportToWindow();

  console.log("✅ Модуль Logs инициализирован");
}

/**
 * Привязка событий к элементам
 */
function bindEvents() {
  // === ОСНОВНЫЕ КНОПКИ ===
  bindClick("logsProcessBtn", handleProcessLogs);
  bindClick("logsClearBtn", handleClearLogs);
  bindClick("logsExportBtn", exportAll);
  bindClick("logsExportSelectedBtn", exportSelected);

  // === ПОИСК И ФИЛЬТРЫ ===
  const searchInput = document.getElementById("logsSearch");
  if (searchInput) {
    searchInput.addEventListener("input", debounce(searchLogs, 300));
  }

  const filterSelect = document.getElementById("logsFilter");
  if (filterSelect) {
    filterSelect.addEventListener("change", searchLogs);
  }

  const sortSelect = document.getElementById("logsSort");
  if (sortSelect) {
    sortSelect.addEventListener("change", searchLogs);
  }

  bindClick("logsClearFiltersBtn", clearFilters);

  // === СРАВНЕНИЕ ===
  bindClick("compareBtn", compareSelected);

  // === КАРТОЧКИ ===
  bindClick("expandAllBtn", expandAllCards);
  bindClick("collapseAllBtn", collapseAllCards);

  // === ЗАГРУЗКА ФАЙЛА ===
  const fileInput = document.getElementById("logsFileInput");
  if (fileInput) {
    fileInput.addEventListener("change", handleFileUpload);
  }

  // === НАСТРОЙКИ ===
  const settingsCheckboxes = [
    "autoSave",
    "highlightSearch",
    "regexMode",
    "showOnlyUnique",
    "showDuplicates",
  ];

  settingsCheckboxes.forEach((id) => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener("change", () => {
        saveSettings(getCurrentSettings());
        if (id === "highlightSearch" || id === "regexMode") {
          searchLogs(); // Перерендерим при изменении подсветки
        }
      });
    }
  });

  // === СПРАВКА ===
  bindClick("hotkeysHelpBtn", showHotkeysHelp);

  console.log("✅ События привязаны");
}

/**
 * Экспорт функций в window (для onclick в HTML)
 */
function exportToWindow() {
  window.toggleCard = toggleCard;
  window.toggleSelection = toggleSelection;
  window.toggleStar = toggleStar;
  window.copyJson = copyJson;
  window.copyBlock = copyBlock;
  window.downloadItem = downloadItem;
  window.addToCompare = addToCompare;
  window.scrollToCard = scrollToCard;

  console.log("✅ Функции экспортированы в window");
}

/**
 * Привязка клика к элементу
 * @param {string} id - ID элемента
 * @param {Function} handler - Обработчик
 */
function bindClick(id, handler) {
  const element = document.getElementById(id);
  if (element) {
    element.addEventListener("click", handler);
  }
}

/**
 * Очистка модуля (для переключения секций)
 */
export function cleanupLogs() {
  console.log("🧹 Очистка модуля Logs...");
  // Здесь можно добавить логику очистки, если нужно
}
