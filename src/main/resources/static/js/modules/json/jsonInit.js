/* ============================================
   JSON INIT - Инициализация модуля JSON
   ============================================ */

import {
  formatJson,
  minifyJson,
  validateJson,
  copyJsonOutput,
  clearJsonFields,
  loadJsonExample,
} from "./jsonFormatter.js";

/**
 * Инициализация модуля JSON
 */
export function initJson() {
  console.log("🚀 Инициализация модуля JSON...");

  // Привязка событий
  bindEvents();

  console.log("✅ Модуль JSON инициализирован");
}

/**
 * Привязка событий к элементам
 */
function bindEvents() {
  // Кнопки
  bindClick("jsonFormatBtn", formatJson);
  bindClick("jsonMinifyBtn", minifyJson);
  bindClick("jsonValidateBtn", validateJson);
  bindClick("jsonCopyBtn", copyJsonOutput);
  bindClick("jsonClearBtn", clearJsonFields);
  bindClick("jsonExampleBtn", loadJsonExample);

  // Горячие клавиши
  const input = document.getElementById("jsonInput");
  if (input) {
    input.addEventListener("keydown", handleJsonHotkeys);
  }

  console.log("✅ События JSON привязаны");
}

/**
 * Обработчик горячих клавиш JSON
 * @param {KeyboardEvent} e - Событие клавиатуры
 */
function handleJsonHotkeys(e) {
  const ctrl = e.ctrlKey || e.metaKey;

  // Ctrl+Enter - Форматировать
  if (ctrl && e.key === "Enter") {
    e.preventDefault();
    formatJson();
    return;
  }

  // Ctrl+M - Минифицировать
  if (ctrl && e.key === "m") {
    e.preventDefault();
    minifyJson();
    return;
  }

  // Ctrl+Shift+V - Валидировать
  if (ctrl && e.shiftKey && e.key === "V") {
    e.preventDefault();
    validateJson();
    return;
  }

  // Ctrl+D - Очистить
  if (ctrl && e.key === "d") {
    e.preventDefault();
    clearJsonFields();
    return;
  }
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
 * Очистка модуля (при переключении секции)
 */
export function cleanupJson() {
  console.log("🧹 Очистка модуля JSON...");
  // Здесь можно добавить логику очистки, если нужно
}
