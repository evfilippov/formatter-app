// Раздел JSON: форматирование/минификация/валидация, режим Value Wrapper
// (wrap/unwrap значений) и обёртка набора чисел в JSON-массив {"value": ...}.

import { postJson } from "../core/api.js";
import { showNotification, downloadText, formatBytes } from "../core/dom.js";
import { syntaxHighlightJson } from "../core/highlight.js";

document.getElementById("jsonFile").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  const info = document.getElementById("jsonFileInfo");
  const picker = document.getElementById("jsonFilePicker");
  if (!f) {
    info.textContent = "Файл не выбран";
    picker?.classList.remove("has-file");
    return;
  }
  info.textContent = `${f.name} (${formatBytes(f.size)})`;
  picker?.classList.add("has-file");
  const txt = await f.text();
  document.getElementById("jsonInput").value = txt;
});

async function jsonAction(action) {
  const input = document.getElementById("jsonInput").value;

  if (!input.trim()) {
    showNotification("Вставьте JSON в поле ввода", "error");
    return;
  }

  try {
    const res = await postJson(`/api/format/${action}`, {
      type: "json",
      input,
    });
    const out = res.output ?? "";
    document.getElementById("jsonOutput").innerHTML = syntaxHighlightJson(out);
    document.getElementById("jsonStats").textContent = res.stats
      ? `Вход: ${res.stats.inputBytes} B, Выход: ${res.stats.outputBytes} B, ${res.stats.durationMs} мс`
      : "";
    document.getElementById("jsonErrors").textContent =
      res.errors && res.errors.length ? res.errors.join("\n") : "";
    const integ = res.integrity;
    document.getElementById("jsonIntegrity").textContent = integ
      ? `Целостность: strict=${integ.equalStrict}, normalized=${
          integ.equalNormalized
        }, in=${integ.inputHash?.slice(0, 8)}…, out=${integ.outputHash?.slice(
          0,
          8
        )}…`
      : "";
    document.getElementById("btnCopyJson").disabled = !out;
    document.getElementById("btnDownloadJson").disabled = !out;
    document.getElementById("btnCopyJson").onclick = () => {
      navigator.clipboard.writeText(out);
      showNotification("JSON скопирован в буфер обмена");
    };
    document.getElementById("btnDownloadJson").onclick = () =>
      downloadText(out, "result.json");

    if (out) {
      showNotification(`JSON ${action} выполнен успешно`, "success");
    }
  } catch (error) {
    console.error("Error processing JSON:", error);
    showNotification("Ошибка обработки JSON", "error");
  }
}

document
  .getElementById("btnPretty")
  ?.addEventListener("click", () => jsonAction("pretty"));
document
  .getElementById("btnMinify")
  ?.addEventListener("click", () => jsonAction("minify"));
document
  .getElementById("btnValidate")
  ?.addEventListener("click", () => jsonAction("validate"));

// Переключение режимов форматирования
document.querySelectorAll('input[name="jsonMode"]').forEach((radio) => {
  radio.addEventListener("change", (e) => {
    const mode = e.target.value;
    const formatButtons = document.getElementById("formatButtons");
    const wrapperButtons = document.getElementById("wrapperButtons");
    const hint = document.getElementById("jsonModeHint");

    if (mode === "format") {
      formatButtons?.classList.remove("hidden");
      wrapperButtons?.classList.add("hidden");
      if (hint)
        hint.textContent =
          "Pretty форматирует с отступами, Minify убирает пробелы";
    } else {
      formatButtons?.classList.add("hidden");
      wrapperButtons?.classList.remove("hidden");
      if (hint)
        hint.textContent =
          'Wrap/Unwrap оборачивают/разворачивают значения JSON; «Числа → value» собирает JSON-массив {"value": "..."} из набора чисел';
    }

    // Очищаем вывод при смене режима
    document.getElementById("jsonOutput").textContent = "";
    document.getElementById("jsonStats").textContent = "";
    document.getElementById("jsonErrors").textContent = "";
    document.getElementById("jsonIntegrity").textContent = "";
  });
});

