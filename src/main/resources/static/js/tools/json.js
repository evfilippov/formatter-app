// Раздел JSON: форматирование/минификация/валидация, режим Value Wrapper
// (wrap/unwrap значений) и обёртка набора чисел в JSON-массив {"value": ...}.

import { postJson } from "../core/api.js";
import { showNotification, downloadText, formatBytes } from "../core/dom.js";
import { syntaxHighlightJson } from "../core/highlight.js";
import { STR } from "../core/strings.js";

document.getElementById("jsonFile").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  const info = document.getElementById("jsonFileInfo");
  const picker = document.getElementById("jsonFilePicker");
  if (!f) {
    info.textContent = STR.common.fileNotChosen;
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
    showNotification(STR.json.pasteFirst, "error");
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
      ? STR.common.stats(
          res.stats.inputBytes,
          res.stats.outputBytes,
          res.stats.durationMs
        )
      : "";
    document.getElementById("jsonErrors").textContent =
      res.errors && res.errors.length ? res.errors.join("\n") : "";
    const integ = res.integrity;
    document.getElementById("jsonIntegrity").textContent = integ
      ? STR.common.integrity(
          integ.equalStrict,
          integ.equalNormalized,
          integ.inputHash?.slice(0, 8),
          integ.outputHash?.slice(0, 8)
        )
      : "";
    document.getElementById("btnCopyJson").disabled = !out;
    document.getElementById("btnDownloadJson").disabled = !out;
    document.getElementById("btnCopyJson").onclick = () => {
      navigator.clipboard.writeText(out);
      showNotification(STR.json.copied);
    };
    document.getElementById("btnDownloadJson").onclick = () =>
      downloadText(out, "result.json");

    if (out) {
      showNotification(STR.json.ok(action), "success");
    }
  } catch (error) {
    console.error("Error processing JSON:", error);
    showNotification(STR.json.error, "error");
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
      if (hint) hint.textContent = STR.json.hintFormat;
    } else {
      formatButtons?.classList.add("hidden");
      wrapperButtons?.classList.remove("hidden");
      if (hint) hint.textContent = STR.json.hintWrapper;
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
    statsSuffix: STR.json.wrapSuffix,
    filename: "wrapped.json",
    errorLabel: "Error wrapping JSON:",
  },
  unwrap: {
    url: "/api/format/unwrap",
    statsSuffix: STR.json.unwrapSuffix,
    filename: "unwrapped.json",
    errorLabel: "Error unwrapping JSON:",
  },
};

async function handleJsonValueAction(action) {
  const cfg = JSON_VALUE_ACTIONS[action];
  const input = document.getElementById("jsonInput").value;

  if (!input.trim()) {
    showNotification(STR.json.pasteFirst, "error");
    return;
  }

  try {
    // Единый HTTP-слой: через postJson, как остальные запросы.
    const res = await postJson(cfg.url, { type: "json", input });

    const out = res.output ?? "";
    document.getElementById("jsonOutput").innerHTML = syntaxHighlightJson(out);
    document.getElementById("jsonStats").textContent = res.stats
      ? `${STR.common.stats(
          res.stats.inputBytes,
          res.stats.outputBytes,
          res.stats.durationMs
        )} | ${cfg.statsSuffix}`
      : "";
    document.getElementById("jsonErrors").textContent =
      res.errors && res.errors.length ? res.errors.join("\n") : "";

    const integ = res.integrity;
    document.getElementById("jsonIntegrity").textContent = integ
      ? STR.json.structureChanged
      : "";

    document.getElementById("btnCopyJson").disabled = !out;
    document.getElementById("btnDownloadJson").disabled = !out;

    if (out) {
      document.getElementById("btnCopyJson").onclick = () => {
        navigator.clipboard.writeText(out);
        showNotification(STR.json.copied);
      };
      document.getElementById("btnDownloadJson").onclick = () =>
        downloadText(out, cfg.filename);
    }
  } catch (error) {
    console.error(cfg.errorLabel, error);
    document.getElementById("jsonErrors").textContent =
      STR.common.processError + error.message;
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
    showNotification(STR.json.noNumbers, "error");
    return;
  }

  // value — строкой в кавычках (безопасно для очень длинных чисел).
  // Формат: JSON-массив, по одному компактному объекту на строку.
  const out =
    "[\n" + numbers.map((n) => `  {"value": "${n}"}`).join(",\n") + "\n]";

  document.getElementById("jsonOutput").innerHTML = syntaxHighlightJson(out);
  document.getElementById("jsonStats").textContent = STR.json.wrappedCount(
    numbers.length
  );
  document.getElementById("jsonErrors").textContent = "";
  document.getElementById("jsonIntegrity").textContent = "";

  const btnCopy = document.getElementById("btnCopyJson");
  const btnDl = document.getElementById("btnDownloadJson");
  btnCopy.disabled = false;
  btnDl.disabled = false;
  btnCopy.onclick = () => {
    navigator.clipboard.writeText(out);
    showNotification(STR.json.resultCopied);
  };
  btnDl.onclick = () => downloadText(out, "values.json");

  showNotification(STR.json.wrappedNotify(numbers.length), "success");
}

document
  .getElementById("btnWrapNumbers")
  ?.addEventListener("click", wrapNumbersToValueJson);
