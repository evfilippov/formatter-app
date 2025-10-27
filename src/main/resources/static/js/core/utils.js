/* ============================================
   UTILS - Вспомогательные функции
   ============================================ */

/**
 * Устанавливает текст в элемент по ID
 * @param {string} id - ID элемента
 * @param {string} text - Текст для установки
 */
export function setText(id, text) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = text ?? "";
  }
}

/**
 * Скачивание текста как файл
 * @param {string} text - Содержимое файла
 * @param {string} filename - Имя файла
 */
export function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Форматирование размера в байтах
 * @param {number} bytes - Размер в байтах
 * @returns {string} Читаемый формат (B, KB, MB)
 */
export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${Math.round(value * 100) / 100} ${sizes[i]}`;
}

/**
 * Debounce функция (задержка выполнения)
 * @param {Function} func - Функция для выполнения
 * @param {number} wait - Задержка в миллисекундах
 * @returns {Function} Debounced функция
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Копирование текста в буфер обмена
 * @param {string} text - Текст для копирования
 * @returns {Promise<void>}
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    return false;
  }
}

/**
 * Экранирование HTML символов
 * @param {string} text - Текст для экранирования
 * @returns {string} Экранированный текст
 */
export function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
