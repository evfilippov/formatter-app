// HTTP-слой: единые обёртки над fetch для всех разделов.

export async function postJson(url, body) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await resp.json();
}

export async function postMultipart(url, formData) {
  const resp = await fetch(url, { method: "POST", body: formData });
  return await resp.json();
}
