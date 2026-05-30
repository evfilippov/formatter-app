// Раздел «Логи»: нормализация/дедупликация, поиск/фильтрация/сортировка,
// рендер карточек, выбор/сравнение/экспорт, автосохранение, горячие клавиши.
//
// Всё изменяемое состояние логов приватно для этого модуля (инкапсуляция) —
// другие разделы его не используют. Карточки строятся DOM-узлами (el) и вешают
// обработчики через addEventListener — без inline-onclick и без глобальных функций
// (исключение — closeCompareModal: его дёргает inline-крестик статической модалки).

import { navigate } from "../core/router.js";
import { postJson } from "../core/api.js";
import {
  setText,
  downloadText,
  formatBytes,
  debounce,
  showNotification,
  escapeHtml,
  el,
} from "../core/dom.js";
import {
  highlightText,
  syntaxHighlightJson,
  extractTraceId,
  formatJsonWithLineNumbers,
} from "../core/highlight.js";

// ============================================
// СОСТОЯНИЕ (приватное для модуля)
// ============================================
let allLogItems = [];
let filteredItems = [];
let searchHistory = [];
let selectedItems = new Set();
let starredItems = new Set();
let compareItems = [];

// ============================================
// РАБОТА С LOCALSTORAGE
// ============================================
function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem("logsData");
    if (saved) {
      const data = JSON.parse(saved);
      return data;
    }
  } catch (e) {
    console.error("Error loading from localStorage:", e);
  }
  return null;
}

function saveToLocalStorage() {
  if (document.getElementById("autoSave")?.checked) {
    try {
      const data = {
        input: document.getElementById("logsInput").value,
        items: allLogItems,
        starred: Array.from(starredItems),
        searchHistory: searchHistory,
      };
      localStorage.setItem("logsData", JSON.stringify(data));
      // Без всплывашки: автосейв тихий (срабатывает каждые 30с и на действиях),
      // иначе уведомление спамит. Об ошибке — сообщаем.
    } catch (e) {
      console.error("Error saving to localStorage:", e);
      showNotification("Ошибка автосохранения", "error");
    }
  }
}

// ============================================
// ПОИСК И ФИЛЬТРАЦИЯ
// ============================================
function searchLogs() {
  const searchTerm = document.getElementById("logsSearch").value.trim();
  const filterType = document.getElementById("logsFilter").value;
  const sortBy = document.getElementById("logsSort").value;
  const showOnlyUnique = document.getElementById("showOnlyUnique")?.checked;
  const showDuplicates = document.getElementById("showDuplicates")?.checked;

  filteredItems = allLogItems.filter((item) => {
    // Фильтр дубликатов (раньше применялся только при анализе и затирался — фикс).
    const isDuplicate =
      item.duplicateOf !== null && item.duplicateOf !== undefined;
    if (showOnlyUnique && isDuplicate && !showDuplicates) return false;

    if (filterType !== "all") {
      const itemType = item.key?.toLowerCase() || "";
      const level = item.level?.toLowerCase() || "";

      if (filterType === "request" && !itemType.includes("request"))
        return false;
      if (filterType === "response" && !itemType.includes("response"))
        return false;
      if (filterType === "internal" && !itemType.includes("internal"))
        return false;
      if (filterType === "external" && !itemType.includes("external"))
        return false;
      if (filterType === "info" && level !== "info") return false;
      if (filterType === "debug" && level !== "debug") return false;
      if (filterType === "error" && level !== "error") return false;
    }

    if (searchTerm) {
      const searchIn = [
        item.pretty || "",
        item.key || "",
        item.description || "",
        item.raw || "",
      ]
        .join(" ")
        .toLowerCase();

      const isRegex = document.getElementById("regexMode")?.checked;

      if (isRegex) {
        try {
          const regex = new RegExp(searchTerm, "i");
          return regex.test(searchIn);
        } catch (e) {
          return searchIn.includes(searchTerm.toLowerCase());
        }
      } else {
        return searchIn.includes(searchTerm.toLowerCase());
      }
    }

    return true;
  });

  filteredItems.sort((a, b) => {
    switch (sortBy) {
      case "number":
        return (a.number || 0) - (b.number || 0);
      case "type":
        return (a.key || "").localeCompare(b.key || "");
      case "size":
        return (b.rawLength || 0) - (a.rawLength || 0);
      case "timestamp":
        return (a.timestamp || "").localeCompare(b.timestamp || "");
      default:
        return 0;
    }
  });

  updateSearchCounter();

  if (searchTerm && !searchHistory.includes(searchTerm)) {
    searchHistory.unshift(searchTerm);
    searchHistory = searchHistory.slice(0, 5);
    updateSearchHistory();
  }

  renderLogItems();
}

