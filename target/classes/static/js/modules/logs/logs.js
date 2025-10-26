// ============================================
// LOGS MODULE - MAIN
// ============================================

import { normalizeLogsAPI } from "../../core/api.js";
import { setText, downloadText, debounce } from "../../core/utils.js";
import {
  showSuccess,
  showError,
  showWarning,
  showInfo,
} from "../../components/notification.js";
import { initLogsUI, renderLogItems, updateChart } from "./logsUI.js";
import {
  initLogsSearch,
  searchLogs as performSearch,
  updateSearchCounter,
  updateSearchHistory,
} from "./logsSearch.js";
import {
  loadFromLocalStorage,
  saveToLocalStorage,
  loadSettings,
  saveSettings,
} from "./logsStorage.js";

// ============================================
// СОСТОЯНИЕ МОДУЛЯ
// ============================================
export let allLogItems = [];
export let filteredItems = [];
export let searchHistory = [];
export let selectedItems = new Set();
export let starredItems = new Set();
let initialized = false;

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
export function initLogs() {
  if (initialized) {
    console.log("📋 Logs already initialized");
    return;
  }

  console.log("📋 Logs module initializing...");

  try {
    // Инициализация UI
    initLogsUI();

    // Инициализация поиска
    initLogsSearch();

    // Загрузка настроек
    loadSettings();

    // Загрузка данных из localStorage
    const saved = loadFromLocalStorage();
    if (saved && saved.items && saved.items.length > 0) {
      document.getElementById("logsInput").value = saved.input || "";
      allLogItems = saved.items || [];
      starredItems = new Set(saved.starred || []);
      searchHistory = saved.searchHistory || [];
      filteredItems = allLogItems;
      renderLogItems(filteredItems, allLogItems, selectedItems, starredItems);
      updateSearchHistory(searchHistory);
      showSuccess("Данные восстановлены из автосохранения");
    }

    // Привязка обработчиков
    attachEventListeners();

    // Автосохранение каждые 30 секунд
    setInterval(() => {
      if (
        allLogItems.length > 0 &&
        document.getElementById("autoSave")?.checked
      ) {
        saveToLocalStorage({
          input: document.getElementById("logsInput").value,
          items: allLogItems,
          starred: Array.from(starredItems),
          searchHistory,
        });
      }
    }, 30000);

    initialized = true;
    console.log("✅ Logs module initialized");
  } catch (error) {
    console.error("❌ Logs initialization failed:", error);
  }
}

// ============================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================
function attachEventListeners() {
  // Поиск
  const searchInput = document.getElementById("logsSearch");
  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce(() => {
        performSearch(allLogItems, selectedItems, starredItems);
      }, 300)
    );
  }

  // Фильтры
  const filter = document.getElementById("logsFilter");
  if (filter) {
    filter.addEventListener("change", () => {
      performSearch(allLogItems, selectedItems, starredItems);
    });
  }

  // Сортировка
  const sort = document.getElementById("logsSort");
  if (sort) {
    sort.addEventListener("change", () => {
      performSearch(allLogItems, selectedItems, starredItems);
    });
  }

  // Подсветка
  const highlight = document.getElementById("highlightSearch");
  if (highlight) {
    highlight.addEventListener("change", () => {
      performSearch(allLogItems, selectedItems, starredItems);
    });
  }

  // Regex режим
  const regex = document.getElementById("regexMode");
  if (regex) {
    regex.addEventListener("change", () => {
      performSearch(allLogItems, selectedItems, starredItems);
    });
  }

  // Загрузка файла
  const fileInput = document.getElementById("logsFile");
  if (fileInput) {
    fileInput.addEventListener("change", handleFileUpload);
  }

  // Кнопка нормализации
  const btnNormalize = document.getElementById("btnNormalize");
  if (btnNormalize) {
    btnNormalize.addEventListener("click", handleNormalize);
  }

  // Кнопка сброса
  const btnReset = document.getElementById("btnLogsReset");
  if (btnReset) {
    btnReset.addEventListener("click", handleReset);
  }

  // Кнопки управления карточками
  const btnCollapseAll = document.getElementById("btnCollapseAll");
  if (btnCollapseAll) {
    btnCollapseAll.addEventListener("click", () => {
      document.querySelectorAll(".item-card").forEach((card) => {
        card.classList.add("collapsed");
        card.classList.remove("expanded");
      });
      showSuccess("Все карточки свернуты");
    });
  }

  const btnExpandAll = document.getElementById("btnExpandAll");
  if (btnExpandAll) {
    btnExpandAll.addEventListener("click", () => {
      document.querySelectorAll(".item-card").forEach((card) => {
        card.classList.remove("collapsed");
        card.classList.add("expanded");
      });
      showSuccess("Все карточки развернуты");
    });
  }

  // Экспорт выбранных
  const btnExportSelected = document.getElementById("btnExportSelected");
  if (btnExportSelected) {
    btnExportSelected.addEventListener("click", exportSelected);
  }

  // Сравнение
  const btnCompare = document.getElementById("btnCompare");
  if (btnCompare) {
    btnCompare.addEventListener("click", compareSelected);
  }

  // Настройки
  ["autoSave", "highlightSearch", "regexMode"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
        saveSettings({
          autoSave: document.getElementById("autoSave")?.checked,
          highlightSearch: document.getElementById("highlightSearch")?.checked,
          regexMode: document.getElementById("regexMode")?.checked,
        });
      });
    }
  });
}

