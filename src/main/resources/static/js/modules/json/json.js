// ============================================
// JSON MODULE
// ============================================

import { formatJson } from "../../core/api.js";
import {
  downloadText,
  copyToClipboard,
  setText,
  formatBytes,
} from "../../core/utils.js";
import { showSuccess, showError } from "../../components/notification.js";

let currentJsonOutput = "";

/**
 * Инициализация модуля JSON
 */
export function initJson() {
  console.log("🚀 JSON Module: Initializing...");

  // Обработчики файлов
  const jsonFile = document.getElementById("jsonFile");
  if (jsonFile) {
    jsonFile.addEventListener("change", handleJsonFileUpload);
  }

  // Переключение режимов
  const modeRadios = document.querySelectorAll('input[name="jsonMode"]');
  modeRadios.forEach((radio) => {
    radio.addEventListener("change", handleModeChange);
  });

  // Кнопки форматирования
  const btnPretty = document.getElementById("btnPretty");
  const btnMinify = document.getElementById("btnMinify");
  const btnValidate = document.getElementById("btnValidate");

  if (btnPretty)
    btnPretty.addEventListener("click", () => handleFormat("pretty"));
  if (btnMinify)
    btnMinify.addEventListener("click", () => handleFormat("minify"));
  if (btnValidate)
    btnValidate.addEventListener("click", () => handleFormat("validate"));

  // Кнопки wrapper
  const btnWrap = document.getElementById("btnWrap");
  const btnUnwrap = document.getElementById("btnUnwrap");

  if (btnWrap) btnWrap.addEventListener("click", () => handleWrapper("wrap"));
  if (btnUnwrap)
    btnUnwrap.addEventListener("click", () => handleWrapper("unwrap"));

  // Кнопки экспорта
  const btnCopyJson = document.getElementById("btnCopyJson");
  const btnDownloadJson = document.getElementById("btnDownloadJson");

  if (btnCopyJson) {
    btnCopyJson.addEventListener("click", async () => {
      if (await copyToClipboard(currentJsonOutput)) {
        showSuccess("JSON скопирован в буфер обмена");
      }
    });
  }

  if (btnDownloadJson) {
    btnDownloadJson.addEventListener("click", () => {
      downloadText(currentJsonOutput, "result.json");
      showSuccess("Файл скачан");
    });
  }

  console.log("✅ JSON Module: Ready");
}

/**
 * Обработка загрузки файла
 */
async function handleJsonFileUpload(e) {
  const file = e.target.files[0];
  const info = document.getElementById("jsonFileInfo");

  if (!file) {
    if (info) info.textContent = "";
    return;
  }

  if (info) {
    info.textContent = `${file.name} (${formatBytes(file.size)})`;
  }

  const text = await file.text();
  const input = document.getElementById("jsonInput");
  if (input) {
    input.value = text;
  }

  showSuccess("Файл загружен");
}

/**
 * Переключение режима (format/wrapper)
 */
function handleModeChange(e) {
  const mode = e.target.value;
  const formatButtons = document.getElementById("formatButtons");
  const wrapperButtons = document.getElementById("wrapperButtons");
  const hint = document.getElementById("jsonModeHint");

  if (mode === "format") {
    formatButtons.classList.remove("hidden");
    wrapperButtons.classList.add("hidden");
    if (hint) {
      hint.textContent =
        "Pretty форматирует с отступами, Minify убирает пробелы";
    }
  } else if (mode === "wrapper") {
    formatButtons.classList.add("hidden");
    wrapperButtons.classList.remove("hidden");
    if (hint) {
      hint.textContent =
        "Wrap оборачивает значения в {value: ...}, Unwrap разворачивает обратно";
    }
  }
}

/**
 * Форматирование JSON
 */
async function handleFormat(action) {
  const input = document.getElementById("jsonInput")?.value;

  if (!input?.trim()) {
    showError("Введите JSON для обработки");
    return;
  }

  clearOutput();

  try {
    const result = await formatJson(action, input, {});

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
 * Обработка wrapper (wrap/unwrap)
 */
async function handleWrapper(action) {
  const input = document.getElementById("jsonInput")?.value;

  if (!input?.trim()) {
    showError("Введите JSON для обработки");
    return;
  }

  clearOutput();

  try {
    const result = await formatJson(action, input, {});

    if (!result.success) {
      showError(result.message || "Ошибка обработки");
      displayErrors(result.message || result.error);
      return;
    }

    displayOutput(result.output || result.result || "");
    displayStats(result.stats);

    showSuccess(`${action.toUpperCase()} выполнен`);
  } catch (error) {
    console.error("Wrapper error:", error);
    showError("Ошибка обработки");
    displayErrors(error.message);
  }
}

/**
 * Отображение результата
 */
function displayOutput(output) {
  currentJsonOutput = output;
  const outputEl = document.getElementById("jsonOutput");
  if (outputEl) {
    outputEl.textContent = output;
  }

  const btnCopy = document.getElementById("btnCopyJson");
  const btnDownload = document.getElementById("btnDownloadJson");

  if (btnCopy) btnCopy.disabled = false;
  if (btnDownload) btnDownload.disabled = false;
}

/**
 * Отображение статистики
 */
function displayStats(stats) {
  if (!stats) return;

  const statsEl = document.getElementById("jsonStats");
  if (statsEl) {
    const parts = [];
    if (stats.keys !== undefined) parts.push(`Ключей: ${stats.keys}`);
    if (stats.values !== undefined) parts.push(`Значений: ${stats.values}`);
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

  const integrityEl = document.getElementById("jsonIntegrity");
  if (integrityEl) {
    const status = integrity.valid ? "✅ Валидный JSON" : "❌ Невалидный JSON";
    const depth = integrity.maxDepth ? ` | Глубина: ${integrity.maxDepth}` : "";
    const arrays = integrity.arrayCount
      ? ` | Массивов: ${integrity.arrayCount}`
      : "";
    const objects = integrity.objectCount
      ? ` | Объектов: ${integrity.objectCount}`
      : "";

    integrityEl.textContent = `${status}${depth}${arrays}${objects}`;
  }
}

/**
 * Отображение ошибок
 */
function displayErrors(errorMessage) {
  const errorsEl = document.getElementById("jsonErrors");
  if (errorsEl) {
    errorsEl.textContent = errorMessage;
    errorsEl.style.display = "block";
  }
}

/**
 * Очистка вывода
 */
function clearOutput() {
  currentJsonOutput = "";

  setText("jsonOutput", "");
  setText("jsonStats", "");
  setText("jsonIntegrity", "");
  setText("jsonErrors", "");

  const errorsEl = document.getElementById("jsonErrors");
  if (errorsEl) {
    errorsEl.style.display = "none";
  }

  const btnCopy = document.getElementById("btnCopyJson");
  const btnDownload = document.getElementById("btnDownloadJson");

  if (btnCopy) btnCopy.disabled = true;
  if (btnDownload) btnDownload.disabled = true;
}
