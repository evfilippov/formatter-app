// Применение словаря строк к статической разметке.
// Источник строк — core/strings.js; разметка несёт ключи в data-атрибутах:
//   data-i18n="logs.title"        → textContent
//   data-i18n-ph="json.placeholder" → placeholder
//   data-i18n-title="logs.backTitle" → title
// Так все русские строки заданы в одном месте, а HTML хранит только структуру.

import { getStr } from "./strings.js";

export function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((node) => {
    const v = getStr(node.getAttribute("data-i18n"));
    if (typeof v === "string") node.textContent = v;
  });
  root.querySelectorAll("[data-i18n-ph]").forEach((node) => {
    const v = getStr(node.getAttribute("data-i18n-ph"));
    if (typeof v === "string") node.setAttribute("placeholder", v);
  });
  root.querySelectorAll("[data-i18n-title]").forEach((node) => {
    const v = getStr(node.getAttribute("data-i18n-title"));
    if (typeof v === "string") node.setAttribute("title", v);
  });
}
