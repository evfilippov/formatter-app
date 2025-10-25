// ============================================
// LOGS - ГЛАВНЫЙ МОДУЛЬ
// ============================================

import {
  postJson,
  downloadText,
  copyToClipboard,
  setText,
  debounce,
} from "../../core/utils.js";
import {
  showNotification,
  showSuccess,
  showError,
} from "../../components/notification.js";
import { openModal, closeModal } from "../../components/modal.js";
import {
  renderLogItems,
  updateChart,
  updateStats,
  toggleCard,
  collapseAllCards,
  expandAllCards,
  jumpToMessage,
} from "./logsUI.js";
import {
  filterItems,
  sortItems,
  updateSearchCounter,
  addToSearchHistory,
  highlightText,
  updateSearchHistoryUI,
} from "./logsSearch.js";
import {
  loadFromLocalStorage,
  saveToLocalStorage,
  clearLocalStorage,
  loadSettings,
  applySettings,
  initAutoSave,
  getCurrentSettings,
} from "./logsStorage.js";

// Состояние модуля
let allLogItems = [];
let filteredItems = [];
let selectedItems = new Set();
let starredItems = new Set();
let compareItems = [];

/**
 * Инициализация модуля логов
 */
export function initLogs() {
  console.log("🚀 Logs Module: Initializing...");

  // Загружаем настройки
  const settings = loadSettings();
  applySettings(settings);

  // Инициализируем обработчики событий
  initEventListeners();

  // Инициализируем автосохранение
  initAutoSave(handleAutoSave);

  // Загружаем данные из localStorage
  loadSavedData();

  console.log("✅ Logs Module: Ready");
}

/**
 * Инициализация обработчиков событий
 */