function updateSearchCounter() {
  const counter = document.getElementById("searchCounter");
  if (counter) {
    if (filteredItems.length !== allLogItems.length) {
      counter.textContent = `${filteredItems.length} из ${allLogItems.length}`;
      counter.classList.add("active");
    } else {
      counter.classList.remove("active");
    }
  }
}

function updateSearchHistory() {
  const historyDiv = document.getElementById("searchHistory");
  if (!historyDiv) return;

  historyDiv.innerHTML = "";

  if (searchHistory.length > 0) {
    const label = document.createElement("span");
    label.textContent = "История: ";
    label.style.fontSize = "12px";
    label.style.color = "var(--text-secondary)";
    historyDiv.appendChild(label);

    searchHistory.forEach((term) => {
      const item = document.createElement("span");
      item.className = "search-history-item";
      item.textContent = term;
      item.onclick = () => {
        document.getElementById("logsSearch").value = term;
        searchLogs();
      };
      historyDiv.appendChild(item);
    });
  }
}

// ============================================
// РЕНДЕРИНГ
// ============================================
// Пакетный рендер: на больших логах строим карточки порциями (а не тысячи
// DOM-узлов сразу) — это снижает и память, и стоимость каждого перерендера
// (например, на каждый ввод в поиске). Остальное (поиск/фильтр/экспорт/счётчики)
// по-прежнему работает по полному набору filteredItems.
const RENDER_BATCH = 150;
let shownCount = 0;

