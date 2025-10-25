// ============================================
// LOGS - ПОИСК И ФИЛЬТРАЦИЯ
// ============================================

import { escapeHtml } from "../../core/utils.js";

let searchHistory = [];

/**
 * Подсветка текста поиска
 */
export function highlightText(text, searchTerm) {
  if (!searchTerm || !document.getElementById("highlightSearch")?.checked) {
    return escapeHtml(text);
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
    return escapeHtml(text).replace(regex, '<span class="highlight">$1</span>');
  } catch (e) {
    console.error("Invalid regex:", e);
    return escapeHtml(text);
  }
}

/**
 * Фильтрация элементов
 */
export function filterItems(allItems, searchTerm, filterType) {
  return allItems.filter((item) => {
    // Фильтр по типу
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
          return searchIn.includes(searchTerm.toLowerCase());
        }
      } else {
        return searchIn.includes(searchTerm.toLowerCase());
      }
    }

    return true;
  });
}

/**
 * Сортировка элементов
 */
export function sortItems(items, sortBy) {
  const sorted = [...items];

  sorted.sort((a, b) => {
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

  return sorted;
}

/**
 * Обновление счётчика результатов поиска
 */
export function updateSearchCounter(filteredCount, totalCount) {
  const counter = document.getElementById("searchCounter");
  if (counter) {
    if (filteredCount !== totalCount) {
      counter.textContent = `${filteredCount} из ${totalCount}`;
      counter.classList.add("active");
    } else {
      counter.classList.remove("active");
    }
  }
}

/**
 * Добавление в историю поиска
 */
export function addToSearchHistory(term) {
  if (term && !searchHistory.includes(term)) {
    searchHistory.unshift(term);
    searchHistory = searchHistory.slice(0, 5);
    updateSearchHistoryUI();
  }
}

/**
 * Получение истории поиска
 */
export function getSearchHistory() {
  return searchHistory;
}

/**
 * Обновление UI истории поиска
 */
export function updateSearchHistoryUI() {
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
          searchInput.dispatchEvent(new Event("input"));
        }
      };
      historyDiv.appendChild(item);
    });
  }
}

/**
 * Очистка истории поиска
 */
export function clearSearchHistory() {
  searchHistory = [];
  updateSearchHistoryUI();
}
