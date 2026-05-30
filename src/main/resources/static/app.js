// ============================================
// НАВИГАЦИЯ
// ============================================
function navigate(hash) {
  window.location.hash = hash;
  onRoute();
}

function onRoute() {
  const routes = ["home", "logs", "logsResult", "json", "xml"];
  const h = window.location.hash?.substring(1) || "home";
  for (const r of routes) {
    document.getElementById(r)?.classList.toggle("hidden", r !== h);
  }
  // Страница результатов логов подсвечивает в сайдбаре пункт «Логи».
  const navKey = h === "logsResult" ? "logs" : h;
  document.querySelectorAll(".sidebar-nav a[data-route]").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === navKey);
  });
}

window.addEventListener("hashchange", onRoute);
window.addEventListener("load", onRoute);

// ============================================
// ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ (тёмная / светлая)
// ============================================
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("theme", theme);
  } catch (e) {}
  const icon = document.getElementById("themeToggleIcon");
  const label = document.getElementById("themeToggleLabel");
  if (icon) icon.textContent = theme === "dark" ? "☾" : "☀";
  if (label) label.textContent = theme === "dark" ? "Тёмная тема" : "Светлая тема";
}

document.addEventListener("DOMContentLoaded", () => {
  const current =
    document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(current);
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const next =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    applyTheme(next);
  });
});

// ============================================
// УТИЛИТЫ
// ============================================
async function postJson(url, body) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await resp.json();
}

async function postMultipart(url, formData) {
  const resp = await fetch(url, { method: "POST", body: formData });
  return await resp.json();
}

function setText(id, text) {
  document.getElementById(id).textContent = text ?? "";
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// ============================================
// ПЕРЕМЕННЫЕ ДЛЯ РАБОТЫ С ЛОГАМИ
// ============================================
let allLogItems = [];
let filteredItems = [];
let searchHistory = [];
let selectedItems = new Set();
let starredItems = new Set();

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
      showNotification("Автосохранение выполнено", "success");
    } catch (e) {
      console.error("Error saving to localStorage:", e);
      showNotification("Ошибка автосохранения", "error");
    }
  }
}

// ============================================
// ПОДСВЕТКА ТЕКСТА
// ============================================
// Экранирование пользовательского текста перед вставкой в innerHTML (защита от XSS).
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function highlightText(text, searchTerm) {
  // Сначала ВСЕГДА экранируем: дальше результат уходит в innerHTML.
  const safe = escapeHtml(text);

  if (!searchTerm || !document.getElementById("highlightSearch")?.checked) {
    return safe;
  }

  const isRegex = document.getElementById("regexMode")?.checked;
  let regex;

  try {
    if (isRegex) {
      regex = new RegExp(`(${searchTerm})`, "gi");
    } else {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      regex = new RegExp(`(${escaped})`, "gi");
    }
    return safe.replace(regex, '<span class="highlight">$1</span>');
  } catch (e) {
    console.error("Invalid regex:", e);
    return safe;
  }
}

