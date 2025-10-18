function navigate(hash) {
  window.location.hash = hash;
  onRoute();
}
function onRoute() {
  const routes = ["home", "logs", "json", "xml"];
  const h = window.location.hash?.substring(1) || "home";
  for (const r of routes) {
    document.getElementById(r).classList.toggle("hidden", r !== h);
  }
}
window.addEventListener("hashchange", onRoute);
window.addEventListener("load", onRoute);

async function postJson(url, body) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await resp.json();
}
async function postMultipart(url, formData) {
  const resp = await fetch(url, { method: "POST", body: formData });
  return await resp.json();
}
function setText(id, text) {
  document.getElementById(id).textContent = text ?? "";
}

// -------- LOGS --------
document.getElementById("logsFile").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  const info = document.getElementById("logsFileInfo");
  if (!f) {
    info.textContent = "";
    return;
  }
  info.textContent = `${f.name} (${f.size} байт)`;
  // читаем в textarea:
  const txt = await f.text();
  document.getElementById("logsInput").value = txt;
});

document.getElementById("btnNormalize").addEventListener("click", async () => {
  const input = document.getElementById("logsInput").value;
  const pats = Array.from(document.querySelectorAll(".pat:checked")).map(
    (x) => x.value
  );
  const replaceEscapedNewlines = document.getElementById("replaceEsc").checked;
  const minAfterColonLength = parseInt(
    document.getElementById("minLen").value || "50",
    10
  );
  const body = {
    input,
    replaceEscapedNewlines,
    enabledPatterns: pats,
    minAfterColonLength,
  };

  const res = await postJson("/api/logs/normalize", body);

  setText(
    "logsStats",
    `Записей: ${res.stats.totalEntries}, извлечено: ${res.stats.extracted}, уникальных: ${res.stats.unique}, дубликатов: ${res.stats.duplicates}, ${res.stats.durationMs} мс`
  );

  // Экспорт
  const exportText = res.export?.asText || "";
  const btnDownload = document.getElementById("btnDownload");
  const btnCopyExport = document.getElementById("btnCopyExport");
  btnDownload.disabled = !exportText;
  btnCopyExport.disabled = !exportText;
  btnDownload.onclick = () =>
    downloadText(exportText, res.export?.filename || "output.json");
  btnCopyExport.onclick = () => navigator.clipboard.writeText(exportText);

  const showOnlyUnique = document.getElementById("showOnlyUnique").checked;
  const showDuplicates = document.getElementById("showDuplicates").checked;

  const itemsDiv = document.getElementById("logsItems");
  itemsDiv.innerHTML = "";
  const items = res.items || [];
  for (const it of items) {
    const isDup = it.duplicateOf !== null && it.duplicateOf !== undefined;
    if (showOnlyUnique && isDup && !showDuplicates) continue;

    const div = document.createElement("div");
    div.className = "item-card";
    div.innerHTML = `
      <div class="item-header">
        <div>СООБЩЕНИЕ ${it.number}: ${it.key.toUpperCase()}
          <span class="badge">hash: ${it.hash.slice(0, 8)}…</span>
        </div>
        <div>
          <span class="badge">lines: ${it.lines}</span>
          <span class="badge">value: ${it.valueCount}</span>
          <span class="badge">raw: ${it.rawLength}</span>
        </div>
      </div>
      <div style="margin:4px 0; color:#444;">${it.description || ""}</div>
      ${
        isDup
          ? '<div class="badge dup">Дубликат (оригинал: № ' +
            it.number +
            ")</div>"
          : ""
      }
      <pre class="output">${it.pretty}</pre>
      <div class="buttons">
        <button class="copyJson">Копировать JSON</button>
        <button class="copyBlock">Копировать блок (как в output.json)</button>
        <button class="dlJson">Скачать JSON</button>
      </div>
    `;
    itemsDiv.appendChild(div);
    div
      .querySelector(".copyJson")
      .addEventListener("click", () =>
        navigator.clipboard.writeText(it.pretty)
      );
    div.querySelector(".copyBlock").addEventListener("click", () => {
      const sep = buildSeparator(it.number, it.key, it.description, true);
      navigator.clipboard.writeText(sep + it.pretty);
    });
    div
      .querySelector(".dlJson")
      .addEventListener("click", () =>
        downloadText(it.pretty, `message-${it.number}.json`)
      );
  }
});

