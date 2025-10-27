/* ============================================
   LOGS HOTKEYS - Горячие клавиши
   ============================================ */

import { handleProcessLogs, handleClearLogs } from "./logsProcessor.js";
import { searchLogs, clearFilters, resetSearch } from "./logsSearch.js";
import { compareSelected } from "./logsCompare.js";
import { exportAll, exportSelected } from "./logsActions.js";
import { expandAllCards, collapseAllCards } from "./logsRender.js";
import { showNotification } from "../../components/notification.js";

/**
 * Инициализация горячих клавиш
 */
export function initHotkeys() {
  document.addEventListener("keydown", handleHotkey);
  console.log("⌨️ Горячие клавиши инициализированы");
}

/**
 * Обработчик горячих клавиш
 * @param {KeyboardEvent} e - Событие клавиатуры
 */
function handleHotkey(e) {
  const ctrl = e.ctrlKey || e.metaKey;
  const shift = e.shiftKey;
  const alt = e.altKey;

  // Игнорируем, если фокус на input/textarea (кроме некоторых)
  const target = e.target;
  const isInput =
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable;

  // === CTRL + ENTER: Обработать логи ===
  if (ctrl && e.key === "Enter" && target.id === "logsInput") {
    e.preventDefault();
    handleProcessLogs();
    return;
  }

  // === CTRL + K: Фокус на поиск ===
  if (ctrl && e.key === "k") {
    e.preventDefault();
    const searchInput = document.getElementById("logsSearch");
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
    return;
  }

  // === CTRL + SHIFT + K: Очистить фильтры ===
  if (ctrl && shift && e.key === "K") {
    e.preventDefault();
    clearFilters();
    return;
  }

  // === CTRL + S: Экспорт всех ===
  if (ctrl && e.key === "s") {
    e.preventDefault();
    exportAll();
    return;
  }

  // === CTRL + SHIFT + S: Экспорт выбранных ===
  if (ctrl && shift && e.key === "S") {
    e.preventDefault();
    exportSelected();
    return;
  }

  // === CTRL + D: Очистить всё ===
  if (ctrl && e.key === "d") {
    e.preventDefault();
    handleClearLogs();
    return;
  }

  // === CTRL + C: Сравнить выбранные ===
  if (ctrl && e.key === "c" && !isInput) {
    e.preventDefault();
    compareSelected();
    return;
  }

  // === CTRL + E: Развернуть все ===
  if (ctrl && e.key === "e" && !isInput) {
    e.preventDefault();
    expandAllCards();
    showNotification("Все карточки развернуты");
    return;
  }

  // === CTRL + SHIFT + E: Свернуть все ===
  if (ctrl && shift && e.key === "E" && !isInput) {
    e.preventDefault();
    collapseAllCards();
    showNotification("Все карточки свернуты");
    return;
  }

  // === CTRL + F: Фокус на поиск (альтернатива Ctrl+K) ===
  if (ctrl && e.key === "f") {
    e.preventDefault();
    const searchInput = document.getElementById("logsSearch");
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
    return;
  }

  // === CTRL + R: Повторная обработка ===
  if (ctrl && e.key === "r") {
    e.preventDefault();
    const { handleReprocess } = require("./logsProcessor.js");
    handleReprocess();
    return;
  }

  // === ESCAPE: Сброс поиска / Закрыть модал ===
  if (e.key === "Escape") {
    // Если открыт модал - закрываем
    const modal = document.getElementById("compareModal");
    if (modal && !modal.classList.contains("hidden")) {
      const { closeCompareModal } = require("../../components/modal.js");
      closeCompareModal();
      return;
    }

    // Если фокус на поиске - очищаем
    if (target.id === "logsSearch") {
      resetSearch();
      target.blur();
      return;
    }
  }

  // === CTRL + /: Показать справку по горячим клавишам ===
  if (ctrl && e.key === "/") {
    e.preventDefault();
    showHotkeysHelp();
    return;
  }

  // === ALT + 1-5: Быстрые фильтры ===
  if (alt && ["1", "2", "3", "4", "5"].includes(e.key)) {
    e.preventDefault();
    const filters = {
      1: "all",
      2: "request",
      3: "response",
      4: "error",
      5: "warning",
    };
    const filterSelect = document.getElementById("logsFilter");
    if (filterSelect) {
      filterSelect.value = filters[e.key];
      searchLogs();
    }
    return;
  }
}

/**
 * Показать справку по горячим клавишам
 */
export function showHotkeysHelp() {
  const help = `
╔════════════════════════════════════════════╗
║       🎹 ГОРЯЧИЕ КЛАВИШИ                   ║
╠════════════════════════════════════════════╣
║ ОСНОВНЫЕ:                                  ║
║ Ctrl+Enter    - Обработать логи           ║
║ Ctrl+K        - Фокус на поиск            ║
║ Ctrl+S        - Экспорт всех              ║
║ Ctrl+Shift+S  - Экспорт выбранных         ║
║ Ctrl+D        - Очистить всё              ║
║ Ctrl+R        - Повторная обработка       ║
║                                            ║
║ ПОИСК И ФИЛЬТРЫ:                           ║
║ Ctrl+K        - Фокус на поиск            ║
║ Ctrl+Shift+K  - Очистить фильтры          ║
║ Escape        - Сброс поиска              ║
║ Alt+1         - Все сообщения             ║
║ Alt+2         - Request                   ║
║ Alt+3         - Response                  ║
║ Alt+4         - Error                     ║
║ Alt+5         - Warning                   ║
║                                            ║
║ КАРТОЧКИ:                                  ║
║ Ctrl+E        - Развернуть все            ║
║ Ctrl+Shift+E  - Свернуть все              ║
║ Ctrl+C        - Сравнить выбранные        ║
║                                            ║
║ ПРОЧЕЕ:                                    ║
║ Ctrl+/        - Эта справка               ║
║ Escape        - Закрыть модал             ║
╚════════════════════════════════════════════╝
  `.trim();

  console.log(help);
  showNotification("Справка выведена в консоль (F12)");
}

/**
 * Отключить горячие клавиши
 */
export function disableHotkeys() {
  document.removeEventListener("keydown", handleHotkey);
  console.log("⌨️ Горячие клавиши отключены");
}

/**
 * Включить горячие клавиши
 */
export function enableHotkeys() {
  document.removeEventListener("keydown", handleHotkey); // Удаляем дубли
  document.addEventListener("keydown", handleHotkey);
  console.log("⌨️ Горячие клавиши включены");
}
