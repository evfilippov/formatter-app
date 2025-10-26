// ============================================
// МОДАЛЬНЫЕ ОКНА
// ============================================

export function initModals() {
  console.log('��� Modals initialized');

  // Закрытие модального окна по клику на backdrop
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      closeModal(e.target.id);
    }
  });

  // Закрытие по кнопке закрытия
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) closeModal(modal.id);
    });
  });

  // Закрытие по ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
        closeModal(modal.id);
      });
    }
  });

  // Обработчик для кнопки закрытия сравнения
  const btnCloseCompare = document.getElementById('btnCloseCompare');
  if (btnCloseCompare) {
    btnCloseCompare.addEventListener('click', () => {
      closeModal('compareModal');
    });
  }
}

export function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

// Экспорт в window для HTML onclick
window.closeModal = closeModal;
window.openModal = openModal;

console.log('✅ Modal component loaded');