function initEventListeners() {
  // Поиск
  const searchInput = document.getElementById("logsSearch");
  if (searchInput) {
    searchInput.addEventListener("input", debounce(handleSearch, 300));
  }

  // Фильтры
  const filterSelect = document.getElementById("logsFilter");
  if (filterSelect) {
    filterSelect.addEventListener("change", handleSearch);
  }

  // Сортировка
  const sortSelect = document.getElementById("logsSort");
  if (sortSelect) {
    sortSelect.addEventListener("change", handleSearch);
  }

  // Подсветка поиска
  const highlightCheckbox = document.getElementById("highlightSearch");
  if (highlightCheckbox) {
    highlightCheckbox.addEventListener("change", handleSearch);
  }

  // Regex режим
  const regexCheckbox = document.getElementById("regexMode");
  if (regexCheckbox) {
    regexCheckbox.addEventListener("change", handleSearch);
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

  // Кнопки управления
  const btnCollapseAll = document.getElementById("btnCollapseAll");
  if (btnCollapseAll) {
    btnCollapseAll.addEventListener("click", () => {
      collapseAllCards();
      showSuccess("Все карточки свернуты");
    });
  }

  const btnExpandAll = document.getElementById("btnExpandAll");
  if (btnExpandAll) {
    btnExpandAll.addEventListener("click", () => {
      expandAllCards();
      showSuccess("Все карточки развернуты");
    });
  }

  // Кнопки экспорта
  const btnExportSelected = document.getElementById("btnExportSelected");
  if (btnExportSelected) {
    btnExportSelected.addEventListener("click", handleExportSelected);
  }

  const btnCompare = document.getElementById("btnCompare");
  if (btnCompare) {
    btnCompare.addEventListener("click", handleCompare);
  }

  const btnDownload = document.getElementById("btnDownload");
  if (btnDownload) {
    btnDownload.addEventListener("click", handleDownloadAll);
  }

  const btnCopyExport = document.getElementById("btnCopyExport");
  if (btnCopyExport) {
    btnCopyExport.addEventListener("click", handleCopyExport);
  }

  // Делегирование событий для карточек
  const logsItems = document.getElementById("logsItems");
  if (logsItems) {
    logsItems.addEventListener("click", handleItemAction);
  }

  // Модальное окно сравнения
  const btnCloseCompare = document.getElementById("btnCloseCompare");
  if (btnCloseCompare) {
    btnCloseCompare.addEventListener("click", () => closeModal("compareModal"));
  }

  // Горячие клавиши
  document.addEventListener("keydown", handleHotkeys);
}

/**
 * Обработка действий на карточках (делегирование)
 */
function handleItemAction(e) {
  const target = e.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  const number = parseInt(target.dataset.number);

  e.stopPropagation();

  switch (action) {
    case "toggle":
      toggleCard(number);
      break;
    case "select":
      handleSelection(number);
      break;
    case "star":
      handleStar(number);
      break;
    case "copy-json":
      handleCopyJson(number);
      break;
    case "copy-block":
      handleCopyBlock(number);
      break;
    case "download":
      handleDownloadItem(number);
      break;
    case "compare":
      handleAddToCompare(number);
      break;
  }
}

/**
 * Обработка поиска и фильтрации
 */
function handleSearch() {
  const searchTerm = document.getElementById("logsSearch")?.value.trim() || "";
  const filterType = document.getElementById("logsFilter")?.value || "all";
  const sortBy = document.getElementById("logsSort")?.value || "number";

  // Фильтрация
  filteredItems = filterItems(allLogItems, searchTerm, filterType);

  // Сортировка
  filteredItems = sortItems(filteredItems, sortBy);

  // Обновление UI
  updateSearchCounter(filteredItems.length, allLogItems.length);
  renderLogItems(filteredItems, selectedItems, starredItems, searchTerm);
  updateChart(filteredItems);

  // Добавление в историю
  if (searchTerm) {
    addToSearchHistory(searchTerm);
  }
}

/**
 * Обработка загрузки файла
 */
async function handleFileUpload(e) {
  const file = e.target.files[0];
  const info = document.getElementById("logsFileInfo");

  if (!file) {
    if (info) info.textContent = "";
    return;
  }

  if (info) {
    info.textContent = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
  }

  const text = await file.text();
  const input = document.getElementById("logsInput");
  if (input) {
    input.value = text;
  }

  showSuccess("Файл загружен успешно");
}

/**
 * Обработка нормализации логов
 */
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

  try {
    const result = await postJson("/api/logs/normalize", {
      input,
      replaceEscapedNewlines,
      enabledPatterns: patterns,
      minAfterColonLength,
    });

    if (!result.success) {
      showError(result.message || "Ошибка обработки данных");
      return;
    }

    const data = result.data;

    // Обновляем статистику
    updateStats(data.stats);

    // Обновляем данные
    allLogItems = data.items || [];

    // Добавляем level из raw JSON
    allLogItems.forEach((item) => {
      try {
        const logData = JSON.parse(item.raw || "{}");
        item.level = logData.level || "INFO";
        item.timestamp = logData.timestamp || "";
      } catch (e) {
        item.level = "INFO";
      }
    });

    // Применяем фильтры
    const showOnlyUnique = document.getElementById("showOnlyUnique")?.checked;
    const showDuplicates = document.getElementById("showDuplicates")?.checked;

    filteredItems = allLogItems.filter((item) => {
      const isDup = item.duplicateOf !== null && item.duplicateOf !== undefined;
      if (showOnlyUnique && isDup && !showDuplicates) return false;
      return true;
    });

    // Обновляем UI
    handleSearch();

    // Кнопки экспорта
    const exportText = data.export?.asText || "";
    const btnDownload = document.getElementById("btnDownload");
    const btnCopyExport = document.getElementById("btnCopyExport");

    if (btnDownload) {
      btnDownload.disabled = !exportText;
      btnDownload.onclick = () =>
        downloadText(exportText, data.export?.filename || "output.json");
    }

    if (btnCopyExport) {
      btnCopyExport.disabled = !exportText;
      btnCopyExport.onclick = async () => {
        if (await copyToClipboard(exportText)) {
          showSuccess("Отчет скопирован в буфер обмена");
        }
      };
    }

    // Автосохранение
    handleAutoSave();

    showSuccess(`Обработано ${allLogItems.length} сообщений`);
  } catch (error) {
    console.error("Error processing logs:", error);
    showError("Ошибка обработки данных");
  }
}

/**
 * Обработка выбора элемента
 */
