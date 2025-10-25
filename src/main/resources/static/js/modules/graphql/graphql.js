// ============================================
// GRAPHQL - СЛИЯНИЕ СХЕМ
// ============================================

import { mergeGraphQL } from "../../core/api.js";
import { copyToClipboard, downloadText, setText } from "../../core/utils.js";
import {
  showSuccess,
  showError,
  showWarning,
} from "../../components/notification.js";

let mergeInputCount = 2;
let currentMergedResult = "";

/**
 * Инициализация табы Merge
 */
export function initMergeTab() {
  console.log("🔀 GraphQL Merge: Initializing...");

  const btnAddMergeInput = document.getElementById("btnAddMergeInput");
  const btnPerformMerge = document.getElementById("btnPerformMerge");
  const btnCopyMerged = document.getElementById("btnCopyMerged");

  if (btnAddMergeInput) {
    btnAddMergeInput.addEventListener("click", addMergeInput);
  }

  if (btnPerformMerge) {
    btnPerformMerge.addEventListener("click", performMerge);
  }

  if (btnCopyMerged) {
    btnCopyMerged.addEventListener("click", async () => {
      if (currentMergedResult && (await copyToClipboard(currentMergedResult))) {
        showSuccess("Результат скопирован");
      }
    });
  }

  // Обработчики кнопок очистки
  document.addEventListener("click", (e) => {
    if (e.target.hasAttribute("data-clear-merge")) {
      const index = e.target.getAttribute("data-clear-merge");
      clearMergeInput(index);
    }
  });

  console.log("✅ GraphQL Merge: Ready");
}

/**
 * Добавление нового поля ввода
 */
export function addMergeInput() {
  const container = document.getElementById("mergeInputsContainer");
  if (!container) return;

  const index = mergeInputCount++;

  const box = document.createElement("div");
  box.className = "merge-input-box";
  box.innerHTML = `
    <div class="merge-header">
      <h4>Schema/Query ${index + 1}</h4>
      <button data-clear-merge="${index}" class="btn-small">Clear</button>
    </div>
    <textarea id="mergeInput${index}" class="code-editor merge-textarea" 
              placeholder="Schema or query ${index + 1}..."></textarea>
  `;

  container.appendChild(box);
  showSuccess(`Добавлено поле ${index + 1}`);
}

/**
 * Очистка поля ввода
 */
export function clearMergeInput(index) {
  const input = document.getElementById(`mergeInput${index}`);
  if (input) {
    input.value = "";
    showSuccess(`Поле ${parseInt(index) + 1} очищено`);
  }
}

/**
 * Выполнение слияния
 */
export async function performMerge() {
  const schemas = [];

  // Собираем все заполненные поля
  for (let i = 0; i < mergeInputCount; i++) {
    const input = document.getElementById(`mergeInput${i}`);
    if (input && input.value.trim()) {
      schemas.push(input.value.trim());
    }
  }

  if (schemas.length < 2) {
    showWarning("Необходимо минимум 2 схемы для слияния");
    return;
  }

  const strategy = document.getElementById("mergeStrategy")?.value || "auto";

  try {
    const result = await mergeGraphQL(schemas, { strategy });

    if (!result.success) {
      showError(result.message || "Ошибка слияния");
      return;
    }

    currentMergedResult = result.merged || result.result || "";
    displayMergeOutput(currentMergedResult);

    // Отображение конфликтов
    if (result.conflicts && result.conflicts.length > 0) {
      displayConflicts(result.conflicts);
    } else {
      hideConflicts();
    }

    // Статистика
    if (result.stats) {
      displayMergeStats(result.stats);
    }

    showSuccess(`Объединено ${schemas.length} схем`);
  } catch (error) {
    console.error("Merge error:", error);
    showError("Ошибка слияния");
  }
}

/**
 * Отображение результата слияния
 */
function displayMergeOutput(output) {
  const outputEl = document.getElementById("mergeOutput");
  if (outputEl) {
    outputEl.textContent = output;
  }
}

/**
 * Отображение конфликтов
 */
function displayConflicts(conflicts) {
  const conflictsPanel = document.getElementById("mergeConflicts");
  const conflictsList = document.getElementById("conflictsList");

  if (!conflictsPanel || !conflictsList) return;

  conflictsPanel.classList.remove("hidden");
  conflictsList.innerHTML = "";

  conflicts.forEach((conflict, index) => {
    const div = document.createElement("div");
    div.className = "conflict-item";
    div.innerHTML = `
      <div class="conflict-header">
        <strong>Конфликт ${index + 1}:</strong> ${conflict.type || "Unknown"}
      </div>
      <div class="conflict-details">
        <div><strong>Поле:</strong> ${conflict.field || "N/A"}</div>
        <div><strong>Решение:</strong> ${conflict.resolution || "Auto"}</div>
      </div>
    `;
    conflictsList.appendChild(div);
  });
}

/**
 * Скрытие панели конфликтов
 */
function hideConflicts() {
  const conflictsPanel = document.getElementById("mergeConflicts");
  if (conflictsPanel) {
    conflictsPanel.classList.add("hidden");
  }
}

/**
 * Отображение статистики слияния
 */
function displayMergeStats(stats) {
  const statsEl = document.getElementById("mergeStats");
  if (statsEl && stats) {
    const parts = [];
    if (stats.totalTypes) parts.push(`Типов: ${stats.totalTypes}`);
    if (stats.totalFields) parts.push(`Полей: ${stats.totalFields}`);
    if (stats.conflicts) parts.push(`Конфликтов: ${stats.conflicts}`);

    statsEl.textContent = parts.join(" | ");
  }
}
