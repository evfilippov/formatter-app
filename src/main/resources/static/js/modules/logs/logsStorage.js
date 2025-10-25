// ============================================
// LOGS - LOCALSTORAGE
// ============================================

const STORAGE_KEY = "logsData";
const SETTINGS_KEY = "logsSettings";

/**
 * Загрузка данных из localStorage
 */
export function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      console.log(
        "✅ Loaded data from localStorage:",
        data.items?.length || 0,
        "items"
      );
      return data;
    }
  } catch (e) {
    console.error("Error loading from localStorage:", e);
  }
  return null;
}

/**
 * Сохранение данных в localStorage
 */
export function saveToLocalStorage(data) {
  try {
    const autoSaveEnabled = document.getElementById("autoSave")?.checked;
    if (!autoSaveEnabled) {
      console.log("⏭️ Auto-save disabled");
      return false;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log("💾 Saved to localStorage:", data.items?.length || 0, "items");
    return true;
  } catch (e) {
    console.error("Error saving to localStorage:", e);
    return false;
  }
}

/**
 * Очистка данных из localStorage
 */
export function clearLocalStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log("🗑️ Cleared localStorage");
    return true;
  } catch (e) {
    console.error("Error clearing localStorage:", e);
    return false;
  }
}

/**
 * Загрузка настроек
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
    showOnlyUnique: true,
    showDuplicates: false,
  };
}

/**
 * Сохранение настроек
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    console.log("💾 Settings saved");
    return true;
  } catch (e) {
    console.error("Error saving settings:", e);
    return false;
  }
}

/**
 * Получение текущих настроек из UI
 */
export function getCurrentSettings() {
  return {
    autoSave: document.getElementById("autoSave")?.checked || false,
    highlightSearch:
      document.getElementById("highlightSearch")?.checked || true,
    regexMode: document.getElementById("regexMode")?.checked || false,
    showOnlyUnique: document.getElementById("showOnlyUnique")?.checked || true,
    showDuplicates: document.getElementById("showDuplicates")?.checked || false,
  };
}

/**
 * Применение настроек к UI
 */
export function applySettings(settings) {
  if (!settings) return;

  const elements = {
    autoSave: document.getElementById("autoSave"),
    highlightSearch: document.getElementById("highlightSearch"),
    regexMode: document.getElementById("regexMode"),
    showOnlyUnique: document.getElementById("showOnlyUnique"),
    showDuplicates: document.getElementById("showDuplicates"),
  };

  Object.keys(elements).forEach((key) => {
    if (elements[key] && settings[key] !== undefined) {
      elements[key].checked = settings[key];
    }
  });

  console.log("✅ Settings applied");
}

/**
 * Инициализация автосохранения
 */
export function initAutoSave(saveCallback) {
  // Автосохранение каждые 30 секунд
  setInterval(() => {
    const autoSaveEnabled = document.getElementById("autoSave")?.checked;
    if (autoSaveEnabled && saveCallback) {
      saveCallback();
    }
  }, 30000);

  // Сохранение настроек при изменении
  [
    "autoSave",
    "highlightSearch",
    "regexMode",
    "showOnlyUnique",
    "showDuplicates",
  ].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("change", () => {
        saveSettings(getCurrentSettings());
      });
    }
  });

  console.log("✅ Auto-save initialized");
}
