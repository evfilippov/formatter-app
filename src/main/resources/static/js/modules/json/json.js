// ============================================
// JSON MODULE - MAIN
// ============================================

import { formatJSON, wrapJSON, unwrapJSON } from '../../core/api.js';
import { downloadText, formatBytes } from '../../core/utils.js';
import { showSuccess, showError, showWarning } from '../../components/notification.js';

let initialized = false;
let currentOutput = '';

/**
 * Инициализация JSON модуля
 */
export function initJson() {
  if (initialized) {
    console.log('��� JSON already initialized');
    return;
  }

  console.log('��� JSON module initializing...');

  try {
    // Привязка обработчиков
    attachEventListeners();

    initialized = true;
    console.log('✅ JSON module initialized');
  } catch (error) {
    console.error('❌ JSON initialization failed:', error);
  }
}

/**
 * Привязка обработчиков событий
 */
function attachEventListeners() {
  // Загрузка файла
  const fileInput = document.getElementById('jsonFile');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileUpload);
  }

  // Переключение режима
  document.querySelectorAll('input[name="jsonMode"]').forEach(radio => {
    radio.addEventListener('change', handleModeChange);
  });

  // Кнопки форматирования
  const btnPretty = document.getElementById('btnPretty');
  if (btnPretty) {
    btnPretty.addEventListener('click', () => jsonAction('pretty'));
  }

  const btnMinify = document.getElementById('btnMinify');
  if (btnMinify) {
    btnMinify.addEventListener('click', () => jsonAction('minify'));
  }

  const btnValidate = document.getElementById('btnValidate');
  if (btnValidate) {
    btnValidate.addEventListener('click', () => jsonAction('validate'));
  }

  // Кнопки wrap/unwrap
  const btnWrap = document.getElementById('btnWrap');
  if (btnWrap) {
    btnWrap.addEventListener('click', handleWrap);
  }

  const btnUnwrap = document.getElementById('btnUnwrap');
  if (btnUnwrap) {
    btnUnwrap.addEventListener('click', handleUnwrap);
  }

  // Кнопки копирования и скачивания
  const btnCopyJson = document.getElementById('btnCopyJson');
  if (btnCopyJson) {
    btnCopyJson.addEventListener('click', copyOutput);
  }

  const btnDownloadJson = document.getElementById('btnDownloadJson');
  if (btnDownloadJson) {
    btnDownloadJson.addEventListener('click', downloadOutput);
  }
}

/**
 * Обработка загрузки файла
 */
async function handleFileUpload(e) {
  const file = e.target.files[0];
  const info = document.getElementById('jsonFileInfo');
  
  if (!file) {
    if (info) info.textContent = '';
    return;
  }

  if (info) {
    info.textContent = `${file.name} (${formatBytes(file.size)})`;
  }

  const text = await file.text();
  const input = document.getElementById('jsonInput');
  if (input) {
    input.value = text;
  }

  showSuccess('Файл загружен успешно');
}

/**
 * Переключение режима форматирования
 */
function handleModeChange(e) {
  const mode = e.target.value;
  const formatButtons = document.getElementById('formatButtons');
  const wrapperButtons = document.getElementById('wrapperButtons');
  const hint = document.getElementById('jsonModeHint');

  if (mode === 'format') {
    formatButtons?.classList.remove('hidden');
    wrapperButtons?.classList.add('hidden');
    if (hint) {
      hint.textContent = 'Pretty форматирует с отступами, Minify убирает пробелы';
    }
  } else {
    formatButtons?.classList.add('hidden');
    wrapperButtons?.classList.remove('hidden');
    if (hint) {
      hint.textContent = 'Wrap оборачивает значения в {"value": ...}, Unwrap разворачивает обратно';
    }
  }

  // Очищаем вывод при смене режима
  clearOutput();
}

/**
 * Обработка действий форматирования
 */
async function jsonAction(action) {
  const input = document.getElementById('jsonInput')?.value;

  if (!input?.trim()) {
    showError('Введите JSON для обработки');
    return;
  }

  try {
    const res = await formatJSON(action, input);
    displayResult(res);

    if (res.output) {
      showSuccess(`JSON ${action} выполнен успешно`);
    }
  } catch (error) {
    console.error('Error processing JSON:', error);
    showError('Ошибка обработки JSON');
  }
}

