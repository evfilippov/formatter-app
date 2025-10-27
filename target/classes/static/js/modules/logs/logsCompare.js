/* ============================================
   LOGS COMPARE - Сравнение сообщений
   ============================================ */

import {
  compareItems,
  clearCompareItems,
  addToCompareItems,
  getItemByNumber,
  selectedItems,
  getSelectedItems,
  allLogItems,
} from "./logsState.js";
import { openCompareModal } from "../../components/modal.js";
import { showNotification } from "../../components/notification.js";

/**
 * Добавить элемент в список сравнения
 * @param {number} number - Номер элемента
 */
export function addToCompare(number) {
  const item = getItemByNumber(number);
  if (!item) {
    showNotification("Элемент не найден", "error");
    return;
  }

  addToCompareItems(item);

  if (compareItems.length === 1) {
    showNotification(`Выбрано 1 сообщение. Выберите второе для сравнения`);
    updateCompareButton();
  } else if (compareItems.length === 2) {
    showNotification(`Выбрано 2 сообщения. Открываю сравнение...`);
    openCompare();
  }
}

/**
 * Открыть модальное окно сравнения
 */
export function openCompare() {
  if (compareItems.length < 2) {
    showNotification("Выберите 2 сообщения для сравнения", "warning");
    return;
  }

  openCompareModal(compareItems[0], compareItems[1]);
  updateCompareButton();
}

/**
 * Очистить список сравнения
 */
export function clearCompare() {
  clearCompareItems();
  updateCompareButton();
  showNotification("Список сравнения очищен");
}

/**
 * Обновить кнопку сравнения
 */
export function updateCompareButton() {
  const btn = document.getElementById("compareBtn");
  if (!btn) return;

  if (compareItems.length === 0) {
    btn.textContent = "🔍 Сравнить (0)";
    btn.disabled = true;
  } else if (compareItems.length === 1) {
    btn.textContent = `🔍 Сравнить (1) - выберите ещё одно`;
    btn.disabled = true;
  } else {
    btn.textContent = `🔍 Сравнить (${compareItems[0].number} ↔ ${compareItems[1].number})`;
    btn.disabled = false;
  }
}

/**
 * Сравнение выбранных чекбоксов
 */
export function compareSelected() {
  const selected = getSelectedItems();

  if (selected.length !== 2) {
    showNotification("Выберите ровно 2 сообщения через чекбоксы", "warning");
    return;
  }

  clearCompareItems();
  addToCompareItems(selected[0]);
  addToCompareItems(selected[1]);
  openCompare();
}

/**
 * Сравнение соседних элементов
 * @param {number} number - Номер первого элемента
 */
export function compareWithNext(number) {
  const item1 = getItemByNumber(number);
  const item2 = getItemByNumber(number + 1);

  if (!item1 || !item2) {
    showNotification("Следующий элемент не найден", "error");
    return;
  }

  clearCompareItems();
  addToCompareItems(item1);
  addToCompareItems(item2);
  openCompare();
}

/**
 * Сравнение с предыдущим элементом
 * @param {number} number - Номер второго элемента
 */
export function compareWithPrev(number) {
  const item1 = getItemByNumber(number - 1);
  const item2 = getItemByNumber(number);

  if (!item1 || !item2) {
    showNotification("Предыдущий элемент не найден", "error");
    return;
  }

  clearCompareItems();
  addToCompareItems(item1);
  addToCompareItems(item2);
  openCompare();
}

/**
 * Сравнение оригинала и дубликата
 * @param {number} duplicateNumber - Номер дубликата
 */
export function compareWithOriginal(duplicateNumber) {
  const duplicate = getItemByNumber(duplicateNumber);

  if (!duplicate || duplicate.duplicateOf === null) {
    showNotification("Это не дубликат", "error");
    return;
  }

  const original = getItemByNumber(duplicate.duplicateOf);

  if (!original) {
    showNotification("Оригинал не найден", "error");
    return;
  }

  clearCompareItems();
  addToCompareItems(original);
  addToCompareItems(duplicate);
  openCompare();
}

/**
 * Быстрое сравнение по номерам
 * @param {number} num1 - Номер первого
 * @param {number} num2 - Номер второго
 */
export function quickCompare(num1, num2) {
  const item1 = getItemByNumber(num1);
  const item2 = getItemByNumber(num2);

  if (!item1 || !item2) {
    showNotification("Один из элементов не найден", "error");
    return;
  }

  clearCompareItems();
  addToCompareItems(item1);
  addToCompareItems(item2);
  openCompare();
}
