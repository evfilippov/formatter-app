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

  // Скрываем все секции
  for (const route of routes) {
    const el = document.getElementById(route);
    if (el) {
      el.classList.toggle("hidden", route !== hash);
    }
  }

  // Обновляем активную ссылку в навигации
  updateActiveNavLink(hash);

  // Уведомляем другие модули о смене роута
  currentRoute = hash;
  window.dispatchEvent(
    new CustomEvent("routeChange", {
      detail: { route: hash, previous: currentRoute },
    })
  );

  console.log(`📍 Route changed: ${hash}`);
}

/**
 * Обновление активной ссылки в навигации
 */
function updateActiveNavLink(hash) {
  const navLinks = document.querySelectorAll("nav a");
  navLinks.forEach((link) => {
    const href = link.getAttribute("href")?.substring(1);
    if (href === hash) {
      link.style.background = "rgba(255, 255, 255, 0.15)";
    } else {
      link.style.background = "";
    }
  });
}

/**
 * Получение текущего роута
 */
export function getCurrentRoute() {
  return currentRoute;
}

/**
 * Инициализация роутера
 */
export function initRouter() {
  // Слушаем изменения hash
  window.addEventListener("hashchange", onRoute);

  // Обрабатываем клики по навигации
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-navigate]");
    if (target) {
      e.preventDefault();
      const route = target.dataset.navigate;
      navigate(route);
    }
  });

  // Инициализируем начальный роут
  onRoute();

  console.log("✅ Router initialized");
}
