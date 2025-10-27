/* ============================================
   NOTIFICATION - Всплывающие уведомления
   ============================================ */

/**
 * Показать уведомление
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип: success, error, warning
 */
export function showNotification(message, type = "success") {
  // Удаляем старые уведомления
  document.querySelectorAll(".notification").forEach((n) => n.remove());

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Автоматическое удаление через 3 секунды
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Показать успешное уведомление
 * @param {string} message - Текст сообщения
 */
export function showSuccess(message) {
  showNotification(message, "success");
}

/**
 * Показать уведомление об ошибке
 * @param {string} message - Текст сообщения
 */
export function showError(message) {
  showNotification(message, "error");
}

/**
 * Показать предупреждение
 * @param {string} message - Текст сообщения
 */
export function showWarning(message) {
  showNotification(message, "warning");
}
