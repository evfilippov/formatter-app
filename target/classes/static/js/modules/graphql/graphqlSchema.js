// ============================================
// GRAPHQL - ГЕНЕРАЦИЯ СХЕМ
// ============================================

import { queryToSchema } from "../../core/api.js";
import { copyToClipboard, downloadText } from "../../core/utils.js";
import { showSuccess, showError } from "../../components/notification.js";

let currentSchema = "";

/**
 * Инициализация табы Schema
 */
export function initSchemaTab() {
  console.log("🔧 GraphQL Schema: Initializing...");

  const queryInput = document.getElementById("queryForSchema");
  const btnLoadExample = document.getElementById("btnLoadExample");
  const btnCopySchema = document.getElementById("btnCopySchema");
  const btnDownloadSchema = document.getElementById("btnDownloadSchema");

  if (queryInput) {
    queryInput.addEventListener("input", handleSchemaGenInput);
  }

  if (btnLoadExample) {
    btnLoadExample.addEventListener("click", loadExampleQuery);
  }

  if (btnCopySchema) {
    btnCopySchema.addEventListener("click", async () => {
      if (currentSchema && (await copyToClipboard(currentSchema))) {
        showSuccess("Схема скопирована");
      }
    });
  }

  if (btnDownloadSchema) {
    btnDownloadSchema.addEventListener("click", () => {
      if (currentSchema) {
        downloadText(currentSchema, "schema.graphql");
        showSuccess("Схема скачана");
      }
    });
  }

  console.log("✅ GraphQL Schema: Ready");
}

/**
 * Обработка генерации схемы
 */
export async function handleSchemaGenInput() {
  const query = document.getElementById("queryForSchema")?.value;

  if (!query?.trim()) {
    clearSchemaOutput();
    return;
  }

  try {
    const result = await queryToSchema(query);

    if (!result.success) {
      showError(result.message || "Ошибка генерации схемы");
      return;
    }

    currentSchema = result.schema || "";
    displaySchemaOutput(currentSchema);
    showSuccess("Схема сгенерирована");
  } catch (error) {
    console.error("Schema generation error:", error);
    showError("Ошибка генерации схемы");
  }
}

/**
 * Загрузка примера query
 */
export function loadExampleQuery() {
  const example = `mutation CreateUser {
  createUser(input: {
    name: {value: "John Doe"}
    email: {value: "john@example.com"}
    age: {value: 30}
    isActive: {value: true}
  }) {
    id
    name
    email
    age
    isActive
    createdAt
  }
}

query GetUsers {
  users(filter: {status: ACTIVE}) {
    id
    name
    email
    profile {
      avatar
      bio
    }
  }
}`;

  const input = document.getElementById("queryForSchema");
  if (input) {
    input.value = example;
    handleSchemaGenInput();
  }
}

/**
 * Отображение схемы
 */
function displaySchemaOutput(schema) {
  const output = document.getElementById("schemaOutput");
  if (output) {
    output.textContent = schema;
  }
}

/**
 * Очистка вывода
 */
function clearSchemaOutput() {
  currentSchema = "";
  displaySchemaOutput("");
}