// Обработка значений JSON: wrap (обернуть в {"value": ...}) и unwrap (развернуть обратно).
const JSON_VALUE_ACTIONS = {
  wrap: {
    url: "/api/format/wrap",
    statsSuffix: '✅ Значения обернуты в {"value": ...}',
    filename: "wrapped.json",
    errorLabel: "Error wrapping JSON:",
  },
  unwrap: {
    url: "/api/format/unwrap",
    statsSuffix: "✅ Значения развернуты",
    filename: "unwrapped.json",
    errorLabel: "Error unwrapping JSON:",
  },
};

async function handleJsonValueAction(action) {
  const cfg = JSON_VALUE_ACTIONS[action];
  const input = document.getElementById("jsonInput").value;

  if (!input.trim()) {
    showNotification("Вставьте JSON в поле ввода", "error");
    return;
  }

  try {
    // Единый HTTP-слой: через postJson, как остальные запросы.
    const res = await postJson(cfg.url, { type: "json", input });

    const out = res.output ?? "";
    document.getElementById("jsonOutput").innerHTML = syntaxHighlightJson(out);
    document.getElementById("jsonStats").textContent = res.stats
      ? `Вход: ${res.stats.inputBytes} B, Выход: ${res.stats.outputBytes} B, ${res.stats.durationMs} мс | ${cfg.statsSuffix}`
      : "";
    document.getElementById("jsonErrors").textContent =
      res.errors && res.errors.length ? res.errors.join("\n") : "";

    const integ = res.integrity;
    document.getElementById("jsonIntegrity").textContent = integ
      ? `Данные сохранены, структура изменена`
      : "";

    document.getElementById("btnCopyJson").disabled = !out;
    document.getElementById("btnDownloadJson").disabled = !out;

    if (out) {
      document.getElementById("btnCopyJson").onclick = () => {
        navigator.clipboard.writeText(out);
        showNotification("JSON скопирован в буфер обмена");
      };
      document.getElementById("btnDownloadJson").onclick = () =>
        downloadText(out, cfg.filename);
    }
  } catch (error) {
    console.error(cfg.errorLabel, error);
    document.getElementById("jsonErrors").textContent =
      "Ошибка обработки: " + error.message;
  }
}

document
  .getElementById("btnWrap")
  ?.addEventListener("click", () => handleJsonValueAction("wrap"));
document
  .getElementById("btnUnwrap")
  ?.addEventListener("click", () => handleJsonValueAction("unwrap"));

// Числа → value: находит все числа в поле ввода (любой разделитель) и оборачивает
// каждое в {"value": "<число>"}, собирая JSON-массив. Полностью на клиенте.
function wrapNumbersToValueJson() {
  const input = document.getElementById("jsonInput").value;
  const numbers = input.match(/\d+/g) || [];

  if (numbers.length === 0) {
    showNotification("В поле ввода нет чисел для обёртки", "error");
    return;
  }

  // value — строкой в кавычках (безопасно для очень длинных чисел).
  // Формат: JSON-массив, по одному компактному объекту на строку.
  const out =
    "[\n" + numbers.map((n) => `  {"value": "${n}"}`).join(",\n") + "\n]";

  document.getElementById("jsonOutput").innerHTML = syntaxHighlightJson(out);
  document.getElementById(
    "jsonStats"
  ).textContent = `Обёрнуто чисел: ${numbers.length}`;
  document.getElementById("jsonErrors").textContent = "";
  document.getElementById("jsonIntegrity").textContent = "";

  const btnCopy = document.getElementById("btnCopyJson");
  const btnDl = document.getElementById("btnDownloadJson");
  btnCopy.disabled = false;
  btnDl.disabled = false;
  btnCopy.onclick = () => {
    navigator.clipboard.writeText(out);
    showNotification("Результат скопирован в буфер обмена");
  };
  btnDl.onclick = () => downloadText(out, "values.json");

  showNotification(`Обёрнуто ${numbers.length} чисел`, "success");
}

document
  .getElementById("btnWrapNumbers")
  ?.addEventListener("click", wrapNumbersToValueJson);