function buildItemCard(item, searchTerm, highlightOn) {
  const isDup = item.duplicateOf !== null && item.duplicateOf !== undefined;
  const isSelected = selectedItems.has(item.number);
  const isStarred = starredItems.has(item.number);
  const level = item.level?.toLowerCase() || "info";

  let timestamp = "";
  try {
    timestamp = JSON.parse(item.raw || "{}").timestamp || "";
  } catch (e) {
    timestamp = item.timestamp || "";
  }

  const traceId = extractTraceId(item);
  const traceIdShort =
    traceId.length > 18 ? traceId.slice(0, 18) + "…" : traceId;

  // Тело (всё — уже экранированный HTML, вставляется через ключ html в el()).
  // «Подсветка» (highlightOn) — мастер-тумблер: ВЫКЛ → обычный текст без цвета;
  // ВКЛ → подсветка совпадений при активном поиске, иначе синтаксис JSON
  // (кэш на элементе: pretty не меняется → regex считаем один раз).
  let body;
  if (!highlightOn) {
    body = escapeHtml(item.pretty || "");
  } else if (searchTerm) {
    body = highlightText(item.pretty || "", searchTerm);
  } else {
    body = item._synHi ??= syntaxHighlightJson(item.pretty || "");
  }

  const checkbox = el("input", {
    type: "checkbox",
    class: "item-checkbox",
    checked: isSelected,
    on: {
      click: (e) => {
        e.stopPropagation();
        toggleSelection(item.number);
      },
    },
  });

  const header = el("div", { class: "item-header", on: { click: () => toggleCard(item.number) } }, [
    el("div", { class: "item-header-left" }, [
      checkbox,
      el("div", { class: "item-title" }, [
        el("span", { class: `item-type-icon ${item.key?.toLowerCase() || ""}` }),
        `СООБЩЕНИЕ ${item.number}: `,
        el("span", { html: highlightText(item.key?.toUpperCase() || "", searchTerm) }),
      ]),
      traceId
        ? el("span", { class: "badge", title: `traceId: ${traceId}`, text: `🔗 ${traceIdShort}` })
        : null,
      isDup ? el("span", { class: "badge dup", text: `Дубликат №${item.duplicateOf}` }) : null,
    ]),
    el("div", { class: "item-header-right" }, [
      el("span", { class: "badge", title: "Строк", text: `📝 ${item.lines}` }),
      el("span", { class: "badge", title: "Размер", text: `📦 ${formatBytes(item.rawLength)}` }),
      el("span", { class: "item-toggle", text: "▼" }),
    ]),
  ]);

  const meta = el("div", { class: "item-meta" }, [
    timestamp ? el("span", { text: `⏰ ${new Date(timestamp).toLocaleString("ru-RU")}` }) : null,
    el("span", { text: `📊 Значений: ${item.valueCount}` }),
    el("span", { text: `🔤 Сырой размер: ${item.rawLength} байт` }),
  ]);

  const content = el("div", { class: "item-content" }, [
    item.description
      ? el("div", { class: "item-description", html: highlightText(item.description, searchTerm) })
      : null,
    el("pre", { class: "output line-numbers", html: formatJsonWithLineNumbers(body) }),
  ]);

  const buttons = el("div", { class: "buttons" }, [
    el("button", { text: "📋 Копировать JSON", on: { click: () => copyJson(item.number) } }),
    el("button", { text: "📄 Копировать блок", on: { click: () => copyBlock(item.number) } }),
    el("button", { text: "💾 Скачать", on: { click: () => downloadItem(item.number) } }),
    el("button", { class: "secondary", text: "🔍 Сравнить", on: { click: () => addToCompare(item.number) } }),
  ]);

  const star = el("span", {
    class: `item-star ${isStarred ? "starred" : ""}`,
    title: isStarred ? "Убрать из избранного" : "Добавить в избранное",
    text: isStarred ? "⭐" : "☆",
    on: { click: () => toggleStar(item.number) },
  });

  const card = el(
    "div",
    { class: `item-card expanded log-level-${level}${isSelected ? " selected" : ""}` },
    [header, meta, content, buttons, star]
  );
  card.dataset.itemNumber = item.number;
  return card;
}

function renderLogItems() {
  const itemsDiv = document.getElementById("logsItems");
  if (!itemsDiv) return;

  itemsDiv.innerHTML = "";
  shownCount = 0;
  appendLogBatch();
  updateChart();
}

function appendLogBatch() {
  const itemsDiv = document.getElementById("logsItems");
  if (!itemsDiv) return;

  // Старую кнопку «показать ещё» убираем — добавим заново в конце, если нужно.
  itemsDiv.querySelector(".show-more-btn")?.remove();

  const searchTerm = document.getElementById("logsSearch").value.trim();
  const highlightOn =
    document.getElementById("highlightSearch")?.checked !== false;

  const end = Math.min(shownCount + RENDER_BATCH, filteredItems.length);
  const frag = document.createDocumentFragment();
  for (let i = shownCount; i < end; i++) {
    frag.appendChild(buildItemCard(filteredItems[i], searchTerm, highlightOn));
  }
  itemsDiv.appendChild(frag); // вставка пачки одним рефлоу
  shownCount = end;

  const remaining = filteredItems.length - shownCount;
  if (remaining > 0) {
    const btn = document.createElement("button");
    btn.className = "show-more-btn secondary";
    btn.textContent = `Показать ещё (осталось ${remaining})`;
    btn.addEventListener("click", appendLogBatch);
    itemsDiv.appendChild(btn);
  }
}

