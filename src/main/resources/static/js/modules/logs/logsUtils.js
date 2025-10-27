/* ============================================
   LOGS UTILS - Вспомогательные функции для логов
   ============================================ */

/**
 * Подсветка текста в результатах поиска
 * @param {string} text - Исходный текст
 * @param {string} searchTerm - Поисковый запрос
 * @returns {string} Текст с HTML подсветкой
 */
export function highlightText(text, searchTerm) {
  if (!searchTerm || !document.getElementById("highlightSearch")?.checked) {
    return text;
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
    return text.replace(regex, '<span class="highlight">$1</span>');
  } catch (e) {
    console.error("Invalid regex:", e);
    return text;
  }
}

/**
 * Форматирование JSON с номерами строк
 * @param {string} json - JSON текст
 * @returns {string} HTML с номерами строк
 */
export function formatJsonWithLineNumbers(json) {
  const lines = json.split("\n");
  return lines.map((line) => `<span class="line">${line}</span>`).join("\n");
}

/**
 * Построение разделителя для блока
 * @param {number} number - Номер сообщения
 * @param {string} key - Ключ сообщения
 * @param {string} description - Описание
 * @param {boolean} first - Первый блок?
 * @returns {string} Разделитель
 */
export function buildSeparator(number, key, description, first = false) {
  const line = "/".repeat(70) + "\n";
  let separator = "";

  if (first) {
    separator += line;
    separator += `// СООБЩЕНИЕ ${number}: ${key.toUpperCase()}\n`;
    if (description && description !== "Без описания") {
      separator += `// ${description}\n`;
    }
    separator += line + "\n\n";
  } else {
    separator += "\n\n" + line;
    separator += `// СООБЩЕНИЕ ${number}: ${key.toUpperCase()}\n`;
    if (description && description !== "Без описания") {
      separator += `// ${description}\n`;
    }
    separator += line + "\n\n";
  }

  return separator;
}

/**
 * Определение уровня лога из raw JSON
 * @param {string} raw - Сырой JSON
 * @returns {string} Уровень: INFO, DEBUG, ERROR, WARNING
 */
export function extractLogLevel(raw) {
  try {
    const logData = JSON.parse(raw || "{}");
    return (logData.level || "INFO").toUpperCase();
  } catch (e) {
    return "INFO";
  }
}

/**
 * Извлечение timestamp из raw JSON
 * @param {string} raw - Сырой JSON
 * @returns {string} ISO timestamp или пустая строка
 */
export function extractTimestamp(raw) {
  try {
    const logData = JSON.parse(raw || "{}");
    return logData.timestamp || "";
  } catch (e) {
    return "";
  }
}

/**
 * Форматирование timestamp для отображения
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Читаемая дата и время
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  try {
    return new Date(timestamp).toLocaleString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch (e) {
    return timestamp;
  }
}

/**
 * Определение типа сообщения из ключа
 * @param {string} key - Ключ сообщения (например, "REQUEST_INTERNAL")
 * @returns {string} Тип: request, response, internal, external, other
 */
export function getMessageType(key) {
  if (!key) return "other";

  const lowerKey = key.toLowerCase();

  if (lowerKey.includes("request")) return "request";
  if (lowerKey.includes("response")) return "response";
  if (lowerKey.includes("internal")) return "internal";
  if (lowerKey.includes("external")) return "external";
  if (lowerKey.includes("error")) return "error";

  return "other";
}

/**
 * Получение CSS класса для уровня лога
 * @param {string} level - Уровень лога
 * @returns {string} CSS класс
 */
export function getLogLevelClass(level) {
  const levelLower = (level || "info").toLowerCase();
  return `log-level-${levelLower}`;
}

/**
 * Получение иконки для типа сообщения
 * @param {string} type - Тип сообщения
 * @returns {string} Emoji иконка
 */
export function getTypeIcon(type) {
  const icons = {
    request: "📤",
    response: "📥",
    internal: "🔄",
    external: "🌐",
    error: "❌",
    other: "📄",
  };
  return icons[type] || "📄";
}

/**
 * Проверка, является ли элемент дубликатом
 * @param {Object} item - Элемент лога
 * @returns {boolean} true если дубликат
 */
export function isDuplicate(item) {
  return item.duplicateOf !== null && item.duplicateOf !== undefined;
}

/**
 * Экспорт выбранных элементов как текст
 * @param {Array<Object>} items - Массив элементов
 * @returns {string} Текстовый формат для экспорта
 */
export function exportItemsAsText(items) {
  return items
    .map((item, index) => {
      const sep = buildSeparator(
        item.number,
        item.key || "UNKNOWN",
        item.description || "",
        index === 0
      );
      return sep + (item.pretty || item.raw || "");
    })
    .join("\n");
}

/**
 * Подсчет статистики по типам
 * @param {Array<Object>} items - Массив элементов
 * @returns {Object} Объект со статистикой
 */
export function calculateStats(items) {
  const stats = {
    total: items.length,
    byType: {},
    byLevel: {},
    duplicates: 0,
    unique: 0,
  };

  items.forEach((item) => {
    // По типам
    const type = getMessageType(item.key);
    stats.byType[type] = (stats.byType[type] || 0) + 1;

    // По уровням
    const level = extractLogLevel(item.raw);
    stats.byLevel[level] = (stats.byLevel[level] || 0) + 1;

    // Дубликаты
    if (isDuplicate(item)) {
      stats.duplicates++;
    } else {
      stats.unique++;
    }
  });

  return stats;
}
