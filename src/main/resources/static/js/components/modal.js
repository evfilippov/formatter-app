// ============================================
// МОДАЛЬНЫЕ ОКНА
// ============================================

let activeModal = null;

/**
 * Открыть модальное окно
 */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("hidden");
    activeModal = modal;

    // Закрытие по Escape
    document.addEventListener("keydown", handleEscapeKey);

    // Закрытие по клику вне окна
    modal.addEventListener("click", handleBackdropClick);
  }
}

/**
 * Закрыть модальное окно
 */
export function closeModal(modalId) {
  const modal = modalId ? document.getElementById(modalId) : activeModal;
  if (modal) {
    modal.classList.add("hidden");
    activeModal = null;

    document.removeEventListener("keydown", handleEscapeKey);
    modal.removeEventListener("click", handleBackdropClick);
  }
}

/**
 * Закрытие по Escape
 */
function handleEscapeKey(e) {
  if (e.key === "Escape" && activeModal) {
    closeModal();
  }
}

/**
 * Закрытие по клику на backdrop
 */
function handleBackdropClick(e) {
  if (e.target.classList.contains("modal")) {
    closeModal();
  }
}

/**
 * Инициализация обработчиков модальных окон
 */
export function initModals() {
  // Обработка кнопок закрытия
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-close")) {
      closeModal();
    }
  });

  console.log("✅ Modals initialized");
}
