/* ============================================
   JSON FORMATTER - Форматирование и валидация JSON
   ============================================ */

import { showNotification } from "../../components/notification.js";

/**
 * Форматирование JSON
 */
export function formatJson() {
  const input = document.getElementById("jsonInput");
  const output = document.getElementById("jsonOutput");

  if (!input || !output) return;

  const text = input.value.trim();

  if (!text) {
    showNotification("Введите JSON для форматирования", "warning");
    return;
  }

  try {
    // Парсим JSON
    const parsed = JSON.parse(text);

    // Получаем настройки
    const indent = parseInt(
      document.getElementById("jsonIndent")?.value || "2"
    );
    const sortKeys = document.getElementById("jsonSortKeys")?.checked || false;

    // Форматируем
    let formatted;
    if (sortKeys) {
      formatted = JSON.stringify(sortObject(parsed), null, indent);
    } else {
      formatted = JSON.stringify(parsed, null, indent);
    }

    // Выводим результат
    output.value = formatted;

    // Обновляем статистику
    updateJsonStats(parsed, formatted);

    showNotification("✅ JSON отформатирован");
  } catch (error) {
    showNotification(`Ошибка: ${error.message}`, "error");
    output.value = `// ОШИБКА ПАРСИНГА:\n// ${error.message}\n\n${text}`;
  }
}

/**
 * Минификация JSON
 */
export function minifyJson() {
  const input = document.getElementById("jsonInput");
  const output = document.getElementById("jsonOutput");

  if (!input || !output) return;

  const text = input.value.trim();

  if (!text) {
    showNotification("Введите JSON для минификации", "warning");
    return;
  }

  try {
    const parsed = JSON.parse(text);
    const minified = JSON.stringify(parsed);

    output.value = minified;

    const saved = text.length - minified.length;
    const percent = ((saved / text.length) * 100).toFixed(1);

    updateJsonStats(parsed, minified);
    showNotification(
      `✅ Минифицировано. Сжатие: ${saved} символов (${percent}%)`
    );
  } catch (error) {
    showNotification(`Ошибка: ${error.message}`, "error");
    output.value = `// ОШИБКА ПАРСИНГА:\n// ${error.message}\n\n${text}`;
  }
}

/**
 * Валидация JSON
 */
export function validateJson() {
  const input = document.getElementById("jsonInput");

  if (!input) return;

  const text = input.value.trim();

  if (!text) {
    showNotification("Введите JSON для валидации", "warning");
    return;
  }

  try {
    const parsed = JSON.parse(text);
    showNotification("✅ JSON валиден", "success");
    updateJsonStats(parsed, text);
  } catch (error) {
    showNotification(`❌ Невалидный JSON: ${error.message}`, "error");
    highlightError(error, text);
  }
}

/**
 * Подсветка ошибки в JSON
 * @param {Error} error - Ошибка парсинга
 * @param {string} text - Исходный текст
 */
function highlightError(error, text) {
  const output = document.getElementById("jsonOutput");
  if (!output) return;

  // Пытаемся найти позицию ошибки
  const match = error.message.match(/position (\d+)/);
  if (match) {
    const position = parseInt(match[1]);
    const lines = text.split("\n");
    let currentPos = 0;
    let errorLine = 0;

    for (let i = 0; i < lines.length; i++) {
      currentPos += lines[i].length + 1; // +1 для \n
      if (currentPos >= position) {
        errorLine = i + 1;
        break;
      }
    }

    output.value = `// ❌ ОШИБКА В СТРОКЕ ${errorLine}:\n// ${error.message}\n\n${text}`;
  } else {
    output.value = `// ❌ ОШИБКА:\n// ${error.message}\n\n${text}`;
  }
}

/**
 * Сортировка ключей объекта рекурсивно
 * @param {any} obj - Объект для сортировки
 * @returns {any} Отсортированный объект
 */
function sortObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sortObject);
  } else if (obj !== null && typeof obj === "object") {
    const sorted = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sorted[key] = sortObject(obj[key]);
      });
    return sorted;
  }
  return obj;
}

/**
 * Обновление статистики JSON
 * @param {any} parsed - Распарсенный JSON
 * @param {string} text - Текст JSON
 */
function updateJsonStats(parsed, text) {
  const stats = calculateJsonStats(parsed, text);

  setText("jsonSize", `${stats.size} символов`);
  setText("jsonLines", stats.lines);
  setText("jsonKeys", stats.keys);
  setText("jsonDepth", stats.depth);
  setText("jsonType", stats.type);
}

/**
 * Подсчёт статистики JSON
 * @param {any} parsed - Распарсенный JSON
 * @param {string} text - Текст JSON
 * @returns {Object} Статистика
 */
function calculateJsonStats(parsed, text) {
  return {
    size: text.length,
    lines: text.split("\n").length,
    keys: countKeys(parsed),
    depth: getDepth(parsed),
    type: getType(parsed),
  };
}

/**
 * Подсчёт количества ключей
 * @param {any} obj - Объект
 * @returns {number} Количество ключей
 */
function countKeys(obj) {
  let count = 0;

  if (Array.isArray(obj)) {
    obj.forEach((item) => {
      count += countKeys(item);
    });
  } else if (obj !== null && typeof obj === "object") {
    count += Object.keys(obj).length;
    Object.values(obj).forEach((value) => {
      count += countKeys(value);
    });
  }

  return count;
}

/**
 * Получение глубины вложенности
 * @param {any} obj - Объект
 * @returns {number} Глубина
 */
function getDepth(obj) {
  if (Array.isArray(obj)) {
    const depths = obj.map(getDepth);
    return 1 + Math.max(0, ...depths);
  } else if (obj !== null && typeof obj === "object") {
    const depths = Object.values(obj).map(getDepth);
    return 1 + Math.max(0, ...depths);
  }
  return 0;
}

/**
 * Получение типа данных
 * @param {any} obj - Объект
 * @returns {string} Тип
 */
function getType(obj) {
  if (Array.isArray(obj)) return "Array";
  if (obj === null) return "null";
  if (typeof obj === "object") return "Object";
  return typeof obj;
}

/**
 * Установить текст в элемент
 * @param {string} id - ID элемента
 * @param {string|number} text - Текст
 */
function setText(id, text) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = text ?? "";
  }
}

/**
 * Копирование результата
 */
export function copyJsonOutput() {
  const output = document.getElementById("jsonOutput");
  if (!output) return;

  const text = output.value;
  if (!text) {
    showNotification("Нет данных для копирования", "warning");
    return;
  }

  navigator.clipboard
    .writeText(text)
    .then(() => {
      showNotification("✅ Скопировано в буфер обмена");
    })
    .catch(() => {
      showNotification("Ошибка копирования", "error");
    });
}

/**
 * Очистка полей
 */
export function clearJsonFields() {
  const input = document.getElementById("jsonInput");
  const output = document.getElementById("jsonOutput");

  if (input) input.value = "";
  if (output) output.value = "";

  setText("jsonSize", "0 символов");
  setText("jsonLines", "0");
  setText("jsonKeys", "0");
  setText("jsonDepth", "0");
  setText("jsonType", "-");

  showNotification("🗑️ Поля очищены");
}

/**
 * Загрузка примера JSON
 */
export function loadJsonExample() {
  const example = {
    name: "John Doe",
    age: 30,
    email: "john@example.com",
    address: {
      street: "123 Main St",
      city: "New York",
      country: "USA",
    },
    hobbies: ["reading", "coding", "gaming"],
    active: true,
  };

  const input = document.getElementById("jsonInput");
  if (input) {
    input.value = JSON.stringify(example);
    showNotification("📝 Пример загружен");
  }
}
