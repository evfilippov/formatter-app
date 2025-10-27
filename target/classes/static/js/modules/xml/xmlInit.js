/* ============================================
   XML INIT - Инициализация модуля XML
   ============================================ */

import { showNotification } from "../../components/notification.js";

/**
 * Инициализация модуля XML
 */
export function initXml() {
  console.log("🚀 Инициализация модуля XML...");

  // Привязка событий
  bindEvents();

  console.log("✅ Модуль XML инициализирован");
}

/**
 * Привязка событий к элементам
 */
function bindEvents() {
  bindClick("xmlFormatBtn", formatXml);
  bindClick("xmlMinifyBtn", minifyXml);
  bindClick("xmlValidateBtn", validateXml);
  bindClick("xmlCopyBtn", copyXmlOutput);
  bindClick("xmlClearBtn", clearXmlFields);
  bindClick("xmlExampleBtn", loadXmlExample);

  console.log("✅ События XML привязаны");
}

/**
 * Форматирование XML
 */
function formatXml() {
  const input = document.getElementById("xmlInput");
  const output = document.getElementById("xmlOutput");

  if (!input || !output) return;

  const text = input.value.trim();

  if (!text) {
    showNotification("Введите XML для форматирования", "warning");
    return;
  }

  try {
    const formatted = formatXmlString(text);
    output.value = formatted;
    showNotification("✅ XML отформатирован");
  } catch (error) {
    showNotification(`Ошибка: ${error.message}`, "error");
    output.value = `<!-- ОШИБКА: ${error.message} -->\n\n${text}`;
  }
}

/**
 * Минификация XML
 */
function minifyXml() {
  const input = document.getElementById("xmlInput");
  const output = document.getElementById("xmlOutput");

  if (!input || !output) return;

  const text = input.value.trim();

  if (!text) {
    showNotification("Введите XML для минификации", "warning");
    return;
  }

  try {
    const minified = text
      .replace(/>\s+</g, "><")
      .replace(/\s{2,}/g, " ")
      .trim();

    output.value = minified;

    const saved = text.length - minified.length;
    const percent = ((saved / text.length) * 100).toFixed(1);

    showNotification(
      `✅ Минифицировано. Сжатие: ${saved} символов (${percent}%)`
    );
  } catch (error) {
    showNotification(`Ошибка: ${error.message}`, "error");
  }
}

/**
 * Валидация XML
 */
function validateXml() {
  const input = document.getElementById("xmlInput");

  if (!input) return;

  const text = input.value.trim();

  if (!text) {
    showNotification("Введите XML для валидации", "warning");
    return;
  }

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");

    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      throw new Error(parseError.textContent);
    }

    showNotification("✅ XML валиден", "success");
  } catch (error) {
    showNotification(`❌ Невалидный XML: ${error.message}`, "error");
  }
}

/**
 * Копирование результата
 */
function copyXmlOutput() {
  const output = document.getElementById("xmlOutput");
  if (!output) return;

  const text = output.value;
  if (!text) {
    showNotification("Нет данных для копирования", "warning");
    return;
  }

  navigator.clipboard
    .writeText(text)
    .then(() => {
      showNotification("✅ Скопировано в буфер обмена");
    })
    .catch(() => {
      showNotification("Ошибка копирования", "error");
    });
}

/**
 * Очистка полей
 */
function clearXmlFields() {
  const input = document.getElementById("xmlInput");
  const output = document.getElementById("xmlOutput");

  if (input) input.value = "";
  if (output) output.value = "";

  showNotification("🗑️ Поля очищены");
}

/**
 * Загрузка примера XML
 */
function loadXmlExample() {
  const example = `<?xml version="1.0" encoding="UTF-8"?>
<person>
  <name>John Doe</name>
  <age>30</age>
  <email>john@example.com</email>
  <address>
    <street>123 Main St</street>
    <city>New York</city>
    <country>USA</country>
  </address>
  <hobbies>
    <hobby>reading</hobby>
    <hobby>coding</hobby>
    <hobby>gaming</hobby>
  </hobbies>
</person>`;

  const input = document.getElementById("xmlInput");
  if (input) {
    input.value = example;
    showNotification("📝 Пример загружен");
  }
}

/**
 * Форматирование XML строки
 * @param {string} xml - XML строка
 * @returns {string} Отформатированный XML
 */
function formatXmlString(xml) {
  const PADDING = "  "; // 2 пробела
  const reg = /(>)(<)(\/*)/g;
  let pad = 0;

  xml = xml.replace(reg, "$1\n$2$3");

  return xml
    .split("\n")
    .map((node) => {
      let indent = 0;
      if (node.match(/.+<\/\w[^>]*>$/)) {
        indent = 0;
      } else if (node.match(/^<\/\w/)) {
        if (pad !== 0) {
          pad -= 1;
        }
      } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
        indent = 1;
      } else {
        indent = 0;
      }

      const padding = PADDING.repeat(pad);
      pad += indent;

      return padding + node;
    })
    .join("\n");
}

/**
 * Привязка клика к элементу
 * @param {string} id - ID элемента
 * @param {Function} handler - Обработчик
 */
function bindClick(id, handler) {
  const element = document.getElementById(id);
  if (element) {
    element.addEventListener("click", handler);
  }
}

/**
 * Очистка модуля (при переключении секции)
 */
export function cleanupXml() {
  console.log("🧹 Очистка модуля XML...");
}