// Дорендерить все оставшиеся пачки (для перехода к сообщению за порогом).
function renderAllRemaining() {
  while (shownCount < filteredItems.length) appendLogBatch();
}

// ============================================
// УПРАВЛЕНИЕ КАРТОЧКАМИ
// ============================================
function toggleCard(number) {
  const card = document.querySelector(
    `.item-card[data-item-number="${number}"]`
  );
  if (card) {
    card.classList.toggle("collapsed");
    card.classList.toggle("expanded");
  }
}

function toggleSelection(number) {
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

function toggleStar(number) {
  if (starredItems.has(number)) {
    starredItems.delete(number);
  } else {
    starredItems.add(number);
  }
  renderLogItems();
  saveToLocalStorage();
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

// ============================================
// ДЕЙСТВИЯ С ЭЛЕМЕНТАМИ
// ============================================
function copyJson(number) {
  const item = allLogItems.find((i) => i.number === number);
  if (item) {
    navigator.clipboard.writeText(item.pretty || "");
    showNotification("JSON скопирован в буфер обмена");
  }
}

function copyBlock(number) {
  const item = allLogItems.find((i) => i.number === number);
  if (item) {
    const sep = buildSeparator(item.number, item.key, item.description, true);
    navigator.clipboard.writeText(sep + item.pretty);
    showNotification("Блок скопирован в буфер обмена");
  }
}

function downloadItem(number) {
  const item = allLogItems.find((i) => i.number === number);
  if (item) {
    downloadText(item.pretty || "", `message-${item.number}.json`);
  }
}

// ============================================
// СРАВНЕНИЕ
// ============================================
function addToCompare(number) {
  const item = allLogItems.find((i) => i.number === number);
  if (item) {
    compareItems.push(item);
    if (compareItems.length >= 2) {
      openCompareModal();
    } else {
      showNotification("Выберите второй элемент для сравнения");
    }
  }
}

function openCompareModal() {
  if (compareItems.length < 2) return;

  const modal = document.getElementById("compareModal");
  if (!modal) return;

  document.getElementById(
    "compareTitle1"
  ).textContent = `Сообщение ${compareItems[0].number}: ${compareItems[0].key}`;
  document.getElementById("compareContent1").textContent =
    compareItems[0].pretty;

  document.getElementById(
    "compareTitle2"
  ).textContent = `Сообщение ${compareItems[1].number}: ${compareItems[1].key}`;
  document.getElementById("compareContent2").textContent =
    compareItems[1].pretty;

  modal.classList.remove("hidden");
  compareItems = [];
}

export function closeCompareModal() {
  const modal = document.getElementById("compareModal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

// ============================================
// ГРАФИК
// ============================================
function updateChart() {
  const chart = document.getElementById("logsChart");
  if (!chart) return;

  const types = {};
  filteredItems.forEach((item) => {
    const type = item.key?.split("_")[0]?.toLowerCase() || "other";
    types[type] = (types[type] || 0) + 1;
  });

  if (Object.keys(types).length > 0) {
    chart.classList.add("active");
    chart.innerHTML = "";

    const max = Math.max(...Object.values(types));

    Object.entries(types).forEach(([type, count]) => {
      const bar = document.createElement("div");
      bar.className = "chart-bar";
      bar.style.height = `${(count / max) * 100}%`;
      bar.dataset.label = `${type} (${count})`;
      bar.title = `${type}: ${count} сообщений`;
      chart.appendChild(bar);
    });
  } else {
    chart.classList.remove("active");
  }
}

// ============================================
// КНОПКИ УПРАВЛЕНИЯ
// ============================================
document.getElementById("btnCollapseAll")?.addEventListener("click", () => {
  document.querySelectorAll(".item-card").forEach((card) => {
    card.classList.add("collapsed");
    card.classList.remove("expanded");
  });
  showNotification("Все карточки свернуты");
});

document.getElementById("btnExpandAll")?.addEventListener("click", () => {
  document.querySelectorAll(".item-card").forEach((card) => {
    card.classList.remove("collapsed");
    card.classList.add("expanded");
  });
  showNotification("Все карточки развернуты");
});

document.getElementById("btnExportSelected")?.addEventListener("click", () => {
  const selected = allLogItems.filter((item) => selectedItems.has(item.number));
  if (selected.length > 0) {
    const exportData = selected.map((item) => item.pretty).join("\n\n");
    downloadText(exportData, `selected-messages-${Date.now()}.json`);
    showNotification(`Экспортировано ${selected.length} сообщений`);
  }
});

document.getElementById("btnCompare")?.addEventListener("click", () => {
  const selected = Array.from(selectedItems).slice(0, 2);
  if (selected.length === 2) {
    compareItems = selected.map((num) =>
      allLogItems.find((i) => i.number === num)
    );
    openCompareModal();
  }
});

// ============================================
// СЛУШАТЕЛИ ПОИСКА/ФИЛЬТРОВ
// ============================================
document
  .getElementById("logsSearch")
  ?.addEventListener("input", debounce(searchLogs, 300));
document.getElementById("logsFilter")?.addEventListener("change", searchLogs);
document.getElementById("logsSort")?.addEventListener("change", searchLogs);
document
  .getElementById("highlightSearch")
  ?.addEventListener("change", searchLogs);
document.getElementById("regexMode")?.addEventListener("change", searchLogs);
// Флаги уникальные/дубликаты применяются на лету.
document
  .getElementById("showOnlyUnique")
  ?.addEventListener("change", searchLogs);
document
  .getElementById("showDuplicates")
  ?.addEventListener("change", searchLogs);

// ============================================
// ОБРАБОТКА ФАЙЛОВ
// ============================================
document.getElementById("logsFile").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  const info = document.getElementById("logsFileInfo");
  const picker = document.getElementById("logsFilePicker");
  if (!f) {
    info.textContent = "Файл не выбран";
    picker?.classList.remove("has-file");
    return;
  }
  info.textContent = `${f.name} (${formatBytes(f.size)})`;
  picker?.classList.add("has-file");
  const txt = await f.text();
  document.getElementById("logsInput").value = txt;
  showNotification("Файл загружен успешно");
});

// ============================================
// ОСНОВНАЯ ОБРАБОТКА ЛОГОВ
// ============================================
// Полный набор паттернов извлечения (UI-выбор убран — извлекаем по всем).
const ALL_EXTRACTION_PATTERNS = [
  "internalRequest",
  "externalRequest",
  "internalResponse",
  "externalResponse",
  "request",
  "args",
  "response",
  "afterColon",
];

document.getElementById("btnNormalize").addEventListener("click", async () => {
  const input = document.getElementById("logsInput").value;

  if (!input.trim()) {
    showNotification("Вставьте лог в поле ввода для анализа", "error");
    return;
  }

  // Паттерны извлечения всегда включены целиком — поведение 1:1 с прежним
  // «все галочки включены» (включая args).
  const pats = ALL_EXTRACTION_PATTERNS;
  const replaceEscapedNewlines = document.getElementById("replaceEsc").checked;
  const minAfterColonLength = parseInt(
    document.getElementById("minLen").value || "50",
    10
  );

  const body = {
    input,
    replaceEscapedNewlines,
    enabledPatterns: pats,
    minAfterColonLength,
  };

  try {
    const res = await postJson("/api/logs/normalize", body);

    setText(
      "logsStats",
      `📊 Записей: ${res.stats.totalEntries} | ✅ Извлечено: ${res.stats.extracted} | 🎯 Уникальных: ${res.stats.unique} | 📑 Дубликатов: ${res.stats.duplicates} | ⏱️ ${res.stats.durationMs} мс`
    );

    const exportText = res.export?.asText || "";
    const btnDownload = document.getElementById("btnDownload");
    const btnCopyExport = document.getElementById("btnCopyExport");
    btnDownload.disabled = !exportText;
    btnCopyExport.disabled = !exportText;
    btnDownload.onclick = () =>
      downloadText(exportText, res.export?.filename || "output.json");
    btnCopyExport.onclick = () => {
      navigator.clipboard.writeText(exportText);
      showNotification("Отчет скопирован в буфер обмена");
    };

    allLogItems = res.items || [];

    allLogItems.forEach((item) => {
      try {
        const logData = JSON.parse(item.raw || "{}");
        item.level = logData.level || "INFO";
        item.timestamp = logData.timestamp || "";
      } catch (e) {
        item.level = "INFO";
      }
    });

    // Фильтрация (вкл. уникальные/дубликаты), сортировка и рендер — в searchLogs.
    searchLogs();
    saveToLocalStorage();
    document.getElementById("btnShowLastResult")?.classList.remove("hidden");
    navigate("#logsResult"); // переход на страницу результатов
    showNotification(`Обработано ${allLogItems.length} сообщений`, "success");
  } catch (error) {
    console.error("Error processing logs:", error);
    showNotification("Ошибка обработки данных", "error");
  }
});

// ============================================
// СБРОС
// ============================================
document.getElementById("btnLogsReset").addEventListener("click", () => {
  document.getElementById("logsInput").value = "";
  document.getElementById("logsFile").value = "";
  document.getElementById("logsSearch").value = "";
  setText("logsFileInfo", "Файл не выбран");
  document.getElementById("logsFilePicker")?.classList.remove("has-file");
  setText("logsStats", "");
  document.getElementById("logsItems").innerHTML = "";
  document.getElementById("btnDownload").disabled = true;
  document.getElementById("btnCopyExport").disabled = true;
  document.getElementById("btnExportSelected").disabled = true;
  document.getElementById("btnCompare").disabled = true;

  allLogItems = [];
  filteredItems = [];
  selectedItems.clear();
  starredItems.clear();
  searchHistory = [];

  if (document.getElementById("autoSave")?.checked) {
    localStorage.removeItem("logsData");
  }

  updateSearchHistory();
  updateChart();
  updateSearchCounter();
  document.getElementById("btnShowLastResult")?.classList.add("hidden");

  showNotification("Все данные очищены", "success");
});

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

// ============================================
// АВТОЗАГРУЗКА ИЗ LOCALSTORAGE
// ============================================
window.addEventListener("load", () => {
  const saved = loadFromLocalStorage();
  if (saved && saved.items && saved.items.length > 0) {
    document.getElementById("logsInput").value = saved.input || "";
    allLogItems = saved.items || [];
    starredItems = new Set(saved.starred || []);
    searchHistory = saved.searchHistory || [];

    filteredItems = allLogItems;
    renderLogItems();
    updateSearchHistory();
    document.getElementById("btnShowLastResult")?.classList.remove("hidden");
    showNotification("Данные восстановлены из автосохранения", "success");
  }
});

// ============================================
// ГОРЯЧИЕ КЛАВИШИ
// ============================================
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "f") {
    e.preventDefault();
    document.getElementById("logsSearch")?.focus();
  }

  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    clearFilters();
  }

  if ((e.ctrlKey || e.metaKey) && e.key === "g") {
    e.preventDefault();
    jumpToMessage();
  }

  if (e.key === "Escape") {
    closeCompareModal();
  }
});

