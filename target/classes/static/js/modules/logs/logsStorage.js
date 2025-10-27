/* ============================================
   LOGS STORAGE - Работа с LocalStorage
   ============================================ */

import {
  allLogItems,
  setAllLogItems,
  filteredItems,
  setFilteredItems,
  searchHistory,
  setSearchHistory,
  starredItems,
  setStarredItems,
} from "./logsState.js";
import { showNotification } from "../../components/notification.js";

const STORAGE_KEY = "logsData";
const SETTINGS_KEY = "logsSettings";

/**
 * Загрузить данные из LocalStorage
 * @returns {Object|null} Сохраненные данные или null
 */
export function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      return data;
    }
  } catch (e) {
    console.error("Error loading from localStorage:", e);
  }
  return null;
}

/**
 * Сохранить данные в LocalStorage
 */
export function saveToLocalStorage() {
  if (!document.getElementById("autoSave")?.checked) {
    return;
  }

  try {
    const data = {
      input: document.getElementById("logsInput")?.value || "",
      items: allLogItems,
      starred: Array.from(starredItems),
      searchHistory: searchHistory,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log("💾 Автосохранение выполнено");
  } catch (e) {
    console.error("Error saving to localStorage:", e);
    showNotification("Ошибка автосохранения", "error");
  }
}

/**
 * Восстановить данные из LocalStorage
 */
export function restoreFromLocalStorage() {
  const saved = loadFromLocalStorage();

  if (saved && saved.items && saved.items.length > 0) {
    // Восстанавливаем input
    const logsInput = document.getElementById("logsInput");
    if (logsInput) {
      logsInput.value = saved.input || "";
    }

    // Восстанавливаем состояние
    setAllLogItems(saved.items || []);
    setFilteredItems(saved.items || []);
    setStarredItems(saved.starred || []);
    setSearchHistory(saved.searchHistory || []);

    console.log(`✅ Восстановлено ${saved.items.length} сообщений`);
    return true;
  }

  return false;
}

/**
 * Очистить данные из LocalStorage
 */
export function clearLocalStorage() {
  localStorage.removeItem(STORAGE_KEY);
  console.log("🗑️ LocalStorage очищен");
}

/**
 * Загрузить настройки
 * @returns {Object} Объект настроек
 */
export function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error loading settings:", e);
  }

  return {
    autoSave: false,
    highlightSearch: true,
    regexMode: false,
    showOnlyUnique: false,
    showDuplicates: true,
  };
}

/**
 * Сохранить настройки
 * @param {Object} settings - Объект настроек
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    console.log("⚙️ Настройки сохранены");
  } catch (e) {
    console.error("Error saving settings:", e);
  }
}

/**
 * Получить текущие настройки из UI
 * @returns {Object} Объект настроек
 */
export function getCurrentSettings() {
  return {
    autoSave: document.getElementById("autoSave")?.checked || false,
    highlightSearch:
      document.getElementById("highlightSearch")?.checked || true,
    regexMode: document.getElementById("regexMode")?.checked || false,
    showOnlyUnique: document.getElementById("showOnlyUnique")?.checked || false,
    showDuplicates: document.getElementById("showDuplicates")?.checked || true,
  };
}

/**
 * Применить настройки к UI
 * @param {Object} settings - Объект настроек
 */
export function applySettings(settings) {
  const elements = {
    autoSave: document.getElementById("autoSave"),
    highlightSearch: document.getElementById("highlightSearch"),
    regexMode: document.getElementById("regexMode"),
    showOnlyUnique: document.getElementById("showOnlyUnique"),
    showDuplicates: document.getElementById("showDuplicates"),
  };

  Object.entries(settings).forEach(([key, value]) => {
    if (elements[key]) {
      elements[key].checked = value;
    }
  });
}

/**
 * Инициализация автосохранения (каждые 30 секунд)
 */
export function initAutoSave() {
  setInterval(() => {
    if (
      allLogItems.length > 0 &&
      document.getElementById("autoSave")?.checked
    ) {
      saveToLocalStorage();
    }
  }, 30000); // 30 секунд

  console.log("✅ Автосохранение инициализировано (каждые 30 сек)");
}

/**
 * Получить размер данных в LocalStorage
 * @returns {string} Размер в KB
 */
export function getStorageSize() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const sizeKB = (new Blob([data]).size / 1024).toFixed(2);
      return `${sizeKB} KB`;
    }
  } catch (e) {
    console.error("Error getting storage size:", e);
  }
  return "0 KB";
}
