// Переключатель темы (тёмная / светлая). Тема хранится в localStorage,
// начальное значение выставляется inline-скриптом в <head> до отрисовки.

import { STR } from "./strings.js";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("theme", theme);
  } catch (e) {}
  const icon = document.getElementById("themeToggleIcon");
  const label = document.getElementById("themeToggleLabel");
  if (icon)
    icon.textContent = theme === "dark" ? STR.theme.iconDark : STR.theme.iconLight;
  if (label)
    label.textContent = theme === "dark" ? STR.theme.dark : STR.theme.light;
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