/**
 * Wrap значений
 */
async function handleWrap() {
  const input = document.getElementById('jsonInput')?.value;

  if (!input?.trim()) {
    showError('Введите JSON для обработки');
    return;
  }

  try {
    const res = await wrapJSON(input);
    displayResult(res, 'wrapped');

    if (res.output) {
      showSuccess('Значения обернуты в {"value": ...}');
    }
  } catch (error) {
    console.error('Error wrapping JSON:', error);
    showError('Ошибка обработки: ' + error.message);
  }
}

/**
 * Unwrap значений
 */
async function handleUnwrap() {
  const input = document.getElementById('jsonInput')?.value;

  if (!input?.trim()) {
    showError('Введите JSON для обработки');
    return;
  }

  try {
    const res = await unwrapJSON(input);
    displayResult(res, 'unwrapped');

    if (res.output) {
      showSuccess('Значения развернуты');
    }
  } catch (error) {
    console.error('Error unwrapping JSON:', error);
    showError('Ошибка обработки: ' + error.message);
  }
}

/**
 * Отображение результата
 */
function displayResult(res, action = '') {
  const output = res.output ?? '';
  currentOutput = output;

  const outputEl = document.getElementById('jsonOutput');
  if (outputEl) {
    outputEl.textContent = output;
  }

  const statsEl = document.getElementById('jsonStats');
  if (statsEl && res.stats) {
    let statsText = `Вход: ${res.stats.inputBytes} B, Выход: ${res.stats.outputBytes} B, ${res.stats.durationMs} мс`;
    if (action === 'wrapped') {
      statsText += ' | ✅ Значения обернуты в {"value": ...}';
    } else if (action === 'unwrapped') {
      statsText += ' | ✅ Значения развернуты';
    }
    statsEl.textContent = statsText;
  }

  const errorsEl = document.getElementById('jsonErrors');
  if (errorsEl) {
    errorsEl.textContent = res.errors && res.errors.length ? res.errors.join('\n') : '';
  }

  const integrityEl = document.getElementById('jsonIntegrity');
  if (integrityEl) {
    const integ = res.integrity;
    if (integ) {
      if (action === 'wrapped' || action === 'unwrapped') {
        integrityEl.textContent = 'Данные сохранены, структура изменена';
      } else {
        integrityEl.textContent = `Целостность: strict=${integ.equalStrict}, normalized=${integ.equalNormalized}, in=${integ.inputHash?.slice(0, 8)}…, out=${integ.outputHash?.slice(0, 8)}…`;
      }
    } else {
      integrityEl.textContent = '';
    }
  }

  const btnCopyJson = document.getElementById('btnCopyJson');
  const btnDownloadJson = document.getElementById('btnDownloadJson');

  if (btnCopyJson) btnCopyJson.disabled = !output;
  if (btnDownloadJson) btnDownloadJson.disabled = !output;
}

/**
 * Копирование результата
 */
function copyOutput() {
  if (!currentOutput) return;

  navigator.clipboard.writeText(currentOutput)
    .then(() => {
      showSuccess('JSON скопирован в буфер обмена');
    })
    .catch(err => {
      console.error('Failed to copy:', err);
      showError('Ошибка копирования');
    });
}

/**
 * Скачивание результата
 */
function downloadOutput() {
  if (!currentOutput) return;

  const mode = document.querySelector('input[name="jsonMode"]:checked')?.value;
  const filename = mode === 'wrapper' ? 'wrapped.json' : 'result.json';
  
  downloadText(currentOutput, filename);
  showSuccess('Файл загружен');
}

/**
 * Очистка вывода
 */
function clearOutput() {
  currentOutput = '';
  
  const outputEl = document.getElementById('jsonOutput');
  if (outputEl) outputEl.textContent = '';
  
  const statsEl = document.getElementById('jsonStats');
  if (statsEl) statsEl.textContent = '';
  
  const errorsEl = document.getElementById('jsonErrors');
  if (errorsEl) errorsEl.textContent = '';
  
  const integrityEl = document.getElementById('jsonIntegrity');
  if (integrityEl) integrityEl.textContent = '';
}

console.log('✅ JSON module loaded');
