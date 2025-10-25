// ============================================
// LOGS - UI И РЕНДЕРИНГ
// ============================================

import {
  formatBytes,
  formatJsonWithLineNumbers,
  escapeHtml,
} from "../../core/utils.js";
import { highlightText } from "./logsSearch.js";

/**
 * Рендеринг элементов логов
 */
export function renderLogItems(
  items,
  selectedItems,
  starredItems,
  searchTerm = ""
) {
  const itemsDiv = document.getElementById("logsItems");
  if (!itemsDiv) return;

  itemsDiv.innerHTML = "";

  items.forEach((item) => {
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

    div.innerHTML = `
      <div class="item-header" data-action="toggle" data-number="${
        item.number
      }">
        <div class="item-header-left">
          <input type="checkbox" class="item-checkbox" 
                 data-action="select" data-number="${item.number}"
                 ${isSelected ? "checked" : ""}>
          <div class="item-title">
            <span class="item-type-icon ${item.key?.toLowerCase()}"></span>
            СООБЩЕНИЕ ${item.number}: ${highlightText(
      item.key?.toUpperCase() || "",
      searchTerm
    )}
          </div>
          <span class="badge" title="Hash: ${item.hash}">
            ${item.hash?.slice(0, 8)}…
          </span>
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
          highlightText(item.pretty || "", searchTerm)
        )}</pre>
      </div>
      
      <div class="buttons">
        <button data-action="copy-json" data-number="${
          item.number
        }">📋 Копировать JSON</button>
        <button data-action="copy-block" data-number="${
          item.number
        }">📄 Копировать блок</button>
        <button data-action="download" data-number="${
          item.number
        }">💾 Скачать</button>
        <button data-action="compare" data-number="${
          item.number
        }" class="secondary">🔍 Сравнить</button>
      </div>
      
      <span class="item-star ${isStarred ? "starred" : ""}" 
            data-action="star" data-number="${item.number}"
            title="${
              isStarred ? "Убрать из избранного" : "Добавить в избранное"
            }">
        ${isStarred ? "⭐" : "☆"}
      </span>
    `;

    itemsDiv.appendChild(div);
  });

  console.log(`✅ Rendered ${items.length} log items`);
}

/**
 * Обновление графика типов сообщений
 */
export function updateChart(items) {
  const chart = document.getElementById("logsChart");
  if (!chart) return;

  const types = {};
  items.forEach((item) => {
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

/**
 * Обновление статистики
 */
export function updateStats(stats) {
  const statsEl = document.getElementById("logsStats");
  if (!statsEl || !stats) return;

  statsEl.textContent = `📊 Записей: ${stats.totalEntries} | ✅ Извлечено: ${stats.extracted} | 🎯 Уникальных: ${stats.unique} | 📑 Дубликатов: ${stats.duplicates} | ⏱️ ${stats.durationMs} мс`;
}

/**
 * Переключение состояния карточки (свёрнута/развёрнута)
 */
export function toggleCard(number) {
  const card = document.querySelector(
    `.item-card[data-item-number="${number}"]`
  );
  if (card) {
    card.classList.toggle("collapsed");
    card.classList.toggle("expanded");
  }
}

/**
 * Свернуть все карточки
 */
export function collapseAllCards() {
  document.querySelectorAll(".item-card").forEach((card) => {
    card.classList.add("collapsed");
    card.classList.remove("expanded");
  });
}

/**
 * Развернуть все карточки
 */
export function expandAllCards() {
  document.querySelectorAll(".item-card").forEach((card) => {
    card.classList.remove("collapsed");
    card.classList.add("expanded");
  });
}

/**
 * Переход к определённому сообщению
 */
export function jumpToMessage(number) {
  const card = document.querySelector(
    `.item-card[data-item-number="${number}"]`
  );

  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("expanded");
    card.classList.remove("collapsed");

    // Анимация "pulse"
    card.style.animation = "none";
    setTimeout(() => {
      card.style.animation = "pulse 0.5s ease-in-out";
    }, 10);

    return true;
  }
  return false;
}