// Подсветка синтаксиса JSON. Экранируем только &<> (кавычки нужны для
// распознавания токенов и безопасны в текстовом контексте innerHTML),
// затем оборачиваем ключи/строки/числа/литералы в span с классами tok-*.
function syntaxHighlightJson(text) {
  const esc = String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc.replace(
    /("(?:\\.|[^"\\])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "tok-num";
      if (match[0] === '"') {
        cls = /:\s*$/.test(match) ? "tok-key" : "tok-str";
      } else if (match === "true" || match === "false") {
        cls = "tok-bool";
      } else if (match === "null") {
        cls = "tok-null";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

// Извлекает traceId из извлечённого JSON сообщения (item.pretty), если он там есть.
// raw-поля у item нет — traceId доступен, только когда входит в извлечённый payload.
function extractTraceId(item) {
  const text = item.pretty || item.raw || "";
  const m = /"trace[_-]?id"\s*:\s*"([^"]+)"/i.exec(text);
  return m ? m[1] : "";
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
function renderLogItems() {
  const itemsDiv = document.getElementById("logsItems");
  if (!itemsDiv) return;

  itemsDiv.innerHTML = "";
  const searchTerm = document.getElementById("logsSearch").value.trim();

  filteredItems.forEach((item) => {
    const div = document.createElement("div");
    div.className = "item-card expanded";
    div.dataset.itemNumber = item.number;

    const isDup = item.duplicateOf !== null && item.duplicateOf !== undefined;
    const isSelected = selectedItems.has(item.number);
    const isStarred = starredItems.has(item.number);
    const level = item.level?.toLowerCase() || "info";

    if (isSelected) div.classList.add("selected");
    div.classList.add(`log-level-${level}`);

    let timestamp = "";
    try {
      const logData = JSON.parse(item.raw || "{}");
      timestamp = logData.timestamp || "";
    } catch (e) {
      timestamp = item.timestamp || "";
    }

    const traceId = extractTraceId(item);
    const traceIdShort =
      traceId.length > 18 ? traceId.slice(0, 18) + "…" : traceId;
    const highlightOn =
      document.getElementById("highlightSearch")?.checked !== false;

    div.innerHTML = `
      <div class="item-header" onclick="toggleCard(${item.number})">
        <div class="item-header-left">
          <input type="checkbox" class="item-checkbox" 
                 onclick="event.stopPropagation(); toggleSelection(${
                   item.number
                 })"
                 ${isSelected ? "checked" : ""}>
          <div class="item-title">
            <span class="item-type-icon ${item.key?.toLowerCase()}"></span>
            СООБЩЕНИЕ ${item.number}: ${highlightText(
      item.key?.toUpperCase() || "",
      searchTerm
    )}
          </div>
          ${
            traceId
              ? `<span class="badge" title="traceId: ${escapeHtml(
                  traceId
                )}">🔗 ${escapeHtml(traceIdShort)}</span>`
              : ""
          }
          ${
            isDup
              ? `<span class="badge dup">Дубликат №${item.duplicateOf}</span>`
              : ""
          }
        </div>
        <div class="item-header-right">
          <span class="badge" title="Строк">📝 ${item.lines}</span>
          <span class="badge" title="Размер">📦 ${formatBytes(
            item.rawLength
          )}</span>
          <span class="item-toggle">▼</span>
        </div>
      </div>
      
      <div class="item-meta">
        ${
          timestamp
            ? `<span>⏰ ${new Date(timestamp).toLocaleString("ru-RU")}</span>`
            : ""
        }
        <span>📊 Значений: ${item.valueCount}</span>
        <span>🔤 Сырой размер: ${item.rawLength} байт</span>
      </div>
      
      <div class="item-content">
        ${
          item.description
            ? `
          <div class="item-description">
            ${highlightText(item.description, searchTerm)}
          </div>
        `
            : ""
        }
        <pre class="output line-numbers">${formatJsonWithLineNumbers(
          searchTerm && highlightOn
            ? highlightText(item.pretty || "", searchTerm)
            : syntaxHighlightJson(item.pretty || "")
        )}</pre>
      </div>
      
      <div class="buttons">
        <button onclick="copyJson(${item.number})">📋 Копировать JSON</button>
        <button onclick="copyBlock(${item.number})">📄 Копировать блок</button>
        <button onclick="downloadItem(${item.number})">💾 Скачать</button>
        <button onclick="addToCompare(${
          item.number
        })" class="secondary">🔍 Сравнить</button>
      </div>
      
      <span class="item-star ${isStarred ? "starred" : ""}" 
            onclick="toggleStar(${item.number})"
            title="${
              isStarred ? "Убрать из избранного" : "Добавить в избранное"
            }">
        ${isStarred ? "⭐" : "☆"}
      </span>
    `;

    itemsDiv.appendChild(div);
  });

  updateChart();
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
}

function formatJsonWithLineNumbers(json) {
  const lines = json.split("\n");
  return lines.map((line) => `<span class="line">${line}</span>`).join("\n");
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
let compareItems = [];

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

function closeCompareModal() {
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
// СЛУШАТЕЛИ СОБЫТИЙ
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
// Флаги уникальные/дубликаты теперь применяются на лету.
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
    showNotification("Введите данные для обработки", "error");
    return;
  }

  // Паттерны извлечения всегда включены целиком — система сама определяет,
  // что извлекать. UI-выбор паттернов убран; шлём полный набор (включая args),
  // чтобы поведение совпадало с прежним «все галочки включены».
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
// JSON РАЗДЕЛ
// ============================================
document.getElementById("jsonFile").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  const info = document.getElementById("jsonFileInfo");
  const picker = document.getElementById("jsonFilePicker");
  if (!f) {
    info.textContent = "Файл не выбран";
    picker?.classList.remove("has-file");
    return;
  }
  info.textContent = `${f.name} (${formatBytes(f.size)})`;
  picker?.classList.add("has-file");
  const txt = await f.text();
  document.getElementById("jsonInput").value = txt;
});

async function jsonAction(action) {
  const input = document.getElementById("jsonInput").value;

  if (!input.trim()) {
    showNotification("Введите JSON для обработки", "error");
    return;
  }

  try {
    const res = await postJson(`/api/format/${action}`, {
      type: "json",
      input,
    });
    const out = res.output ?? "";
    document.getElementById("jsonOutput").innerHTML = syntaxHighlightJson(out);
    document.getElementById("jsonStats").textContent = res.stats
      ? `Вход: ${res.stats.inputBytes} B, Выход: ${res.stats.outputBytes} B, ${res.stats.durationMs} мс`
      : "";
    document.getElementById("jsonErrors").textContent =
      res.errors && res.errors.length ? res.errors.join("\n") : "";
    const integ = res.integrity;
    document.getElementById("jsonIntegrity").textContent = integ
      ? `Целостность: strict=${integ.equalStrict}, normalized=${
          integ.equalNormalized
        }, in=${integ.inputHash?.slice(0, 8)}…, out=${integ.outputHash?.slice(
          0,
          8
        )}…`
      : "";
    document.getElementById("btnCopyJson").disabled = !out;
    document.getElementById("btnDownloadJson").disabled = !out;
    document.getElementById("btnCopyJson").onclick = () => {
      navigator.clipboard.writeText(out);
      showNotification("JSON скопирован в буфер обмена");
    };
    document.getElementById("btnDownloadJson").onclick = () =>
      downloadText(out, "result.json");

    if (out) {
      showNotification(`JSON ${action} выполнен успешно`, "success");
    }
  } catch (error) {
    console.error("Error processing JSON:", error);
    showNotification("Ошибка обработки JSON", "error");
  }
}

document
  .getElementById("btnPretty")
  ?.addEventListener("click", () => jsonAction("pretty"));
document
  .getElementById("btnMinify")
  ?.addEventListener("click", () => jsonAction("minify"));
document
  .getElementById("btnValidate")
  ?.addEventListener("click", () => jsonAction("validate"));

// ============================================
// JSON РАЗДЕЛ - РАСШИРЕНИЕ ДЛЯ WRAP/UNWRAP
// ============================================

// Переключение режимов форматирования
document.querySelectorAll('input[name="jsonMode"]').forEach((radio) => {
  radio.addEventListener("change", (e) => {
    const mode = e.target.value;
    const formatButtons = document.getElementById("formatButtons");
    const wrapperButtons = document.getElementById("wrapperButtons");
    const hint = document.getElementById("jsonModeHint");

    if (mode === "format") {
      formatButtons?.classList.remove("hidden");
      wrapperButtons?.classList.add("hidden");
      if (hint)
        hint.textContent =
          "Pretty форматирует с отступами, Minify убирает пробелы";
    } else {
      formatButtons?.classList.add("hidden");
      wrapperButtons?.classList.remove("hidden");
      if (hint)
        hint.textContent =
          'Wrap/Unwrap оборачивают/разворачивают значения JSON; «Числа → value» собирает JSON-массив {"value": "..."} из набора чисел';
    }

    // Очищаем вывод при смене режима
    document.getElementById("jsonOutput").textContent = "";
    document.getElementById("jsonStats").textContent = "";
    document.getElementById("jsonErrors").textContent = "";
    document.getElementById("jsonIntegrity").textContent = "";
  });
});

// Обработка значений JSON: wrap (обернуть в {"value": ...}) и unwrap (развернуть обратно).
// Раньше это были две почти идентичные копии (~60 строк каждая); сведены в одну функцию.
const JSON_VALUE_ACTIONS = {
  wrap: {
    url: "/api/format/wrap",
    statsSuffix: '✅ Значения обернуты в {"value": ...}',
    filename: "wrapped.json",
    errorLabel: "Error wrapping JSON:",
  },
  unwrap: {
    url: "/api/format/unwrap",
    statsSuffix: "✅ Значения развернуты",
    filename: "unwrapped.json",
    errorLabel: "Error unwrapping JSON:",
  },
};

async function handleJsonValueAction(action) {
  const cfg = JSON_VALUE_ACTIONS[action];
  const input = document.getElementById("jsonInput").value;

  if (!input.trim()) {
    alert("Введите JSON для обработки");
    return;
  }

  try {
    const response = await fetch(cfg.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "json",
        input: input,
      }),
    });

    const res = await response.json();

    const out = res.output ?? "";
    document.getElementById("jsonOutput").innerHTML = syntaxHighlightJson(out);
    document.getElementById("jsonStats").textContent = res.stats
      ? `Вход: ${res.stats.inputBytes} B, Выход: ${res.stats.outputBytes} B, ${res.stats.durationMs} мс | ${cfg.statsSuffix}`
      : "";
    document.getElementById("jsonErrors").textContent =
      res.errors && res.errors.length ? res.errors.join("\n") : "";

    const integ = res.integrity;
    document.getElementById("jsonIntegrity").textContent = integ
      ? `Данные сохранены, структура изменена`
      : "";

    document.getElementById("btnCopyJson").disabled = !out;
    document.getElementById("btnDownloadJson").disabled = !out;

    if (out) {
      // Обновляем обработчики копирования и скачивания
      document.getElementById("btnCopyJson").onclick = () => {
        navigator.clipboard.writeText(out);
        alert("JSON скопирован в буфер обмена");
      };
      document.getElementById("btnDownloadJson").onclick = () => {
        const blob = new Blob([out], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = cfg.filename;
        a.click();
        URL.revokeObjectURL(url);
      };
    }
  } catch (error) {
    console.error(cfg.errorLabel, error);
    document.getElementById("jsonErrors").textContent =
      "Ошибка обработки: " + error.message;
  }
}

document.getElementById("btnWrap")?.addEventListener("click", () => handleJsonValueAction("wrap"));
document.getElementById("btnUnwrap")?.addEventListener("click", () => handleJsonValueAction("unwrap"));

// Числа → value: находит все числа в поле ввода (любой разделитель) и оборачивает
// каждое в {"value": "<число>"}, собирая JSON-массив. Полностью на клиенте.
function wrapNumbersToValueJson() {
  const input = document.getElementById("jsonInput").value;
  const numbers = input.match(/\d+/g) || [];

  if (numbers.length === 0) {
    showNotification("В поле ввода нет чисел для обёртки", "error");
    return;
  }

  // value — строкой в кавычках (безопасно для очень длинных чисел).
  // Формат: JSON-массив, по одному компактному объекту на строку.
  const out =
    "[\n" +
    numbers.map((n) => `  {"value": "${n}"}`).join(",\n") +
    "\n]";

  document.getElementById("jsonOutput").innerHTML = syntaxHighlightJson(out);
  document.getElementById("jsonStats").textContent = `Обёрнуто чисел: ${numbers.length}`;
  document.getElementById("jsonErrors").textContent = "";
  document.getElementById("jsonIntegrity").textContent = "";

  const btnCopy = document.getElementById("btnCopyJson");
  const btnDl = document.getElementById("btnDownloadJson");
  btnCopy.disabled = false;
  btnDl.disabled = false;
  btnCopy.onclick = () => {
    navigator.clipboard.writeText(out);
    showNotification("Результат скопирован в буфер обмена");
  };
  btnDl.onclick = () => downloadText(out, "values.json");

  showNotification(`Обёрнуто ${numbers.length} чисел`, "success");
}

document
  .getElementById("btnWrapNumbers")
  ?.addEventListener("click", wrapNumbersToValueJson);

// ============================================
// XML РАЗДЕЛ
// ============================================
document.getElementById("xmlFile").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  const info = document.getElementById("xmlFileInfo");
  const picker = document.getElementById("xmlFilePicker");
  if (!f) {
    info.textContent = "Файл не выбран";
    picker?.classList.remove("has-file");
    return;
  }
  info.textContent = `${f.name} (${formatBytes(f.size)})`;
  picker?.classList.add("has-file");
  const txt = await f.text();
  document.getElementById("xmlInput").value = txt;
});

async function xmlAction(action) {
  const input = document.getElementById("xmlInput").value;

  if (!input.trim()) {
    showNotification("Введите XML для обработки", "error");
    return;
  }

  const ops = {
    unescapeFromJson: document.getElementById("xmlUnescape").checked,
    keepXmlDeclaration: document.getElementById("xmlKeepDecl").checked,
    escapeForJson: document.getElementById("xmlEscape").checked,
  };

  try {
    const res = await postJson(`/api/format/${action}`, {
      type: "xml",
      input,
      options: ops,
    });
    const out = res.output ?? "";
    document.getElementById("xmlOutput").textContent = out;
    document.getElementById("xmlStats").textContent = res.stats
      ? `Вход: ${res.stats.inputBytes} B, Выход: ${res.stats.outputBytes} B, ${res.stats.durationMs} мс`
      : "";
    document.getElementById("xmlErrors").textContent =
      res.errors && res.errors.length ? res.errors.join("\n") : "";
    const integ = res.integrity;
    document.getElementById("xmlIntegrity").textContent = integ
      ? `Целостность: strict=${integ.equalStrict}, normalized=${
          integ.equalNormalized
        }, in=${integ.inputHash?.slice(0, 8)}…, out=${integ.outputHash?.slice(
          0,
          8
        )}…`
      : "";
    document.getElementById("btnCopyXml").disabled = !out;
    document.getElementById("btnDownloadXml").disabled = !out;
    document.getElementById("btnCopyXml").onclick = () => {
      navigator.clipboard.writeText(out);
      showNotification("XML скопирован в буфер обмена");
    };
    document.getElementById("btnDownloadXml").onclick = () =>
      downloadText(out, ops.escapeForJson ? "result.txt" : "result.xml");

    if (out) {
      showNotification(`XML ${action} выполнен успешно`, "success");
    }
  } catch (error) {
    console.error("Error processing XML:", error);
    showNotification("Ошибка обработки XML", "error");
  }
}

document
  .getElementById("btnXmlPretty")
  ?.addEventListener("click", () => xmlAction("pretty"));
document
  .getElementById("btnXmlMinify")
  ?.addEventListener("click", () => xmlAction("minify"));
document
  .getElementById("btnXmlValidate")
  ?.addEventListener("click", () => xmlAction("validate"));

// ============================================
// УТИЛИТЫ
// ============================================
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

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

function jumpToMessage() {
  const number = prompt("Введите номер сообщения:");
  if (!number) return;

  const num = parseInt(number, 10);
  const card = document.querySelector(`.item-card[data-item-number="${num}"]`);

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
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    logsInput.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

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
      const settings = {
        autoSave: document.getElementById("autoSave")?.checked,
        highlightSearch: document.getElementById("highlightSearch")?.checked,
        regexMode: document.getElementById("regexMode")?.checked,
      };
      localStorage.setItem("logsSettings", JSON.stringify(settings));
    });
  });

  console.log("🚀 Data & Log Formatter загружен и готов к работе!");
  console.log("💡 Горячие клавиши:");
  console.log("   Ctrl/Cmd + F - Поиск");
  console.log("   Ctrl/Cmd + K - Очистить фильтры");
  console.log("   Ctrl/Cmd + G - Перейти к сообщению");
  console.log("   Escape - Закрыть модальное окно");
});

// ============================================
// ЭКСПОРТ ФУНКЦИЙ В ГЛОБАЛЬНУЮ ОБЛАСТЬ
// ============================================
window.toggleCard = toggleCard;
window.toggleSelection = toggleSelection;
window.toggleStar = toggleStar;
window.copyJson = copyJson;
window.copyBlock = copyBlock;
window.downloadItem = downloadItem;
window.addToCompare = addToCompare;
window.closeCompareModal = closeCompareModal;
window.jumpToMessage = jumpToMessage;
window.clearFilters = clearFilters;

console.log("✅ Все функции инициализированы и готовы к использованию");
