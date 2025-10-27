/* ============================================
   LOGS SEARCH - Поиск и фильтрация логов
   ============================================ */

import {
  allLogItems,
  filteredItems,
  setFilteredItems,
  searchHistory,
  addToSearchHistory,
  starredItems,
} from "./logsState.js";
import { renderLogItems } from "./logsRender.js";
import { showNotification } from "../../components/notification.js";

/**
 * Поиск и фильтрация логов
 */
export function searchLogs() {
  const searchTerm = document.getElementById("logsSearch")?.value.trim() || "";
  const filterType = document.getElementById("logsFilter")?.value || "all";
  const sortBy = document.getElementById("logsSort")?.value || "number";

  // Фильтрация
  let filtered = allLogItems.filter((item) => {
    // Фильтр по типу
    if (filterType !== "all") {
      const itemType = item.key?.toLowerCase() || "";
      const level = (item.level || "").toLowerCase();

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
      if (filterType === "warning" && level !== "warning") return false;
    }

    // Поиск по тексту
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
          console.error("Invalid regex:", e);
          return searchIn.includes(searchTerm.toLowerCase());
        }
      } else {
        return searchIn.includes(searchTerm.toLowerCase());
      }
    }

    return true;
  });

  // Сортировка
  filtered.sort((a, b) => {
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

  setFilteredItems(filtered);
  updateSearchCounter();

  // Добавить в историю
  if (searchTerm) {
    addToSearchHistory(searchTerm);
    updateSearchHistory();
  }

  renderLogItems();
}

/**
 * Обновление счетчика результатов поиска
 */
export function updateSearchCounter() {
  const counter = document.getElementById("searchCounter");
  if (!counter) return;

  if (filteredItems.length !== allLogItems.length) {
    counter.textContent = `${filteredItems.length} из ${allLogItems.length}`;
    counter.classList.add("active");
  } else {
    counter.textContent = "";
    counter.classList.remove("active");
  }
}

/**
 * Обновление истории поиска в UI
 */
export function updateSearchHistory() {
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
        const searchInput = document.getElementById("logsSearch");
        if (searchInput) {
          searchInput.value = term;
          searchLogs();
        }
      };
      historyDiv.appendChild(item);
    });
  }
}

/**
 * Очистка всех фильтров
 */
export function clearFilters() {
  const searchInput = document.getElementById("logsSearch");
  const filterSelect = document.getElementById("logsFilter");
  const sortSelect = document.getElementById("logsSort");

  if (searchInput) searchInput.value = "";
  if (filterSelect) filterSelect.value = "all";
  if (sortSelect) sortSelect.value = "number";

  setFilteredItems([...allLogItems]);
  renderLogItems();
  updateSearchCounter();
  showNotification("Фильтры очищены");
}

/**
 * Быстрый поиск по номеру сообщения
 * @param {number} number - Номер сообщения
 */
export function searchByNumber(number) {
  const item = allLogItems.find((i) => i.number === number);
  if (item) {
    setFilteredItems([item]);
    renderLogItems();
    updateSearchCounter();
    showNotification(`Показано сообщение №${number}`);
  } else {
    showNotification(`Сообщение №${number} не найдено`, "error");
  }
}

/**
 * Поиск по типу сообщения
 * @param {string} type - Тип (request, response, internal, external)
 */
export function searchByType(type) {
  const filterSelect = document.getElementById("logsFilter");
  if (filterSelect) {
    filterSelect.value = type;
    searchLogs();
  }
}

/**
 * Поиск по уровню
 * @param {string} level - Уровень (info, debug, error, warning)
 */
export function searchByLevel(level) {
  const filterSelect = document.getElementById("logsFilter");
  if (filterSelect) {
    filterSelect.value = level.toLowerCase();
    searchLogs();
  }
}

/**
 * Показать только избранное
 */
export function showOnlyStarred() {
  const starred = allLogItems.filter((item) => starredItems.has(item.number));

  if (starred.length > 0) {
    setFilteredItems(starred);
    renderLogItems();
    updateSearchCounter();
    showNotification(`Показано избранных: ${starred.length}`);
  } else {
    showNotification("Нет избранных сообщений", "warning");
  }
}

/**
 * Показать только дубликаты
 */
export function showOnlyDuplicates() {
  const duplicates = allLogItems.filter(
    (item) => item.duplicateOf !== null && item.duplicateOf !== undefined
  );

  if (duplicates.length > 0) {
    setFilteredItems(duplicates);
    renderLogItems();
    updateSearchCounter();
    showNotification(`Показано дубликатов: ${duplicates.length}`);
  } else {
    showNotification("Нет дубликатов", "success");
  }
}

/**
 * Показать только уникальные
 */
export function showOnlyUnique() {
  const unique = allLogItems.filter(
    (item) => item.duplicateOf === null || item.duplicateOf === undefined
  );

  if (unique.length > 0) {
    setFilteredItems(unique);
    renderLogItems();
    updateSearchCounter();
    showNotification(`Показано уникальных: ${unique.length}`);
  } else {
    showNotification("Нет уникальных сообщений", "warning");
  }
}

/**
 * Сброс поиска
 */
export function resetSearch() {
  clearFilters();
  setFilteredItems([...allLogItems]);
  renderLogItems();
}