function clearFilters() {
  document.getElementById("logsSearch").value = "";
  document.getElementById("logsFilter").value = "all";
  document.getElementById("logsSort").value = "number";

  filteredItems = allLogItems;
  renderLogItems();
  updateSearchCounter();
  showNotification("Фильтры очищены");
}

// Неблокирующий ввод номера сообщения через нативный <dialog> (вместо prompt()).
function jumpToMessage() {
  const dialog = document.getElementById("jumpDialog");
  const input = document.getElementById("jumpInput");
  if (!dialog || !input) return;

  input.value = "";
  dialog.addEventListener(
    "close",
    () => {
      if (dialog.returnValue !== "go") return;
      scrollToMessage(parseInt(input.value, 10));
    },
    { once: true }
  );
  dialog.showModal();
}

function scrollToMessage(num) {
  if (!num) return;
  let card = document.querySelector(`.item-card[data-item-number="${num}"]`);

  // Карточка могла остаться за порогом пакетного рендера — дорендерим и поищем.
  if (!card) {
    renderAllRemaining();
    card = document.querySelector(`.item-card[data-item-number="${num}"]`);
  }

  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("expanded");
    card.classList.remove("collapsed");

    card.style.animation = "none";
    setTimeout(() => {
      card.style.animation = "pulse 0.5s ease-in-out";
    }, 10);

    showNotification(`Переход к сообщению №${num}`);
  } else {
    showNotification(`Сообщение №${num} не найдено`, "error");
  }
}

