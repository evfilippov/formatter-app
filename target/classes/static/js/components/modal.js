/* ============================================
   MODAL - Модальные окна
   ============================================ */

/**
 * Открыть модальное окно сравнения
 * @param {Object} item1 - Первый элемент
 * @param {Object} item2 - Второй элемент
 */
export function openCompareModal(item1, item2) {
  const modal = document.getElementById("compareModal");
  if (!modal) return;

  // Заголовки
  const title1 = document.getElementById("compareTitle1");
  const title2 = document.getElementById("compareTitle2");

  if (title1) {
    title1.textContent = `Сообщение ${item1.number}: ${item1.key}`;
  }
  if (title2) {
    title2.textContent = `Сообщение ${item2.number}: ${item2.key}`;
  }

  // Содержимое
  const content1 = document.getElementById("compareContent1");
  const content2 = document.getElementById("compareContent2");

  if (content1) {
    content1.textContent = item1.pretty || item1.raw || "";
  }
  if (content2) {
    content2.textContent = item2.pretty || item2.raw || "";
  }

  modal.classList.remove("hidden");
}

/**
 * Закрыть модальное окно
 */
export function closeCompareModal() {
  const modal = document.getElementById("compareModal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

/**
 * Инициализация модального окна
 */
export function initModal() {
  // Закрытие по кнопке
  const closeBtn = document.getElementById("modalClose");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeCompareModal);
  }

  // Закрытие по клику вне модала
  const modal = document.getElementById("compareModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target.id === "compareModal") {
        closeCompareModal();
      }
    });
  }

  // Закрытие по Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCompareModal();
    }
  });

  console.log("✅ Modal инициализирован");
}
