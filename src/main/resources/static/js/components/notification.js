// ============================================
// УВЕДОМЛЕНИЯ
// ============================================

let notificationContainer = null;

/**
 * Инициализация контейнера уведомлений
 */
function initContainer() {
  if (!notificationContainer) {
    notificationContainer = document.getElementById("notificationContainer");
    if (!notificationContainer) {
      notificationContainer = document.createElement("div");
      notificationContainer.id = "notificationContainer";
      notificationContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
      document.body.appendChild(notificationContainer);
    }
  }
  return notificationContainer;
}

/**
 * Показать уведомление
 */
export function showNotification(message, type = "success", duration = 3000) {
  const container = initContainer();

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  notification.innerHTML = `
    <span style="margin-right: 8px;">${icons[type] || icons.info}</span>
    <span>${message}</span>
  `;

  notification.style.cssText = `
    display: flex;
    align-items: center;
    padding: 12px 20px;
    border-radius: 8px;
    background: ${getBackgroundColor(type)};
    color: white;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    animation: slideInRight 0.3s ease-out;
    cursor: pointer;
    min-width: 250px;
    max-width: 400px;
  `;

  container.appendChild(notification);

  // Удаление по клику
  notification.addEventListener("click", () => {
    removeNotification(notification);
  });

  // Автоудаление
  if (duration > 0) {
    setTimeout(() => {
      removeNotification(notification);
    }, duration);
  }

  return notification;
}

/**
 * Удалить уведомление
 */
function removeNotification(notification) {
  notification.style.animation = "slideOutRight 0.3s ease-out";
  setTimeout(() => {
    notification.remove();
  }, 300);
}

/**
 * Получить цвет фона по типу
 */
function getBackgroundColor(type) {
  const colors = {
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#0ea5e9",
  };
  return colors[type] || colors.info;
}

/**
 * Показать уведомление об успехе
 */
export function showSuccess(message, duration) {
  return showNotification(message, "success", duration);
}

/**
 * Показать уведомление об ошибке
 */
export function showError(message, duration) {
  return showNotification(message, "error", duration);
}

/**
 * Показать предупреждение
 */
export function showWarning(message, duration) {
  return showNotification(message, "warning", duration);
}

/**
 * Показать информационное сообщение
 */
export function showInfo(message, duration) {
  return showNotification(message, "info", duration);
}

// Добавляем CSS анимации
const style = document.createElement("style");
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
