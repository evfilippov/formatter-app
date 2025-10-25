// ============================================
// NOTIFICATIONS
// ============================================

/**
 * Показать уведомление
 */
export function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Добавляем стили если их нет
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 8px;
        background: var(--bg-secondary, #fff);
        color: var(--text-primary, #000);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
        word-wrap: break-word;
      }
      
      .notification.success {
        background: #d4edda;
        color: #155724;
        border-left: 4px solid #28a745;
      }
      
      .notification.error {
        background: #f8d7da;
        color: #721c24;
        border-left: 4px solid #dc3545;
      }
      
      .notification.warning {
        background: #fff3cd;
        color: #856404;
        border-left: 4px solid #ffc107;
      }
      
      .notification.info {
        background: #d1ecf1;
        color: #0c5460;
        border-left: 4px solid #17a2b8;
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Вспомогательные функции
 */
export function showSuccess(message) {
  showNotification(message, 'success');
}

export function showError(message) {
  showNotification(message, 'error');
}

export function showWarning(message) {
  showNotification(message, 'warning');
}

export function showInfo(message) {
  showNotification(message, 'info');
}

console.log('✅ Notification component loaded');
