// ============================================
// LOGS SEARCH - FILTERING
// ============================================

import { renderLogItems, updateChart } from './logsUI.js';

let filteredItems = [];
let searchHistory = [];

/**
 * Инициализация поиска
 */
export function initLogsSearch() {
  console.log('��� Logs search initializing...');
}

/**
 * Поиск по логам
 */
export function searchLogs(allLogItems, selectedItems, starredItems) {
  const searchTerm = document.getElementById('logsSearch')?.value.trim() || '';
  const filterType = document.getElementById('logsFilter')?.value || 'all';
  const sortBy = document.getElementById('logsSort')?.value || 'number';

  filteredItems = allLogItems.filter(item => {
    // Фильтр по типу
    if (filterType !== 'all') {
      const itemType = item.key?.toLowerCase() || '';
      const level = item.level?.toLowerCase() || '';

      if (filterType === 'request' && !itemType.includes('request')) return false;
      if (filterType === 'response' && !itemType.includes('response')) return false;
      if (filterType === 'internal' && !itemType.includes('internal')) return false;
      if (filterType === 'external' && !itemType.includes('external')) return false;
      if (filterType === 'info' && level !== 'info') return false;
      if (filterType === 'debug' && level !== 'debug') return false;
      if (filterType === 'error' && level !== 'error') return false;
    }

    // Поиск
    if (searchTerm) {
      const searchIn = [
        item.pretty || '',
        item.key || '',
        item.description || '',
        item.raw || ''
      ].join(' ').toLowerCase();

      const isRegex = document.getElementById('regexMode')?.checked;

      if (isRegex) {
        try {
          const regex = new RegExp(searchTerm, 'i');
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

  // Сортировка
  filteredItems.sort((a, b) => {
    switch (sortBy) {
      case 'number':
        return (a.number || 0) - (b.number || 0);
      case 'type':
        return (a.key || '').localeCompare(b.key || '');
      case 'size':
        return (b.rawLength || 0) - (a.rawLength || 0);
      case 'timestamp':
        return (a.timestamp || '').localeCompare(b.timestamp || '');
      default:
        return 0;
    }
  });

  updateSearchCounter(filteredItems.length, allLogItems.length);

  if (searchTerm && !searchHistory.includes(searchTerm)) {
    searchHistory.unshift(searchTerm);
    searchHistory = searchHistory.slice(0, 5);
    updateSearchHistory(searchHistory);
  }

  renderLogItems(filteredItems, allLogItems, selectedItems, starredItems);
}

/**
 * Обновление счетчика поиска
 */
export function updateSearchCounter(filtered, total) {
  const counter = document.getElementById('searchCounter');
  if (counter) {
    if (filtered !== total) {
      counter.textContent = `${filtered} из ${total}`;
      counter.classList.add('active');
    } else {
      counter.classList.remove('active');
    }
  }
}

/**
 * Обновление истории поиска
 */
export function updateSearchHistory(history) {
  searchHistory = history;
  const historyDiv = document.getElementById('searchHistory');
  if (!historyDiv) return;

  historyDiv.innerHTML = '';

  if (history.length > 0) {
    const label = document.createElement('span');
    label.textContent = 'История: ';
    label.style.fontSize = '12px';
    label.style.color = 'var(--text-secondary)';
    historyDiv.appendChild(label);

    history.forEach(term => {
      const item = document.createElement('span');
      item.className = 'search-history-item';
      item.textContent = term;
      item.onclick = () => {
        document.getElementById('logsSearch').value = term;
        // Триггерим поиск
        const event = new Event('input', { bubbles: true });
        document.getElementById('logsSearch').dispatchEvent(event);
      };
      historyDiv.appendChild(item);
    });
  }
}

console.log('✅ Logs search module loaded');
