// ============================================
// РОУТИНГ
// ============================================

const routes = ["home", "logs", "json", "xml", "graphql"];
let currentRoute = "home";

/**
 * Навигация к определённому роуту
 */
export function navigate(hash) {
  const route = hash.replace("#", "");
  window.location.hash = route;
}

/**
 * Обработка изменения роута
 */
export function onRoute() {
  const hash = window.location.hash?.substring(1) || "home";

  console.log("��� Route changed to:", hash);

  // Скрываем все секции
  for (const route of routes) {
    const el = document.getElementById(route);
    if (el) {
      el.classList.toggle("hidden", route !== hash);
    }
  }

  // Обновляем активную ссылку в навигации
  document.querySelectorAll("header nav a").forEach((link) => {
    const linkRoute = link.getAttribute("href")?.substring(1);
    if (linkRoute === hash) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  currentRoute = hash;

  // Отправляем событие для модулей
  window.dispatchEvent(
    new CustomEvent("routeChange", {
      detail: { route: hash },
    })
  );
}

/**
 * Инициализация роутера
 */
export function initRouter() {
  console.log("��� Router: Initializing...");

  // Слушаем изменение hash
  window.addEventListener("hashchange", onRoute);

  // Обрабатываем клики по ссылкам навигации
  document.querySelectorAll("header nav a[href^='#']").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const hash = link.getAttribute("href");
      navigate(hash);
    });
  });

  // Обрабатываем клики по карточкам на главной странице
  document.querySelectorAll(".card[data-route]").forEach((card) => {
    card.addEventListener("click", () => {
      const route = card.dataset.route;
      navigate("#" + route);
    });
  });

  // Первоначальная загрузка роута
  onRoute();

  console.log("✅ Router initialized");
}
