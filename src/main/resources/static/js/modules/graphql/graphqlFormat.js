// ============================================
// XML MODULE
// ============================================

import { formatXml } from "../../core/api.js";
import {
  downloadText,
  copyToClipboard,
  setText,
  formatBytes,
} from "../../core/utils.js";
import { showSuccess, showError } from "../../components/notification.js";

let currentXmlOutput = "";

/**
 * Инициализация модуля XML
 */
export function initXml() {
  console.log("🚀 XML Module: Initializing...");

  // Обработчики файлов
  const xmlFile = document.getElementById("xmlFile");
  if (xmlFile) {
    xmlFile.addEventListener("change", handleXmlFileUpload);
  }

  // Кнопки форматирования
  const btnXmlPretty = document.getElementById("btnXmlPretty");
  const btnXmlMinify = document.getElementById("btnXmlMinify");
  const btnXmlValidate = document.getElementById("btnXmlValidate");

  if (btnXmlPretty)
    btnXmlPretty.addEventListener("click", () => handleFormat("pretty"));
  if (btnXmlMinify)
    btnXmlMinify.addEventListener("click", () => handleFormat("minify"));
  if (btnXmlValidate)
    btnXmlValidate.addEventListener("click", () => handleFormat("validate"));

  // Кнопки экспорта
  const btnCopyXml = document.getElementById("btnCopyXml");
  const btnDownloadXml = document.getElementById("btnDownloadXml");

  if (btnCopyXml) {
    btnCopyXml.addEventListener("click", async () => {
      if (await copyToClipboard(currentXmlOutput)) {
        showSuccess("XML скопирован в буфер обмена");
      }
    });
  }

  if (btnDownloadXml) {
    btnDownloadXml.addEventListener("click", () => {
      downloadText(currentXmlOutput, "result.xml");
      showSuccess("Файл скачан");
    });
  }

  console.log("✅ XML Module: Ready");
}

/**
 * Обработка загрузки файла
 */
async function handleXmlFileUpload(e) {
  const file = e.target.files[0];
  const info = document.getElementById("xmlFileInfo");

  if (!file) {
    if (info) info.textContent = "";
    return;
  }

  if (info) {
    info.textContent = `${file.name} (${formatBytes(file.size)})`;
  }

  const text = await file.text();
  const input = document.getElementById("xmlInput");
  if (input) {
    input.value = text;
  }

  showSuccess("Файл загружен");
}

/**
 * Форматирование XML
 */
async function handleFormat(action) {
  const input = document.getElementById("xmlInput")?.value;

  if (!input?.trim()) {
    showError("Введите XML для обработки");
    return;
  }

  const options = {
    unescape: document.getElementById("xmlUnescape")?.checked || false,
    keepDeclaration: document.getElementById("xmlKeepDecl")?.checked || false,
    escape: document.getElementById("xmlEscape")?.checked || false,
  };

  clearOutput();

  try {
    const result = await formatXml(action, input, options);

    if (!result.success) {
      showError(result.message || "Ошибка форматирования");
      displayErrors(result.message || result.error);
      return;
    }

    displayOutput(result.output || result.result || "");
    displayStats(result.stats);
    displayIntegrity(result.integrity);

    showSuccess(`${action.toUpperCase()} выполнен`);
  } catch (error) {
    console.error("Format error:", error);
    showError("Ошибка форматирования");
    displayErrors(error.message);
  }
}

/**
 * Отображение результата
 */
function displayOutput(output) {
  currentXmlOutput = output;
  const outputEl = document.getElementById("xmlOutput");
  if (outputEl) {
    outputEl.textContent = output;
  }

  const btnCopy = document.getElementById("btnCopyXml");
  const btnDownload = document.getElementById("btnDownloadXml");

  if (btnCopy) btnCopy.disabled = false;
  if (btnDownload) btnDownload.disabled = false;
}

/**
 * Отображение статистики
 */
function displayStats(stats) {
  if (!stats) return;

  const statsEl = document.getElementById("xmlStats");
  if (statsEl) {
    const parts = [];
    if (stats.elements !== undefined)
      parts.push(`Элементов: ${stats.elements}`);
    if (stats.attributes !== undefined)
      parts.push(`Атрибутов: ${stats.attributes}`);
    if (stats.originalSize !== undefined)
      parts.push(`Исходный: ${formatBytes(stats.originalSize)}`);
    if (stats.formattedSize !== undefined)
      parts.push(`Форматированный: ${formatBytes(stats.formattedSize)}`);

    statsEl.textContent = parts.join(" | ");
  }
}

/**
 * Отображение информации о целостности
 */
function displayIntegrity(integrity) {
  if (!integrity) return;

  const integrityEl = document.getElementById("xmlIntegrity");
  if (integrityEl) {
    const status = integrity.valid ? "✅ Валидный XML" : "❌ Невалидный XML";
    const depth = integrity.maxDepth ? ` | Глубина: ${integrity.maxDepth}` : "";

    integrityEl.textContent = `${status}${depth}`;
  }
}

/**
 * Отображение ошибок
 */
function displayErrors(errorMessage) {
  const errorsEl = document.getElementById("xmlErrors");
  if (errorsEl) {
    errorsEl.textContent = errorMessage;
    errorsEl.style.display = "block";
  }
}

/**
 * Очистка вывода
 */
function clearOutput() {
  currentXmlOutput = "";

  setText("xmlOutput", "");
  setText("xmlStats", "");
  setText("xmlIntegrity", "");
  setText("xmlErrors", "");

  const errorsEl = document.getElementById("xmlErrors");
  if (errorsEl) {
    errorsEl.style.display = "none";
  }

  const btnCopy = document.getElementById("btnCopyXml");
  const btnDownload = document.getElementById("btnDownloadXml");

  if (btnCopy) btnCopy.disabled = true;
  if (btnDownload) btnDownload.disabled = true;
}
