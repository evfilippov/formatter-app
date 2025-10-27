/* ============================================
   LOGS PROCESSOR - Обработка данных с API
   ============================================ */

import { processLogs } from "../../core/api.js";
import { setAllLogItems, setFilteredItems, resetState } from "./logsState.js";
import { renderLogItems } from "./logsRender.js";
import { updateChart, updateStats, resetChart } from "./logsChart.js";
import { saveToLocalStorage } from "./logsStorage.js";
import { showNotification } from "../../components/notification.js";
import { setText } from "../../core/utils.js";

/**
 * Обработка логов
 */
export async function handleProcessLogs() {
  const input = document.getElementById("logsInput");
  if (!input) return;

  const text = input.value.trim();

  if (!text) {
    showNotification("Введите данные для обработки", "warning");
    return;
  }

  // Валидация
  const validation = validateInput(text);
  if (!validation.valid) {
    showNotification(validation.errors.join(", "), "error");
    return;
  }

  if (validation.warnings.length > 0) {
    console.warn("⚠️", validation.warnings.join(", "));
  }

  // Показываем лоадер
  showLoader(true);
  disableButtons(true);

  try {
    console.log("📤 Отправка данных на сервер...");

    // Вызываем API
    const data = await processLogs(text);

    console.log("📥 Получено с сервера:", data);

    // Обрабатываем результат
    if (data && data.items && data.items.length > 0) {
      // Сохраняем данные
      setAllLogItems(data.items);
      setFilteredItems(data.items);

      // Рендерим карточки
      renderLogItems();

      // Обновляем статистику и график
      updateChart();
      updateStats();

      // Обновляем счетчики
      updateCounters(data);

      // Автосохранение
      saveToLocalStorage();

      // Уведомление
      showNotification(`✅ Обработано ${data.items.length} сообщений`);

      console.log(`✅ Обработка завершена: ${data.items.length} сообщений`);
    } else {
      showNotification("⚠️ Не удалось извлечь сообщения", "warning");
      console.warn("Пустой ответ от сервера");
    }
  } catch (error) {
    console.error("❌ Ошибка обработки:", error);
    showNotification(
      `Ошибка: ${error.message || "Неизвестная ошибка"}`,
      "error"
    );
  } finally {
    showLoader(false);
    disableButtons(false);
  }
}

/**
 * Очистка всех данных
 */
export function handleClearLogs() {
  if (!confirm("Очистить все данные?\n\nЭто действие нельзя отменить.")) {
    return;
  }

  // Очищаем input
  const input = document.getElementById("logsInput");
  if (input) {
    input.value = "";
  }

  // Сбрасываем состояние
  resetState();

  // Очищаем UI
  const itemsDiv = document.getElementById("logsItems");
  if (itemsDiv) {
    itemsDiv.innerHTML = "";
  }

  // Сбрасываем счетчики
  setText("logsTotal", "0");
  setText("logsUnique", "0");
  setText("logsDuplicates", "0");
  setText("statsTotal", "0");
  setText("statsUnique", "0");
  setText("statsDuplicates", "0");

  // Сбрасываем график
  resetChart();

  showNotification("🗑️ Данные очищены");
  console.log("🗑️ Все данные очищены");
}

/**
 * Обновление счетчиков
 * @param {Object} data - Данные с сервера
 */
function updateCounters(data) {
  // Основные счетчики
  setText("logsTotal", data.totalMessages || 0);
  setText("logsUnique", data.uniqueMessages || 0);
  setText("logsDuplicates", data.duplicateMessages || 0);

  // Счетчики в панели статистики
  setText("statsTotal", data.totalMessages || 0);
  setText("statsUnique", data.uniqueMessages || 0);
  setText("statsDuplicates", data.duplicateMessages || 0);
}

/**
 * Показать/скрыть лоадер
 * @param {boolean} show - Показать?
 */
function showLoader(show) {
  const loader = document.getElementById("logsLoader");
  if (loader) {
    if (show) {
      loader.classList.remove("hidden");
    } else {
      loader.classList.add("hidden");
    }
  }
}

/**
 * Заблокировать/разблокировать кнопки
 * @param {boolean} disable - Заблокировать?
 */
function disableButtons(disable) {
  const buttons = [
    "logsProcessBtn",
    "logsClearBtn",
    "logsExportBtn",
    "logsExportSelectedBtn",
  ];

  buttons.forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = disable;
    }
  });
}

/**
 * Загрузка файла
 */
export function handleFileUpload() {
  const fileInput = document.getElementById("logsFileInput");
  if (!fileInput) return;

  const file = fileInput.files[0];
  if (!file) {
    showNotification("Выберите файл", "warning");
    return;
  }

  const reader = new FileReader();

  reader.onload = (e) => {
    const content = e.target.result;
    const input = document.getElementById("logsInput");
    if (input) {
      input.value = content;
      showNotification(`📁 Файл "${file.name}" загружен`);
    }
  };

  reader.onerror = () => {
    showNotification("Ошибка чтения файла", "error");
  };

  reader.readAsText(file);
}

/**
 * Повторная обработка
 */
export function handleReprocess() {
  const input = document.getElementById("logsInput");
  if (!input || !input.value.trim()) {
    showNotification("Нет данных для повторной обработки", "warning");
    return;
  }

  // Очищаем текущие данные
  resetState();

  // Запускаем обработку
  handleProcessLogs();
}

/**
 * Валидация входных данных
 * @param {string} text - Текст для проверки
 * @returns {Object} Результат валидации
 */
export function validateInput(text) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Проверка на пустоту
  if (!text || text.trim().length === 0) {
    result.valid = false;
    result.errors.push("Данные не могут быть пустыми");
    return result;
  }

  // Проверка минимальной длины
  if (text.length < 10) {
    result.valid = false;
    result.errors.push("Слишком короткий текст (минимум 10 символов)");
    return result;
  }

  // Проверка максимальной длины (5 MB)
  const maxSize = 5 * 1024 * 1024;
  if (text.length > maxSize) {
    result.valid = false;
    result.errors.push(
      `Слишком большой текст (максимум 5 MB, у вас ${(
        text.length /
        1024 /
        1024
      ).toFixed(2)} MB)`
    );
    return result;
  }

  // Предупреждения
  if (text.length > 1024 * 1024) {
    result.warnings.push("Большой объём данных, обработка может занять время");
  }

  return result;
}