// ============================================
// ОБРАБОТКА ФАЙЛОВ
// ============================================
async function handleFileUpload(e) {
  const file = e.target.files[0];
  const info = document.getElementById("logsFileInfo");

  if (!file) {
    if (info) info.textContent = "";
    return;
  }

  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  if (info) {
    info.textContent = `${file.name} (${formatBytes(file.size)})`;
  }

  const text = await file.text();
  const input = document.getElementById("logsInput");
  if (input) {
    input.value = text;
  }

  showSuccess("Файл загружен успешно");
}

// ============================================
// НОРМАЛИЗАЦИЯ ЛОГОВ
// ============================================
async function handleNormalize() {
  const input = document.getElementById("logsInput")?.value;

  if (!input?.trim()) {
    showError("Введите данные для обработки");
    return;
  }

  const patterns = Array.from(document.querySelectorAll(".pat:checked")).map(
    (x) => x.value
  );
  const replaceEscapedNewlines =
    document.getElementById("replaceEsc")?.checked || false;
  const minAfterColonLength = parseInt(
    document.getElementById("minLen")?.value || "50",
    10
  );

  const body = {
    input,
    replaceEscapedNewlines,
    enabledPatterns: patterns,
    minAfterColonLength,
  };

  try {
    const res = await normalizeLogsAPI(body);

    // Статистика
    setText(
      "logsStats",
      `📊 Записей: ${res.stats.totalEntries} | ✅ Извлечено: ${res.stats.extracted} | ` +
        `🎯 Уникальных: ${res.stats.unique} | 📑 Дубликатов: ${res.stats.duplicates} | ` +
        `⏱️ ${res.stats.durationMs} мс`
    );

    // Экспорт
    const exportText = res.export?.asText || "";
    const btnDownload = document.getElementById("btnDownload");
    const btnCopyExport = document.getElementById("btnCopyExport");

    if (btnDownload) {
      btnDownload.disabled = !exportText;
      btnDownload.onclick = () =>
        downloadText(exportText, res.export?.filename || "output.json");
    }

    if (btnCopyExport) {
      btnCopyExport.disabled = !exportText;
      btnCopyExport.onclick = () => {
        navigator.clipboard.writeText(exportText);
        showSuccess("Отчет скопирован в буфер обмена");
      };
    }

    // Обработка элементов
    const showOnlyUnique = document.getElementById("showOnlyUnique")?.checked;
    const showDuplicates = document.getElementById("showDuplicates")?.checked;

    allLogItems = res.items || [];

    // Парсинг уровня логов
    allLogItems.forEach((item) => {
      try {
        const logData = JSON.parse(item.raw || "{}");
        item.level = logData.level || "INFO";
        item.timestamp = logData.timestamp || "";
      } catch (e) {
        item.level = "INFO";
      }
    });

    // Фильтрация дубликатов
    filteredItems = allLogItems.filter((item) => {
      const isDup = item.duplicateOf !== null && item.duplicateOf !== undefined;
      if (showOnlyUnique && isDup && !showDuplicates) return false;
      return true;
    });

    performSearch(allLogItems, selectedItems, starredItems);

    saveToLocalStorage({
      input,
      items: allLogItems,
      starred: Array.from(starredItems),
      searchHistory,
    });

    showSuccess(`Обработано ${allLogItems.length} сообщений`);
  } catch (error) {
    console.error("Error processing logs:", error);
    showError("Ошибка обработки данных");
  }
}

// ============================================
// СБРОС
// ============================================
function handleReset() {
  document.getElementById("logsInput").value = "";
  document.getElementById("logsFile").value = "";
  document.getElementById("logsSearch").value = "";
  setText("logsFileInfo", "");
  setText("logsStats", "");
  document.getElementById("logsItems").innerHTML = "";

  const btnDownload = document.getElementById("btnDownload");
  const btnCopyExport = document.getElementById("btnCopyExport");
  const btnExportSelected = document.getElementById("btnExportSelected");
  const btnCompare = document.getElementById("btnCompare");

  if (btnDownload) btnDownload.disabled = true;
  if (btnCopyExport) btnCopyExport.disabled = true;
  if (btnExportSelected) btnExportSelected.disabled = true;
  if (btnCompare) btnCompare.disabled = true;

  allLogItems = [];
  filteredItems = [];
  selectedItems.clear();
  starredItems.clear();
  searchHistory = [];

  if (document.getElementById("autoSave")?.checked) {
    localStorage.removeItem("logsData");
  }

  updateSearchHistory([]);
  updateChart([], []);
  updateSearchCounter(0, 0);

  showSuccess("Все данные очищены");
}

