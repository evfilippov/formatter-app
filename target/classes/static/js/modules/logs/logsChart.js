/* ============================================
   LOGS CHART - График статистики (Chart.js)
   ============================================ */

import { filteredItems } from "./logsState.js";
import { calculateStats } from "./logsUtils.js";

let chartInstance = null;

/**
 * Инициализация графика
 */
export function initChart() {
  const canvas = document.getElementById("logsChart");
  if (!canvas) {
    console.warn("Canvas #logsChart не найден");
    return;
  }

  const ctx = canvas.getContext("2d");

  chartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: [],
      datasets: [
        {
          label: "Типы сообщений",
          data: [],
          backgroundColor: [
            "#4CAF50", // request
            "#2196F3", // response
            "#FF9800", // internal
            "#9C27B0", // external
            "#F44336", // error
            "#607D8B", // other
          ],
          borderWidth: 2,
          borderColor: "#1a1a2e",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#e0e0e0",
            font: { size: 12 },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percent = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percent}%)`;
            },
          },
        },
      },
    },
  });

  console.log("✅ Chart.js инициализирован");
}

/**
 * Обновление графика
 */
export function updateChart() {
  if (!chartInstance) {
    console.warn("Chart не инициализирован");
    return;
  }

  const stats = calculateStats(filteredItems);

  // Данные для графика
  const labels = [];
  const data = [];

  Object.entries(stats.byType).forEach(([type, count]) => {
    labels.push(getTypeLabel(type));
    data.push(count);
  });

  chartInstance.data.labels = labels;
  chartInstance.data.datasets[0].data = data;
  chartInstance.update();

  console.log("📊 График обновлён:", stats);
}

/**
 * Получить читаемое имя типа
 * @param {string} type - Тип сообщения
 * @returns {string} Читаемое имя
 */
function getTypeLabel(type) {
  const labels = {
    request: "📤 Request",
    response: "📥 Response",
    internal: "🔄 Internal",
    external: "🌐 External",
    error: "❌ Error",
    other: "📄 Other",
  };
  return labels[type] || type;
}

/**
 * Обновление текстовой статистики
 */
export function updateStats() {
  const stats = calculateStats(filteredItems);

  // Обновляем DOM элементы
  setText("statsTotal", stats.total);
  setText("statsUnique", stats.unique);
  setText("statsDuplicates", stats.duplicates);

  // Статистика по типам
  const typesList = document.getElementById("statsTypes");
  if (typesList) {
    typesList.innerHTML = "";
    Object.entries(stats.byType).forEach(([type, count]) => {
      const item = document.createElement("div");
      item.className = "stats-item";
      item.innerHTML = `<span>${getTypeLabel(
        type
      )}</span><span>${count}</span>`;
      typesList.appendChild(item);
    });
  }

  // Статистика по уровням
  const levelsList = document.getElementById("statsLevels");
  if (levelsList) {
    levelsList.innerHTML = "";
    Object.entries(stats.byLevel).forEach(([level, count]) => {
      const item = document.createElement("div");
      item.className = "stats-item";
      item.innerHTML = `<span>${getLevelLabel(
        level
      )}</span><span>${count}</span>`;
      levelsList.appendChild(item);
    });
  }

  console.log("📈 Статистика обновлена");
}

/**
 * Получить читаемое имя уровня
 * @param {string} level - Уровень лога
 * @returns {string} Читаемое имя
 */
function getLevelLabel(level) {
  const labels = {
    INFO: "ℹ️ Info",
    DEBUG: "🐛 Debug",
    ERROR: "❌ Error",
    WARNING: "⚠️ Warning",
  };
  return labels[level] || level;
}

/**
 * Установить текст в элемент
 * @param {string} id - ID элемента
 * @param {string|number} text - Текст
 */
function setText(id, text) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = text ?? "0";
  }
}

/**
 * Показать/скрыть панель статистики
 */
export function toggleStatsPanel() {
  const panel = document.getElementById("statsPanel");
  if (panel) {
    panel.classList.toggle("hidden");
  }
}

/**
 * Экспорт статистики как текст
 * @returns {string} Текст статистики
 */
export function exportStats() {
  const stats = calculateStats(filteredItems);

  let text = "=== СТАТИСТИКА ЛОГОВ ===\n\n";
  text += `Всего сообщений: ${stats.total}\n`;
  text += `Уникальных: ${stats.unique}\n`;
  text += `Дубликатов: ${stats.duplicates}\n\n`;

  text += "=== ПО ТИПАМ ===\n";
  Object.entries(stats.byType).forEach(([type, count]) => {
    text += `${getTypeLabel(type)}: ${count}\n`;
  });

  text += "\n=== ПО УРОВНЯМ ===\n";
  Object.entries(stats.byLevel).forEach(([level, count]) => {
    text += `${getLevelLabel(level)}: ${count}\n`;
  });

  return text;
}

/**
 * Сброс графика
 */
export function resetChart() {
  if (chartInstance) {
    chartInstance.data.labels = [];
    chartInstance.data.datasets[0].data = [];
    chartInstance.update();
  }
}
