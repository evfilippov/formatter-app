/* ============================================
   LOGS ACTIONS - Действия с карточками
   ============================================ */

import {
  allLogItems,
  selectedItems,
  starredItems,
  toggleSelected,
  toggleStarred,
  getItemByNumber,
} from "./logsState.js";
import { buildSeparator, exportItemsAsText } from "./logsUtils.js";
import { copyToClipboard, downloadText } from "../../core/utils.js";
import { showNotification } from "../../components/notification.js";
import { updateCard } from "./logsRender.js";
import { saveToLocalStorage } from "./logsStorage.js";

/**
 * Переключить раскрытие/сворачивание карточки
 * @param {number} number - Номер карточки
 */
export function toggleCard(number) {
  const card = document.querySelector(
    `.item-card[data-item-number="${number}"]`
  );
  if (!card) return;

  if (card.classList.contains("collapsed")) {
    card.classList.remove("collapsed");
    card.classList.add("expanded");
  } else {
    card.classList.add("collapsed");
    card.classList.remove("expanded");
  }
}

/**
 * Переключить выбор карточки (чекбокс)
 * @param {number} number - Номер карточки
 */
export function toggleSelection(number) {
  toggleSelected(number);
  updateCard(number);
  updateExportButtons();
  saveToLocalStorage();
}

/**
 * Переключить избранное (звездочка)
 * @param {number} number - Номер карточки
 */
export function toggleStar(number) {
  toggleStarred(number);
  updateCard(number);
  saveToLocalStorage();

  const isStarred = starredItems.has(number);
  showNotification(
    isStarred
      ? `Сообщение №${number} добавлено в избранное`
      : `Сообщение №${number} убрано из избранного`
  );
}

/**
 * Копировать JSON сообщения
 * @param {number} number - Номер сообщения
 */
export async function copyJson(number) {
  const item = getItemByNumber(number);
  if (!item) {
    showNotification("Сообщение не найдено", "error");
    return;
  }

  const success = await copyToClipboard(item.pretty || item.raw || "");

  if (success) {
    showNotification(`JSON сообщения №${number} скопирован`);
  } else {
    showNotification("Ошибка копирования", "error");
  }
}

/**
 * Копировать блок с разделителем
 * @param {number} number - Номер сообщения
 */
export async function copyBlock(number) {
  const item = getItemByNumber(number);
  if (!item) {
    showNotification("Сообщение не найдено", "error");
    return;
  }

  const separator = buildSeparator(
    item.number,
    item.key || "UNKNOWN",
    item.description || "",
    true
  );
  const block = separator + (item.pretty || item.raw || "");

  const success = await copyToClipboard(block);

  if (success) {
    showNotification(`Блок сообщения №${number} скопирован`);
  } else {
    showNotification("Ошибка копирования", "error");
  }
}

/**
 * Скачать сообщение как файл
 * @param {number} number - Номер сообщения
 */
export function downloadItem(number) {
  const item = getItemByNumber(number);
  if (!item) {
    showNotification("Сообщение не найдено", "error");
    return;
  }

  const content = item.pretty || item.raw || "";
  const filename = `message_${number}_${item.key || "unknown"}.json`;

  downloadText(content, filename);
  showNotification(`Файл ${filename} скачан`);
}

/**
 * Экспорт выбранных сообщений
 */
export function exportSelected() {
  const selected = allLogItems.filter((item) => selectedItems.has(item.number));

  if (selected.length === 0) {
    showNotification("Выберите хотя бы одно сообщение", "warning");
    return;
  }

  const text = exportItemsAsText(selected);
  downloadText(text, `export_${selected.length}_messages.txt`);
  showNotification(`Экспортировано ${selected.length} сообщений`);
}

/**
 * Копировать выбранные сообщения
 */
export async function copySelected() {
  const selected = allLogItems.filter((item) => selectedItems.has(item.number));

  if (selected.length === 0) {
    showNotification("Выберите хотя бы одно сообщение", "warning");
    return;
  }

  const text = exportItemsAsText(selected);
  const success = await copyToClipboard(text);

  if (success) {
    showNotification(`Скопировано ${selected.length} сообщений`);
  } else {
    showNotification("Ошибка копирования", "error");
  }
}

/**
 * Выбрать все карточки
 */
export function selectAll() {
  allLogItems.forEach((item) => {
    selectedItems.add(item.number);
  });

  document.querySelectorAll(".item-checkbox").forEach((checkbox) => {
    checkbox.checked = true;
  });

  updateExportButtons();
  showNotification(`Выбрано ${allLogItems.length} сообщений`);
}

/**
 * Снять выбор со всех карточек
 */
export function deselectAll() {
  selectedItems.clear();

  document.querySelectorAll(".item-checkbox").forEach((checkbox) => {
    checkbox.checked = false;
  });

  updateExportButtons();
  showNotification("Выбор снят");
}

/**
 * Инвертировать выбор
 */
export function invertSelection() {
  allLogItems.forEach((item) => {
    toggleSelected(item.number);
  });

  document.querySelectorAll(".item-checkbox").forEach((checkbox) => {
    checkbox.checked = !checkbox.checked;
  });

  updateExportButtons();
  showNotification("Выбор инвертирован");
}

/**
 * Обновление состояния кнопок экспорта
 */
export function updateExportButtons() {
  const count = selectedItems.size;
  const exportBtn = document.getElementById("exportSelectedBtn");
  const copyBtn = document.getElementById("copySelectedBtn");

  if (exportBtn) {
    exportBtn.disabled = count === 0;
    exportBtn.textContent = `💾 Экспорт выбранных (${count})`;
  }

  if (copyBtn) {
    copyBtn.disabled = count === 0;
    copyBtn.textContent = `📋 Копировать выбранные (${count})`;
  }
}

/**
 * Переход к сообщению по номеру (горячая клавиша Ctrl+G)
 */
export function jumpToMessage() {
  const number = prompt("Введите номер сообщения:");
  if (!number) return;

  const num = parseInt(number, 10);
  const card = document.querySelector(`.item-card[data-item-number="${num}"]`);

  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("expanded");
    card.classList.remove("collapsed");

    // Анимация пульсации
    card.style.animation = "none";
    setTimeout(() => {
      card.style.animation = "pulse 0.5s ease-in-out";
    }, 10);

    showNotification(`Переход к сообщению №${num}`);
  } else {
    showNotification(`Сообщение №${num} не найдено`, "error");
  }
}

/**
 * Развернуть все карточки
 */
export function expandAll() {
  document.querySelectorAll(".item-card").forEach((card) => {
    card.classList.remove("collapsed");
    card.classList.add("expanded");
  });
  showNotification("Все карточки развернуты");
}

/**
 * Свернуть все карточки
 */
export function collapseAll() {
  document.querySelectorAll(".item-card").forEach((card) => {
    card.classList.add("collapsed");
    card.classList.remove("expanded");
  });
  showNotification("Все карточки свернуты");
}