function handleSelection(number) {
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

/**
 * Обработка звёздочки (избранное)
 */
function handleStar(number) {
  if (starredItems.has(number)) {
    starredItems.delete(number);
  } else {
    starredItems.add(number);
  }

  renderLogItems(
    filteredItems,
    selectedItems,
    starredItems,
    document.getElementById("logsSearch")?.value || ""
  );
  handleAutoSave();
}

/**
 * Копирование JSON
 */
async function handleCopyJson(number) {
  const item = allLogItems.find((i) => i.number === number);
  if (item && (await copyToClipboard(item.pretty || ""))) {
    showSuccess("JSON скопирован в буфер обмена");
  }
}

/**
 * Копирование блока
 */
async function handleCopyBlock(number) {
  const item = allLogItems.find((i) => i.number === number);
  if (item) {
    const separator = buildSeparator(
      item.number,
      item.key,
      item.description,
      true
    );
    if (await copyToClipboard(separator + item.pretty)) {
      showSuccess("Блок скопирован в буфер обмена");
    }
  }
}

/**
 * Скачивание элемента
 */
function handleDownloadItem(number) {
  const item = allLogItems.find((i) => i.number === number);
  if (item) {
    downloadText(item.pretty || "", `message-${item.number}.json`);
  }
}

/**
 * Добавление в сравнение
 */
function handleAddToCompare(number) {
  const item = allLogItems.find((i) => i.number === number);
  if (!item) return;

  compareItems.push(item);

  if (compareItems.length >= 2) {
    openCompareModal();
  } else {
    showInfo("Выберите второй элемент для сравнения");
  }
}

/**
 * Открытие модального окна сравнения
 */
function openCompareModal() {
  if (compareItems.length < 2) return;

  setText(
    "compareTitle1",
    `Сообщение ${compareItems[0].number}: ${compareItems[0].key}`
  );
  setText("compareContent1", compareItems[0].pretty);

  setText(
    "compareTitle2",
    `Сообщение ${compareItems[1].number}: ${compareItems[1].key}`
  );
  setText("compareContent2", compareItems[1].pretty);

  openModal("compareModal");
  compareItems = [];
}

/**
 * Экспорт выбранных
 */
function handleExportSelected() {
  const selected = allLogItems.filter((item) => selectedItems.has(item.number));
  if (selected.length > 0) {
    const exportData = selected.map((item) => item.pretty).join("\n\n");
    downloadText(exportData, `selected-messages-${Date.now()}.json`);
    showSuccess(`Экспортировано ${selected.length} сообщений`);
  }
}

/**
 * Сравнение выбранных
 */
function handleCompare() {
  const selected = Array.from(selectedItems).slice(0, 2);
  if (selected.length === 2) {
    compareItems = selected.map((num) =>
      allLogItems.find((i) => i.number === num)
    );
    openCompareModal();
  }
}

/**
 * Скачать всё
 */
function handleDownloadAll() {
  const btn = document.getElementById("btnDownload");
  if (btn && btn.onclick) {
    btn.onclick();
  }
}

/**
 * Копировать экспорт
 */
function handleCopyExport() {
  const btn = document.getElementById("btnCopyExport");
  if (btn && btn.onclick) {
    btn.onclick();
  }
}

/**
 * Обновление кнопок экспорта
 */
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

/**
 * Сброс всех данных
 */
function handleReset() {
  if (!confirm("Вы уверены, что хотите очистить все данные?")) {
    return;
  }

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

  updateSearchHistoryUI();
  updateChart([]);
  updateSearchCounter(0, 0);

  clearLocalStorage();

  showSuccess("Все данные очищены");
}

/**
 * Автосохранение
 */
function handleAutoSave() {
  const data = {
    input: document.getElementById("logsInput")?.value || "",
    items: allLogItems,
    starred: Array.from(starredItems),
    searchHistory: [],
  };

  if (saveToLocalStorage(data)) {
    console.log("💾 Auto-saved");
  }
}

/**
 * Загрузка сохранённых данных
 */
function loadSavedData() {
  const saved = loadFromLocalStorage();
  if (saved && saved.items && saved.items.length > 0) {
    const input = document.getElementById("logsInput");
    if (input) {
      input.value = saved.input || "";
    }

    allLogItems = saved.items || [];
    starredItems = new Set(saved.starred || []);

    filteredItems = allLogItems;
    renderLogItems(filteredItems, selectedItems, starredItems);
    updateSearchHistoryUI();

    showSuccess("Данные восстановлены из автосохранения");
  }
}

/**
 * Горячие клавиши
 */
function handleHotkeys(e) {
  // Ctrl+F - фокус на поиск
  if ((e.ctrlKey || e.metaKey) && e.key === "f") {
    e.preventDefault();
    document.getElementById("logsSearch")?.focus();
  }

  // Ctrl+G - переход к сообщению
  if ((e.ctrlKey || e.metaKey) && e.key === "g") {
    e.preventDefault();
    const number = prompt("Введите номер сообщения:");
    if (number) {
      const num = parseInt(number, 10);
      if (jumpToMessage(num)) {
        showSuccess(`Переход к сообщению №${num}`);
      } else {
        showError(`Сообщение №${num} не найдено`);
      }
    }
  }

  // Ctrl+K - очистка фильтров
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    document.getElementById("logsSearch").value = "";
    document.getElementById("logsFilter").value = "all";
    document.getElementById("logsSort").value = "number";
    handleSearch();
    showSuccess("Фильтры очищены");
  }
}

/**
 * Построение разделителя
 */
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

// Экспорт для глобального доступа (для обратной совместимости)
window.logsModule = {
  toggleCard,
  jumpToMessage,
};
