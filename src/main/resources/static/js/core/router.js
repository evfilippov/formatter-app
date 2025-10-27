/* ============================================
   ROUTER - Навигация между разделами
   ============================================ */

/**
 * Переход на указанный маршрут
 * @param {string} hash - Название раздела (home, logs, json, xml, graphql)
 */
export function navigate(hash) {
  window.location.hash = hash;
  onRoute();
}

/**
 * Обработка текущего маршрута
 */
export function onRoute() {
  const routes = ["home", "logs", "json", "xml", "graphql"];
  const currentHash = window.location.hash?.substring(1) || "home";

  routes.forEach((route) => {
    const section = document.getElementById(route);
    if (section) {
      section.classList.toggle("hidden", route !== currentHash);
    }
  });
}

/**
 * Инициализация роутера
 */
export function initRouter() {
  window.addEventListener("hashchange", onRoute);
  window.addEventListener("load", onRoute);

  console.log("✅ Router инициализирован");
}
