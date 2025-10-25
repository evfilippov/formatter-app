// ============================================
// API - РАБОТА С BACKEND
// ============================================

/**
 * POST запрос с JSON данными
 */
export async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * POST запрос с multipart/form-data
 */
export async function postMultipart(url, formData) {
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * GET запрос
 */
export async function getJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

// ============================================
// LOGS API
// ============================================

export async function normalizeLogsAPI(body) {
  return await postJson("/api/logs/normalize", body);
}

// ============================================
// JSON API
// ============================================

export async function formatJSON(action, input) {
  return await postJson(`/api/format/${action}`, {
    type: "json",
    input,
  });
}

export async function wrapJSON(input) {
  return await postJson("/api/format/wrap", {
    type: "json",
    input,
  });
}

export async function unwrapJSON(input) {
  return await postJson("/api/format/unwrap", {
    type: "json",
    input,
  });
}

// ============================================
// XML API
// ============================================

export async function formatXML(action, input, options = {}) {
  return await postJson(`/api/format/${action}`, {
    type: "xml",
    input,
    options,
  });
}

// ============================================
// GRAPHQL API
// ============================================

export async function formatGraphQL(query, options = {}) {
  return await postJson("/api/graphql/format", {
    query,
    options,
  });
}

export async function queryToSchema(query) {
  return await postJson("/api/graphql/query-to-schema", { query });
}

export async function mergeGraphQL(schemas, options = {}) {
  return await postJson("/api/graphql/merge-schemas", {
    schemas,
    options,
  });
}

export async function validateGraphQL(schema, query) {
  return await postJson("/api/graphql/validate", {
    schema,
    query,
  });
}

export async function introspectGraphQL(endpoint, headers = {}) {
  return await postJson("/api/graphql/introspect", {
    endpoint,
    headers,
  });
}

console.log("✅ API module loaded");
