/* ============================================
   LOGS STATE - Глобальное состояние логов
   ============================================ */

/**
 * Все элементы логов
 * @type {Array<Object>}
 */
export let allLogItems = [];

/**
 * Отфильтрованные элементы
 * @type {Array<Object>}
 */
export let filteredItems = [];

/**
 * История поиска
 * @type {Array<string>}
 */
export let searchHistory = [];

/**
 * Выбранные элементы (для экспорта/сравнения)
 * @type {Set<number>}
 */
export let selectedItems = new Set();

/**
 * Избранные элементы
 * @type {Set<number>}
 */
export let starredItems = new Set();

/**
 * Элементы для сравнения
 * @type {Array<Object>}
 */
export let compareItems = [];

/**
 * Установить все элементы логов
 * @param {Array<Object>} items - Массив элементов
 */
export function setAllLogItems(items) {
  allLogItems = items;
}

/**
 * Установить отфильтрованные элементы
 * @param {Array<Object>} items - Массив элементов
 */
export function setFilteredItems(items) {
  filteredItems = items;
}

/**
 * Добавить в историю поиска
 * @param {string} term - Поисковый запрос
 */
export function addToSearchHistory(term) {
  if (term && !searchHistory.includes(term)) {
    searchHistory.unshift(term);
    searchHistory = searchHistory.slice(0, 5); // Максимум 5
  }
}

/**
 * Установить историю поиска
 * @param {Array<string>} history - Массив запросов
 */
export function setSearchHistory(history) {
  searchHistory = history || [];
}

/**
 * Переключить выбор элемента
 * @param {number} number - Номер элемента
 */
export function toggleSelected(number) {
  if (selectedItems.has(number)) {
    selectedItems.delete(number);
  } else {
    selectedItems.add(number);
  }
}

/**
 * Переключить избранное
 * @param {number} number - Номер элемента
 */
export function toggleStarred(number) {
  if (starredItems.has(number)) {
    starredItems.delete(number);
  } else {
    starredItems.add(number);
  }
}

/**
 * Установить избранные элементы
 * @param {Array<number>} starred - Массив номеров
 */
export function setStarredItems(starred) {
  starredItems = new Set(starred || []);
}

/**
 * Добавить элемент для сравнения
 * @param {Object} item - Элемент лога
 */
export function addToCompareItems(item) {
  compareItems.push(item);
  if (compareItems.length > 2) {
    compareItems.shift(); // Максимум 2
  }
}

/**
 * Очистить элементы для сравнения
 */
export function clearCompareItems() {
  compareItems = [];
}

/**
 * Сбросить все состояние
 */
export function resetState() {
  allLogItems = [];
  filteredItems = [];
  searchHistory = [];
  selectedItems.clear();
  starredItems.clear();
  compareItems = [];
}

/**
 * Получить элемент по номеру
 * @param {number} number - Номер элемента
 * @returns {Object|undefined} Элемент или undefined
 */
export function getItemByNumber(number) {
  return allLogItems.find((item) => item.number === number);
}

/**
 * Получить выбранные элементы
 * @returns {Array<Object>} Массив выбранных элементов
 */
export function getSelectedItems() {
  return allLogItems.filter((item) => selectedItems.has(item.number));
}
