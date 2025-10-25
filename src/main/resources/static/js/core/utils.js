// ============================================
// УТИЛИТЫ
// ============================================

/**
 * Отправка POST запроса с JSON данными
 */
export async function postJson(url, body) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await resp.json();
}

/**
 * Установка текста элемента по ID
 */
export function setText(id, text) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = text ?? "";
  }
}

/**
 * Скачивание текста как файла
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
 * Форматирование байтов в читаемый вид
 */
export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Debounce функция для оптимизации частых вызовов
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
 * Экранирование HTML символов
 */
export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Копирование текста в буфер обмена
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
 * Форматирование JSON с номерами строк
 */
export function formatJsonWithLineNumbers(json) {
  const lines = json.split("\n");
  return lines
    .map((line) => `<span class="line">${escapeHtml(line)}</span>`)
    .join("\n");
}

/**
 * Получение элемента по ID с проверкой
 */
export function getElement(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`Element with id "${id}" not found`);
  }
  return el;
}

/**
 * Установка видимости элемента
 */
export function toggleVisibility(id, visible) {
  const el = getElement(id);
  if (el) {
    el.classList.toggle("hidden", !visible);
  }
}
