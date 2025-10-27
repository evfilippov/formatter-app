/* ============================================
   API - HTTP запросы к бэкенду
   ============================================ */

/**
 * POST запрос с JSON телом
 * @param {string} url - Endpoint URL
 * @param {Object} body - Объект для отправки
 * @returns {Promise<Object>} JSON ответ
 */
export async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * POST запрос с multipart/form-data
 * @param {string} url - Endpoint URL
 * @param {FormData} formData - FormData объект
 * @returns {Promise<Object>} JSON ответ
 */
export async function postMultipart(url, formData) {
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}
