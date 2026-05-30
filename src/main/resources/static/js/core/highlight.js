// Подсветка текста: поиск (highlightText) и синтаксис JSON (syntaxHighlightJson),
// извлечение traceId и нумерация строк для вывода.

import { escapeHtml } from "./dom.js";

export function highlightText(text, searchTerm) {
  // Сначала ВСЕГДА экранируем: дальше результат уходит в innerHTML.
  const safe = escapeHtml(text);

  if (!searchTerm || !document.getElementById("highlightSearch")?.checked) {
    return safe;
  }

  const isRegex = document.getElementById("regexMode")?.checked;
  let regex;

  try {
    if (isRegex) {
      regex = new RegExp(`(${searchTerm})`, "gi");
    } else {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      regex = new RegExp(`(${escaped})`, "gi");
    }
    return safe.replace(regex, '<span class="highlight">$1</span>');
  } catch (e) {
    console.error("Invalid regex:", e);
    return safe;
  }
}

// Подсветка синтаксиса JSON. Экранируем только &<> (кавычки нужны для
// распознавания токенов и безопасны в текстовом контексте innerHTML),
// затем оборачиваем ключи/строки/числа/литералы в span с классами tok-*.
export function syntaxHighlightJson(text) {
  const esc = String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc.replace(
    /("(?:\\.|[^"\\])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "tok-num";
      if (match[0] === '"') {
        cls = /:\s*$/.test(match) ? "tok-key" : "tok-str";
      } else if (match === "true" || match === "false") {
        cls = "tok-bool";
      } else if (match === "null") {
        cls = "tok-null";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

// Извлекает traceId из извлечённого JSON сообщения (item.pretty), если он там есть.
// raw-поля у item нет — traceId доступен, только когда входит в извлечённый payload.
export function extractTraceId(item) {
  const text = item.pretty || item.raw || "";
  const m = /"trace[_-]?id"\s*:\s*"([^"]+)"/i.exec(text);
  return m ? m[1] : "";
}

export function formatJsonWithLineNumbers(json) {
  const lines = json.split("\n");
  return lines.map((line) => `<span class="line">${line}</span>`).join("\n");
}
