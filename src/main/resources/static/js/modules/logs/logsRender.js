/* ============================================
   LOGS RENDER - Рендеринг карточек логов
   ============================================ */

import { filteredItems, selectedItems, starredItems } from "./logsState.js";
import {
  highlightText,
  formatJsonWithLineNumbers,
  isDuplicate,
  extractLogLevel,
  formatTimestamp,
  extractTimestamp,
} from "./logsUtils.js";
import { formatBytes } from "../../core/utils.js";
import { updateChart } from "./logsChart.js";

/**
 * Рендеринг всех карточек логов
 */
export function renderLogItems() {
  const itemsDiv = document.getElementById("logsItems");
  if (!itemsDiv) return;

  itemsDiv.innerHTML = "";
  const searchTerm = document.getElementById("logsSearch")?.value.trim() || "";

  filteredItems.forEach((item) => {
    const card = createLogCard(item, searchTerm);
    itemsDiv.appendChild(card);
  });

  updateChart();
  console.log(`✅ Отрендерено ${filteredItems.length} карточек`);
}

/**
 * Создание карточки лога
 * @param {Object} item - Элемент лога
 * @param {string} searchTerm - Поисковый запрос
 * @returns {HTMLElement} DOM элемент карточки
 */
function createLogCard(item, searchTerm) {
  const div = document.createElement("div");
  div.className = "item-card expanded";
  div.dataset.itemNumber = item.number;

  const isSelected = selectedItems.has(item.number);
  const isStarred = starredItems.has(item.number);
  const level = extractLogLevel(item.raw);
  const timestamp = extractTimestamp(item.raw);

  if (isSelected) div.classList.add("selected");
  div.classList.add(`log-level-${level.toLowerCase()}`);

  div.innerHTML = `
    ${renderCardHeader(item, searchTerm, isSelected)}
    ${renderCardMeta(item, timestamp)}
    ${renderCardContent(item, searchTerm)}
    ${renderCardButtons(item)}
    ${renderCardStar(item.number, isStarred)}
  `;

  return div;
}

/**
 * Рендеринг заголовка карточки
 */
function renderCardHeader(item, searchTerm, isSelected) {
  const isDup = isDuplicate(item);
  const level = extractLogLevel(item.raw);

  return `
    <div class="item-header" onclick="window.toggleCard(${item.number})">
      <div class="item-header-left">
        <input 
          type="checkbox" 
          class="item-checkbox" 
          onclick="event.stopPropagation(); window.toggleSelection(${
            item.number
          })"
          ${isSelected ? "checked" : ""}
        >
        <div class="item-title">
          <span class="item-type-icon ${item.key?.toLowerCase()}"></span>
          СООБЩЕНИЕ ${item.number}: ${highlightText(
    item.key?.toUpperCase() || "UNKNOWN",
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
        <span class="badge log-level">${level}</span>
      </div>
      <div class="item-header-right">
        <span class="badge" title="Строк">📝 ${item.lines || 0}</span>
        <span class="badge" title="Размер">📦 ${formatBytes(
          item.rawLength || 0
        )}</span>
        <span class="item-toggle">▼</span>
      </div>
    </div>
  `;
}

/**
 * Рендеринг метаинформации
 */
function renderCardMeta(item, timestamp) {
  return `
    <div class="item-meta">
      ${timestamp ? `<span>⏰ ${formatTimestamp(timestamp)}</span>` : ""}
      <span>📊 Значений: ${item.valueCount || 0}</span>
      <span>🔤 Сырой размер: ${item.rawLength || 0} байт</span>
    </div>
  `;
}

/**
 * Рендеринг содержимого карточки
 */
function renderCardContent(item, searchTerm) {
  const description = item.description || "";
  const prettyJson = item.pretty || item.raw || "";

  return `
    <div class="item-content">
      ${
        description && description !== "Без описания"
          ? `
        <div class="item-description">
          ${highlightText(description, searchTerm)}
        </div>
      `
          : ""
      }
      <pre class="output line-numbers">${formatJsonWithLineNumbers(
        highlightText(prettyJson, searchTerm)
      )}</pre>
    </div>
  `;
}

/**
 * Рендеринг кнопок действий
 */
function renderCardButtons(item) {
  return `
    <div class="buttons">
      <button onclick="window.copyJson(${item.number})">📋 Копировать JSON</button>
      <button onclick="window.copyBlock(${item.number})">📄 Копировать блок</button>
      <button onclick="window.downloadItem(${item.number})">💾 Скачать</button>
      <button onclick="window.addToCompare(${item.number})" class="secondary">🔍 Сравнить</button>
    </div>
  `;
}

/**
 * Рендеринг звездочки избранного
 */
function renderCardStar(number, isStarred) {
  return `
    <span 
      class="item-star ${isStarred ? "starred" : ""}" 
      onclick="window.toggleStar(${number})"
      title="${isStarred ? "Убрать из избранного" : "Добавить в избранное"}"
    >
      ${isStarred ? "⭐" : "☆"}
    </span>
  `;
}

/**
 * Обновление одной карточки (без полного рендера)
 * @param {number} number - Номер карточки
 */
export function updateCard(number) {
  const card = document.querySelector(
    `.item-card[data-item-number="${number}"]`
  );
  if (!card) return;

  const item = filteredItems.find((i) => i.number === number);
  if (!item) return;

  const searchTerm = document.getElementById("logsSearch")?.value.trim() || "";
  const newCard = createLogCard(item, searchTerm);

  card.replaceWith(newCard);
}

/**
 * Обновление счетчика карточек
 */
export function updateCardsCounter() {
  const counter = document.getElementById("logsCardsCounter");
  if (counter) {
    counter.textContent = `Показано: ${filteredItems.length}`;
  }
}

/**
 * Скролл к карточке
 * @param {number} number - Номер карточки
 */
export function scrollToCard(number) {
  const card = document.querySelector(
    `.item-card[data-item-number="${number}"]`
  );
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });

    // Подсветка
    card.style.animation = "none";
    setTimeout(() => {
      card.style.animation = "pulse 0.5s ease-in-out";
    }, 10);
  }
}

/**
 * Раскрыть карточку
 * @param {number} number - Номер карточки
 */
export function expandCard(number) {
  const card = document.querySelector(
    `.item-card[data-item-number="${number}"]`
  );
  if (card) {
    card.classList.remove("collapsed");
    card.classList.add("expanded");
  }
}

/**
 * Свернуть карточку
 * @param {number} number - Номер карточки
 */
export function collapseCard(number) {
  const card = document.querySelector(
    `.item-card[data-item-number="${number}"]`
  );
  if (card) {
    card.classList.add("collapsed");
    card.classList.remove("expanded");
  }
}

/**
 * Раскрыть все карточки
 */
export function expandAllCards() {
  document.querySelectorAll(".item-card").forEach((card) => {
    card.classList.remove("collapsed");
    card.classList.add("expanded");
  });
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
