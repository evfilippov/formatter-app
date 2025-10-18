async function postJson(url, body) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await resp.json();
}

document.getElementById("btnPretty").addEventListener("click", async () => {
  const input = document.getElementById("jsonInput").value;
  const res = await postJson("/api/format/pretty", { type: "json", input });
  const out = document.getElementById("jsonOutput");
  out.textContent = res.output ?? (res.errors?.join("\n") || "Ошибка");
});

document.getElementById("btnMinify").addEventListener("click", async () => {
  const input = document.getElementById("jsonInput").value;
  const res = await postJson("/api/format/minify", { type: "json", input });
  const out = document.getElementById("jsonOutput");
  out.textContent = res.output ?? (res.errors?.join("\n") || "Ошибка");
});

document.getElementById("btnValidate").addEventListener("click", async () => {
  const input = document.getElementById("jsonInput").value;
  const res = await postJson("/api/format/validate", { type: "json", input });
  const out = document.getElementById("jsonOutput");
  out.textContent = res.errors?.length ? res.errors.join("\n") : "OK";
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

  const stats = document.getElementById("stats");
  stats.textContent = `Записей: ${res.stats.totalEntries}, извлечено: ${res.stats.extracted}, уникальных: ${res.stats.unique}, дубликатов: ${res.stats.duplicates}, ${res.stats.durationMs} мс`;

  const items = document.getElementById("items");
  items.innerHTML = "";

  const byNumber = {};
  for (const it of res.items) {
    if (it.duplicateOf) continue;
    byNumber[it.number] = it;
  }
  const ordered = Object.keys(byNumber)
    .map(Number)
    .sort((a, b) => a - b)
    .map((k) => byNumber[k]);

  for (const it of ordered) {
    const div = document.createElement("div");
    div.className = "item-card";
    div.innerHTML = `
      <div class="item-header">
        <div>СООБЩЕНИЕ ${it.number}: ${it.key.toUpperCase()}</div>
        <div><span class="badge">lines: ${
          it.lines
        }</span> <span class="badge">value: ${it.valueCount}</span></div>
      </div>
      <div style="margin:4px 0; color:#444;">${it.description || ""}</div>
      <pre class="code">${it.pretty}</pre>
      <div style="display:flex; gap:8px; flex-wrap: wrap;">
        <button class="copyJson">Копировать JSON</button>
        <button class="copyBlock">Копировать блок (как в output.json)</button>
        <span class="badge">hash: ${it.hash.slice(0, 8)}…</span>
      </div>
    `;
    items.appendChild(div);
    div.querySelector(".copyJson").addEventListener("click", () => {
      navigator.clipboard.writeText(it.pretty);
    });
    div.querySelector(".copyBlock").addEventListener("click", () => {
      const sep = buildSeparator(it.number, it.key, it.description, true);
      navigator.clipboard.writeText(sep + it.pretty);
    });
  }

  const btnDownload = document.getElementById("btnDownload");
  btnDownload.disabled = !res.export?.asText;
  btnDownload.onclick = () =>
    downloadText(res.export.asText, res.export.filename || "output.json");
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

function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