document.getElementById("btnLogsReset").addEventListener("click", () => {
  document.getElementById("logsInput").value = "";
  document.getElementById("logsFile").value = "";
  setText("logsFileInfo", "");
  setText("logsStats", "");
  document.getElementById("logsItems").innerHTML = "";
  document.getElementById("btnDownload").disabled = true;
  document.getElementById("btnCopyExport").disabled = true;
});

function buildSeparator(number, key, description, first) {
  const line = "/".repeat(70) + "\n";
  let s = "";
  if (first) {
    s += line;
    s += `// СООБЩЕНИЕ ${number}: ${key.toUpperCase()}\n`;
    if (description && description !== "Без описания")
      s += `// ${description}\n`;
    s += line + "\n\n";
  } else {
    s += "\n\n" + line;
    s += `// СООБЩЕНИЕ ${number}: ${key.toUpperCase()}\n`;
    if (description && description !== "Без описания")
      s += `// ${description}\n`;
    s += line + "\n\n";
  }
  return s;
}

// -------- JSON --------
document.getElementById("jsonFile").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  const info = document.getElementById("jsonFileInfo");
  if (!f) {
    info.textContent = "";
    return;
  }
  info.textContent = `${f.name} (${f.size} байт)`;
  const txt = await f.text();
  document.getElementById("jsonInput").value = txt;
});

async function jsonAction(action) {
  const input = document.getElementById("jsonInput").value;
  const res = await postJson(`/api/format/${action}`, { type: "json", input });
  const out = res.output ?? "";
  document.getElementById("jsonOutput").textContent = out;
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
  document.getElementById("btnCopyJson").onclick = () =>
    navigator.clipboard.writeText(out);
  document.getElementById("btnDownloadJson").onclick = () =>
    downloadText(out, "result.json");
}
document
  .getElementById("btnPretty")
  .addEventListener("click", () => jsonAction("pretty"));
document
  .getElementById("btnMinify")
  .addEventListener("click", () => jsonAction("minify"));
document
  .getElementById("btnValidate")
  .addEventListener("click", () => jsonAction("validate"));

// -------- XML --------
document.getElementById("xmlFile").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  const info = document.getElementById("xmlFileInfo");
  if (!f) {
    info.textContent = "";
    return;
  }
  info.textContent = `${f.name} (${f.size} байт)`;
  const txt = await f.text();
  document.getElementById("xmlInput").value = txt;
});

async function xmlAction(action) {
  const input = document.getElementById("xmlInput").value;
  const ops = {
    unescapeFromJson: document.getElementById("xmlUnescape").checked,
    keepXmlDeclaration: document.getElementById("xmlKeepDecl").checked,
    escapeForJson: document.getElementById("xmlEscape").checked,
  };
  const res = await postJson(`/api/format/${action}`, {
    type: "xml",
    input,
    options: ops,
  });
  const out = res.output ?? "";
  document.getElementById("xmlOutput").textContent = out;
  document.getElementById("xmlStats").textContent = res.stats
    ? `Вход: ${res.stats.inputBytes} B, Выход: ${res.stats.outputBytes} B, ${res.stats.durationMs} мс`
    : "";
  document.getElementById("xmlErrors").textContent =
    res.errors && res.errors.length ? res.errors.join("\n") : "";
  const integ = res.integrity;
  document.getElementById("xmlIntegrity").textContent = integ
    ? `Целостность: strict=${integ.equalStrict}, normalized=${
        integ.equalNormalized
      }, in=${integ.inputHash?.slice(0, 8)}…, out=${integ.outputHash?.slice(
        0,
        8
      )}…`
    : "";
  document.getElementById("btnCopyXml").disabled = !out;
  document.getElementById("btnDownloadXml").disabled = !out;
  document.getElementById("btnCopyXml").onclick = () =>
    navigator.clipboard.writeText(out);
  document.getElementById("btnDownloadXml").onclick = () =>
    downloadText(out, ops.escapeForJson ? "result.txt" : "result.xml");
}
document
  .getElementById("btnXmlPretty")
  .addEventListener("click", () => xmlAction("pretty"));
document
  .getElementById("btnXmlMinify")
  .addEventListener("click", () => xmlAction("minify"));
document
  .getElementById("btnXmlValidate")
  .addEventListener("click", () => xmlAction("validate"));

// -------- Utils --------
function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