// ============================================
// ЭКСПОРТ ВЫБРАННЫХ
// ============================================
function exportSelected() {
  const selected = allLogItems.filter((item) => selectedItems.has(item.number));
  if (selected.length > 0) {
    const exportData = selected.map((item) => item.pretty).join("\n\n");
    downloadText(exportData, `selected-messages-${Date.now()}.json`);
    showSuccess(`Экспортировано ${selected.length} сообщений`);
  }
}

// ============================================
// СРАВНЕНИЕ
// ============================================
function compareSelected() {
  const selected = Array.from(selectedItems).slice(0, 2);
  if (selected.length === 2) {
    const items = selected.map((num) =>
      allLogItems.find((i) => i.number === num)
    );
    openCompareModal(items);
  }
}

function openCompareModal(items) {
  const modal = document.getElementById("compareModal");
  if (!modal || items.length < 2) return;

  document.getElementById(
    "compareTitle1"
  ).textContent = `Сообщение ${items[0].number}: ${items[0].key}`;
  document.getElementById("compareContent1").textContent = items[0].pretty;

  document.getElementById(
    "compareTitle2"
  ).textContent = `Сообщение ${items[1].number}: ${items[1].key}`;
  document.getElementById("compareContent2").textContent = items[1].pretty;

  modal.classList.remove("hidden");
}

// ============================================
// ЭКСПОРТ ДЛЯ ГЛОБАЛЬНЫХ ФУНКЦИЙ
// ============================================
export function toggleCard(number) {
  const card = document.querySelector(
    `.item-card[data-item-number="${number}"]`
  );
  if (card) {
    card.classList.toggle("collapsed");
    card.classList.toggle("expanded");
  }
}

export function toggleSelection(number) {
  if (selectedItems.has(number)) {
    selectedItems.delete(number);
  } else {
    selectedItems.add(number);
  }

  const card = document.querySelector(
    `.item-card[data-item-number="${number}"]`
  );
  if (card) {
    card.classList.toggle("selected");
  }

  updateExportButtons();
}

export function toggleStar(number) {
  if (starredItems.has(number)) {
    starredItems.delete(number);
  } else {
    starredItems.add(number);
  }
  renderLogItems(filteredItems, allLogItems, selectedItems, starredItems);
  saveToLocalStorage({
    input: document.getElementById("logsInput").value,
    items: allLogItems,
    starred: Array.from(starredItems),
    searchHistory,
  });
}

function updateExportButtons() {
  const btnExportSelected = document.getElementById("btnExportSelected");
  const btnCompare = document.getElementById("btnCompare");

  if (btnExportSelected) {
    btnExportSelected.disabled = selectedItems.size === 0;
  }

  if (btnCompare) {
    btnCompare.disabled = selectedItems.size !== 2;
  }
}

export function copyJson(number) {
  const item = allLogItems.find((i) => i.number === number);
  if (item) {
    navigator.clipboard.writeText(item.pretty || "");
    showSuccess("JSON скопирован в буфер обмена");
  }
}

export function copyBlock(number) {
  const item = allLogItems.find((i) => i.number === number);
  if (item) {
    const sep = buildSeparator(item.number, item.key, item.description, true);
    navigator.clipboard.writeText(sep + item.pretty);
    showSuccess("Блок скопирован в буфер обмена");
  }
}

export function downloadItem(number) {
  const item = allLogItems.find((i) => i.number === number);
  if (item) {
    downloadText(item.pretty || "", `message-${item.number}.json`);
  }
}

export function addToCompare(number) {
  const item = allLogItems.find((i) => i.number === number);
  if (!item) return;

  const compareItems = window.compareItems || [];
  compareItems.push(item);
  window.compareItems = compareItems;

  if (compareItems.length >= 2) {
    openCompareModal(compareItems);
    window.compareItems = [];
  } else {
    showInfo("Выберите второй элемент для сравнения");
  }
}

export function closeCompareModal() {
  const modal = document.getElementById("compareModal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

function buildSeparator(number, key, description, first) {
  const line = "/".repeat(70) + "\n";
  let s = "";
  if (first) {
    s += line;
    s += `// СООБЩЕНИЕ ${number}: ${key.toUpperCase()}\n`;
    if (description && description !== "Без описания")
      s += `// ${description}\n`;
    s += line + "\n\n";
  } else {
    s += "\n\n" + line;
    s += `// СООБЩЕНИЕ ${number}: ${key.toUpperCase()}\n`;
    if (description && description !== "Без описания")
      s += `// ${description}\n`;
    s += line + "\n\n";
  }
  return s;
}
