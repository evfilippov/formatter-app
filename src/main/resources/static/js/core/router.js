// Маршрутизация: переключение разделов по hash + подсветка пункта сайдбара.

export function navigate(hash) {
  window.location.hash = hash;
  onRoute();
}

export function onRoute() {
  const routes = ["home", "logs", "logsResult", "json", "xml"];
  const h = window.location.hash?.substring(1) || "home";
  for (const r of routes) {
    document.getElementById(r)?.classList.toggle("hidden", r !== h);
  }
  // Страница результатов логов подсвечивает в сайдбаре пункт «Логи».
  const navKey = h === "logsResult" ? "logs" : h;
  document.querySelectorAll(".sidebar-nav a[data-route]").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === navKey);
  });
}

window.addEventListener("hashchange", onRoute);
window.addEventListener("load", onRoute);
