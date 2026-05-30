// Раздел XML: форматирование/минификация/валидация + escape/unescape
// для XML, переданного в виде JSON-строки.

import { postJson } from "../core/api.js";
import { showNotification, downloadText, formatBytes } from "../core/dom.js";
import { STR } from "../core/strings.js";

document.getElementById("xmlFile").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  const info = document.getElementById("xmlFileInfo");
  const picker = document.getElementById("xmlFilePicker");
  if (!f) {
    info.textContent = STR.common.fileNotChosen;
    picker?.classList.remove("has-file");
    return;
  }
  info.textContent = `${f.name} (${formatBytes(f.size)})`;
  picker?.classList.add("has-file");
  const txt = await f.text();
  document.getElementById("xmlInput").value = txt;
});

async function xmlAction(action) {
  const input = document.getElementById("xmlInput").value;

  if (!input.trim()) {
    showNotification(STR.xml.pasteFirst, "error");
    return;
  }

  const ops = {
    unescapeFromJson: document.getElementById("xmlUnescape").checked,
    keepXmlDeclaration: document.getElementById("xmlKeepDecl").checked,
    escapeForJson: document.getElementById("xmlEscape").checked,
  };

  try {
    const res = await postJson(`/api/format/${action}`, {
      type: "xml",
      input,
      options: ops,
    });
    const out = res.output ?? "";
    document.getElementById("xmlOutput").textContent = out;
    document.getElementById("xmlStats").textContent = res.stats
      ? STR.common.stats(
          res.stats.inputBytes,
          res.stats.outputBytes,
          res.stats.durationMs
        )
      : "";
    document.getElementById("xmlErrors").textContent =
      res.errors && res.errors.length ? res.errors.join("\n") : "";
    const integ = res.integrity;
    document.getElementById("xmlIntegrity").textContent = integ
      ? STR.common.integrity(
          integ.equalStrict,
          integ.equalNormalized,
          integ.inputHash?.slice(0, 8),
          integ.outputHash?.slice(0, 8)
        )
      : "";
    document.getElementById("btnCopyXml").disabled = !out;
    document.getElementById("btnDownloadXml").disabled = !out;
    document.getElementById("btnCopyXml").onclick = () => {
      navigator.clipboard.writeText(out);
      showNotification(STR.xml.copied);
    };
    document.getElementById("btnDownloadXml").onclick = () =>
      downloadText(out, ops.escapeForJson ? "result.txt" : "result.xml");

    if (out) {
      showNotification(STR.xml.ok(action), "success");
    }
  } catch (error) {
    console.error("Error processing XML:", error);
    showNotification(STR.xml.error, "error");
  }
}

document
  .getElementById("btnXmlPretty")
  ?.addEventListener("click", () => xmlAction("pretty"));
document
  .getElementById("btnXmlMinify")
  ?.addEventListener("click", () => xmlAction("minify"));
document
  .getElementById("btnXmlValidate")
  ?.addEventListener("click", () => xmlAction("validate"));
