// ============================================
// XML MODULE - MAIN
// ============================================

import { formatXML } from '../../core/api.js';
import { downloadText, formatBytes } from '../../core/utils.js';
import { showSuccess, showError } from '../../components/notification.js';

let initialized = false;
let currentOutput = '';

/**
 * Инициализация XML модуля
 */
export function initXml() {
  if (initialized) {
    console.log('��� XML already initialized');
    return;
  }

  console.log('��� XML module initializing...');

  try {
    attachEventListeners();
    initialized = true;
    console.log('✅ XML module initialized');
  } catch (error) {
    console.error('❌ XML initialization failed:', error);
  }
}

/**
 * Привязка обработчиков событий
 */
function attachEventListeners() {
  // Загрузка файла
  const fileInput = document.getElementById('xmlFile');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileUpload);
  }

  // Кнопки форматирования
  const btnXmlPretty = document.getElementById('btnXmlPretty');
  if (btnXmlPretty) {
    btnXmlPretty.addEventListener('click', () => xmlAction('pretty'));
  }

  const btnXmlMinify = document.getElementById('btnXmlMinify');
  if (btnXmlMinify) {
    btnXmlMinify.addEventListener('click', () => xmlAction('minify'));
  }

  const btnXmlValidate = document.getElementById('btnXmlValidate');
  if (btnXmlValidate) {
    btnXmlValidate.addEventListener('click', () => xmlAction('validate'));
  }

  // Кнопки копирования и скачивания
  const btnCopyXml = document.getElementById('btnCopyXml');
  if (btnCopyXml) {
    btnCopyXml.addEventListener('click', copyOutput);
  }

  const btnDownloadXml = document.getElementById('btnDownloadXml');
  if (btnDownloadXml) {
    btnDownloadXml.addEventListener('click', downloadOutput);
  }
}

/**
 * Обработка загрузки файла
 */
async function handleFileUpload(e) {
  const file = e.target.files[0];
  const info = document.getElementById('xmlFileInfo');
  
  if (!file) {
    if (info) info.textContent = '';
    return;
  }

  if (info) {
    info.textContent = `${file.name} (${formatBytes(file.size)})`;
  }

  const text = await file.text();
  const input = document.getElementById('xmlInput');
  if (input) {
    input.value = text;
  }

  showSuccess('Файл загружен успешно');
}

/**
 * Обработка действий с XML
 */
async function xmlAction(action) {
  const input = document.getElementById('xmlInput')?.value;

  if (!input?.trim()) {
    showError('Введите XML для обработки');
    return;
  }

  const options = {
    unescapeFromJson: document.getElementById('xmlUnescape')?.checked || false,
    keepXmlDeclaration: document.getElementById('xmlKeepDecl')?.checked || false,
    escapeForJson: document.getElementById('xmlEscape')?.checked || false
  };

  try {
    const res = await formatXML(action, input, options);
    displayResult(res, options);

    if (res.output) {
      showSuccess(`XML ${action} выполнен успешно`);
    }
  } catch (error) {
    console.error('Error processing XML:', error);
    showError('Ошибка обработки XML');
  }
}

/**
 * Отображение результата
 */
function displayResult(res, options) {
  const output = res.output ?? '';
  currentOutput = output;

  const outputEl = document.getElementById('xmlOutput');
  if (outputEl) {
    outputEl.textContent = output;
  }

  const statsEl = document.getElementById('xmlStats');
  if (statsEl && res.stats) {
    statsEl.textContent = `Вход: ${res.stats.inputBytes} B, Выход: ${res.stats.outputBytes} B, ${res.stats.durationMs} мс`;
  }

  const errorsEl = document.getElementById('xmlErrors');
  if (errorsEl) {
    errorsEl.textContent = res.errors && res.errors.length ? res.errors.join('\n') : '';
  }

  const integrityEl = document.getElementById('xmlIntegrity');
  if (integrityEl) {
    const integ = res.integrity;
    if (integ) {
      integrityEl.textContent = `Целостность: strict=${integ.equalStrict}, normalized=${integ.equalNormalized}, in=${integ.inputHash?.slice(0, 8)}…, out=${integ.outputHash?.slice(0, 8)}…`;
    } else {
      integrityEl.textContent = '';
    }
  }

  const btnCopyXml = document.getElementById('btnCopyXml');
  const btnDownloadXml = document.getElementById('btnDownloadXml');

  if (btnCopyXml) btnCopyXml.disabled = !output;
  if (btnDownloadXml) btnDownloadXml.disabled = !output;
}

/**
 * Копирование результата
 */
function copyOutput() {
  if (!currentOutput) return;

  navigator.clipboard.writeText(currentOutput)
    .then(() => {
      showSuccess('XML скопирован в буфер обмена');
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

  const escapeForJson = document.getElementById('xmlEscape')?.checked;
  const filename = escapeForJson ? 'result.txt' : 'result.xml';
  
  downloadText(currentOutput, filename);
  showSuccess('Файл загружен');
}

console.log('✅ XML module loaded');
