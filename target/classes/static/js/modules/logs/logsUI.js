// ============================================
// LOGS UI - RENDERING
// ============================================

import { highlightText } from '../../core/utils.js';

/**
 * Инициализация UI компонентов
 */
export function initLogsUI() {
  console.log('��� Logs UI initializing...');
  // Дополнительная инициализация UI при необходимости
}

/**
 * Рендеринг карточек логов
 */
export function renderLogItems(filteredItems, allLogItems, selectedItems, starredItems) {
  const itemsDiv = document.getElementById('logsItems');
  if (!itemsDiv) return;

  itemsDiv.innerHTML = '';
  const searchTerm = document.getElementById('logsSearch')?.value.trim() || '';

  filteredItems.forEach(item => {
    const div = document.createElement('div');
    div.className = 'item-card expanded';
    div.dataset.itemNumber = item.number;

    const isDup = item.duplicateOf !== null && item.duplicateOf !== undefined;
    const isSelected = selectedItems.has(item.number);
    const isStarred = starredItems.has(item.number);
    const level = item.level?.toLowerCase() || 'info';

    if (isSelected) div.classList.add('selected');
    div.classList.add(`log-level-${level}`);

    let timestamp = '';
    try {
      const logData = JSON.parse(item.raw || '{}');
      timestamp = logData.timestamp || '';
    } catch (e) {
      timestamp = item.timestamp || '';
    }

    div.innerHTML = `
      <div class="item-header" onclick="window.toggleCard(${item.number})">
        <div class="item-header-left">
          <input type="checkbox" class="item-checkbox" 
                 onclick="event.stopPropagation(); window.toggleSelection(${item.number})"
                 ${isSelected ? 'checked' : ''}>
          <div class="item-title">
            <span class="item-type-icon ${item.key?.toLowerCase()}"></span>
            СООБЩЕНИЕ ${item.number}: ${highlightText(item.key?.toUpperCase() || '', searchTerm)}
          </div>
          <span class="badge" title="Hash: ${item.hash}">
            ${item.hash?.slice(0, 8)}…
          </span>
          ${isDup ? `<span class="badge dup">Дубликат №${item.duplicateOf}</span>` : ''}
        </div>
        <div class="item-header-right">
          <span class="badge" title="Строк">��� ${item.lines}</span>
          <span class="badge" title="Размер">��� ${formatBytes(item.rawLength)}</span>
          <span class="item-toggle">▼</span>
        </div>
      </div>
      
      <div class="item-meta">
        ${timestamp ? `<span>⏰ ${new Date(timestamp).toLocaleString('ru-RU')}</span>` : ''}
        <span>��� Значений: ${item.valueCount}</span>
        <span>��� Сырой размер: ${item.rawLength} байт</span>
      </div>
      
      <div class="item-content">
        ${item.description ? `
          <div class="item-description">
            ${highlightText(item.description, searchTerm)}
          </div>
        ` : ''}
        <pre class="output line-numbers">${formatJsonWithLineNumbers(
          highlightText(item.pretty || '', searchTerm)
        )}</pre>
      </div>
      
      <div class="buttons">
        <button onclick="window.copyJson(${item.number})">��� Копировать JSON</button>
        <button onclick="window.copyBlock(${item.number})">��� Копировать блок</button>
        <button onclick="window.downloadItem(${item.number})">��� Скачать</button>
        <button onclick="window.addToCompare(${item.number})" class="secondary">��� Сравнить</button>
      </div>
      
      <span class="item-star ${isStarred ? 'starred' : ''}" 
            onclick="window.toggleStar(${item.number})"
            title="${isStarred ? 'Убрать из избранного' : 'Добавить в избранное'}">
        ${isStarred ? '⭐' : '☆'}
      </span>
    `;

    itemsDiv.appendChild(div);
  });

  updateChart(filteredItems, allLogItems);
}

/**
 * Форматирование байтов
 */
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Форматирование JSON с номерами строк
 */
function formatJsonWithLineNumbers(json) {
  const lines = json.split('\n');
  return lines.map(line => `<span class="line">${line}</span>`).join('\n');
}

/**
 * Обновление графика
 */
export function updateChart(filteredItems, allLogItems) {
  const chart = document.getElementById('logsChart');
  if (!chart) return;

  const types = {};
  filteredItems.forEach(item => {
    const type = item.key?.split('_')[0]?.toLowerCase() || 'other';
    types[type] = (types[type] || 0) + 1;
  });

  if (Object.keys(types).length > 0) {
    chart.classList.add('active');
    chart.innerHTML = '';

    const max = Math.max(...Object.values(types));

    Object.entries(types).forEach(([type, count]) => {
      const bar = document.createElement('div');
      bar.className = 'chart-bar';
      bar.style.height = `${(count / max) * 100}%`;
      bar.dataset.label = `${type} (${count})`;
      bar.title = `${type}: ${count} сообщений`;
      chart.appendChild(bar);
    });
  } else {
    chart.classList.remove('active');
  }
}

console.log('✅ Logs UI module loaded');
