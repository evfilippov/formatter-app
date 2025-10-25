// ============================================
// API ЗАПРОСЫ
// ============================================

/**
 * Базовая обёртка для fetch с обработкой ошибок
 */
async function fetchWithErrorHandling(url, options = {}) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error(`API Error [${url}]:`, error);
    return {
      success: false,
      error: error.message,
      message: error.message,
    };
  }
}

/**
 * POST запрос с JSON данными
 */
export async function postJson(url, body) {
  return fetchWithErrorHandling(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * POST запрос с FormData
 */
export async function postMultipart(url, formData) {
  return fetchWithErrorHandling(url, {
    method: "POST",
    body: formData,
  });
}

/**
 * GET запрос
 */
export async function getJson(url) {
  return fetchWithErrorHandling(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Форматирование JSON
 */
export async function formatJson(action, input, options = {}) {
  const result = await postJson(`/api/format/${action}`, {
    type: "json",
    input,
    options,
  });

  return result.success ? result.data : result;
}

/**
 * Форматирование XML
 */
export async function formatXml(action, input, options = {}) {
  const result = await postJson(`/api/format/${action}`, {
    type: "xml",
    input,
    options,
  });

  return result.success ? result.data : result;
}

/**
 * Нормализация логов
 */
export async function normalizeLogs(input, options) {
  const result = await postJson("/api/logs/normalize", {
    input,
    ...options,
  });

  return result.success ? result.data : result;
}

/**
 * GraphQL форматирование
 */
export async function formatGraphQL(query, options = {}) {
  const result = await postJson("/api/graphql/format", {
    query,
    options,
  });

  return result.success ? result.data : result;
}

/**
 * GraphQL слияние схем
 */
export async function mergeGraphQL(schemas, options = {}) {
  const result = await postJson("/api/graphql/merge-schemas", {
    schemas,
    options,
  });

  return result.success ? result.data : result;
}

/**
 * GraphQL валидация
 */
export async function validateGraphQL(schema, query) {
  const result = await postJson("/api/graphql/validate", {
    schema,
    query,
  });

  return result.success ? result.data : result;
}

/**
 * GraphQL introspection
 */
export async function introspectGraphQL(
  endpoint,
  headers = {},
  includeDeprecated = true
) {
  const result = await postJson("/api/graphql/introspect", {
    endpoint,
    headers,
    includeDeprecated,
  });

  return result.success ? result.data : result;
}

/**
 * GraphQL генерация схемы из query
 */
export async function queryToSchema(query) {
  const result = await postJson("/api/graphql/query-to-schema", {
    query,
  });

  return result.success ? result.data : result;
}
