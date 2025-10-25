// ============================================
// LOGS STORAGE - LOCALSTORAGE
// ============================================

import { showSuccess, showWarning } from '../../components/notification.js';

/**
 * Загрузка из localStorage
 */
export function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem('logsData');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading from localStorage:', e);
  }
  return null;
}

/**
 * Сохранение в localStorage
 */
export function saveToLocalStorage(data) {
  if (document.getElementById('autoSave')?.checked) {
    try {
      localStorage.setItem('logsData', JSON.stringify(data));
      showSuccess('Автосохранение выполнено');
    } catch (e) {
      console.error('Error saving to localStorage:', e);
      showWarning('Ошибка автосохранения');
    }
  }
}

/**
 * Загрузка настроек
 */
export function loadSettings() {
  const settings = localStorage.getItem('logsSettings');
  if (settings) {
    try {
      const parsed = JSON.parse(settings);
      if (parsed.autoSave !== undefined) {
        const autoSave = document.getElementById('autoSave');
        if (autoSave) autoSave.checked = parsed.autoSave;
      }
      if (parsed.highlightSearch !== undefined) {
        const highlight = document.getElementById('highlightSearch');
        if (highlight) highlight.checked = parsed.highlightSearch;
      }
      if (parsed.regexMode !== undefined) {
        const regex = document.getElementById('regexMode');
        if (regex) regex.checked = parsed.regexMode;
      }
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  }
}

/**
 * Сохранение настроек
 */
export function saveSettings(settings) {
  localStorage.setItem('logsSettings', JSON.stringify(settings));
}

console.log('✅ Logs storage module loaded');