// ============================================
// ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА ПО КЛИКУ ВНЕ
// ============================================
document.getElementById("compareModal")?.addEventListener("click", (e) => {
  if (e.target.id === "compareModal") {
    closeCompareModal();
  }
});

// ============================================
// DRAG & DROP ДЛЯ ЗАГРУЗКИ ФАЙЛОВ
// ============================================
const logsInput = document.getElementById("logsInput");
if (logsInput) {
  const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    logsInput.addEventListener(eventName, preventDefaults, false);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    logsInput.addEventListener(
      eventName,
      () => {
        logsInput.style.borderColor = "var(--primary)";
        logsInput.style.background = "var(--primary-light)";
      },
      false
    );
  });

  ["dragleave", "drop"].forEach((eventName) => {
    logsInput.addEventListener(
      eventName,
      () => {
        logsInput.style.borderColor = "var(--border)";
        logsInput.style.background = "var(--bg-code)";
      },
      false
    );
  });

  logsInput.addEventListener(
    "drop",
    async (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        const text = await file.text();
        logsInput.value = text;
        showNotification(`Файл ${file.name} загружен через Drag & Drop`);
      }
    },
    false
  );
}

// ============================================
// АВТОСОХРАНЕНИЕ КАЖДЫЕ 30 СЕКУНД
// ============================================
setInterval(() => {
  if (allLogItems.length > 0 && document.getElementById("autoSave")?.checked) {
    saveToLocalStorage();
  }
}, 30000);

