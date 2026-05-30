// Переключатель темы (тёмная / светлая). Тема хранится в localStorage,
// начальное значение выставляется inline-скриптом в <head> до отрисовки.

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("theme", theme);
  } catch (e) {}
  const icon = document.getElementById("themeToggleIcon");
  const label = document.getElementById("themeToggleLabel");
  if (icon) icon.textContent = theme === "dark" ? "☾" : "☀";
  if (label)
    label.textContent = theme === "dark" ? "Тёмная тема" : "Светлая тема";
}

document.addEventListener("DOMContentLoaded", () => {
  const current =
    document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(current);
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const next =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    applyTheme(next);
  });
});