// ============================================
// ПРЕДУПРЕЖДЕНИЕ ПЕРЕД УХОДОМ
// ============================================
window.addEventListener("beforeunload", (e) => {
  if (allLogItems.length > 0 && !document.getElementById("autoSave")?.checked) {
    e.preventDefault();
    e.returnValue =
      "У вас есть несохраненные данные. Вы уверены, что хотите покинуть страницу?";
    return e.returnValue;
  }
});

// ============================================
// СОХРАНЕНИЕ НАСТРОЕК
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  const settings = localStorage.getItem("logsSettings");
  if (settings) {
    try {
      const parsed = JSON.parse(settings);
      if (parsed.autoSave !== undefined) {
        document.getElementById("autoSave").checked = parsed.autoSave;
      }
      if (parsed.highlightSearch !== undefined) {
        document.getElementById("highlightSearch").checked =
          parsed.highlightSearch;
      }
      if (parsed.regexMode !== undefined) {
        document.getElementById("regexMode").checked = parsed.regexMode;
      }
    } catch (e) {
      console.error("Error loading settings:", e);
    }
  }

  ["autoSave", "highlightSearch", "regexMode"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      const newSettings = {
        autoSave: document.getElementById("autoSave")?.checked,
        highlightSearch: document.getElementById("highlightSearch")?.checked,
        regexMode: document.getElementById("regexMode")?.checked,
      };
      localStorage.setItem("logsSettings", JSON.stringify(newSettings));
    });
  });
});
