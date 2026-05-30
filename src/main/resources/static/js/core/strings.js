// Единый словарь UI-строк (задел под i18n). Сейчас одна локаль — ru.
// ВАЖНО: значения — ровно как видит пользователь. Менять формулировки только
// осознанно: их сторожат E2E-тесты `ui-full`. Английские токены (Pretty, JSON,
// имена файлов) намеренно НЕ выносятся — словарь только для русского текста.
//
// Статические подписи разметки берутся отсюда через data-i18n (см. i18n.js).
// Параметрические строки — функции.

export const STR = {
  app: {
    title: "DataStudio — JSON · XML · Логи",
    brand: "DataStudio",
  },

  sidebar: {
    tools: "Инструменты",
    home: "Главная",
    logs: "Логи",
    json: "JSON",
    xml: "XML",
    limits: "Макс. 10 МБ · Тайм-аут 15 c",
  },

  theme: {
    dark: "Тёмная тема",
    light: "Светлая тема",
    iconDark: "☾",
    iconLight: "☀",
  },

  home: {
    // Выровнено с навигацией (раньше было «Logs» — смесь RU/EN).
    logs: "Логи",
    json: "JSON",
    xml: "XML",
  },

  common: {
    fileNotChosen: "Файл не выбран",
    chooseFile: "Выбрать файл",
    input: "Ввод",
    result: "Результат",
    copyResult: "Копировать результат",
    // Шаблон статистики «вход/выход/время».
    stats: (inB, outB, ms) => `Вход: ${inB} B, Выход: ${outB} B, ${ms} мс`,
    integrity: (s, n, inH, outH) =>
      `Целостность: strict=${s}, normalized=${n}, in=${inH}…, out=${outH}…`,
    processError: "Ошибка обработки: ",
  },

  json: {
    title: "🔧 JSON",
    sub: "Форматирование, минификация и проверка JSON.",
    placeholder: "Вставьте JSON...",
    modeTitle: "🎯 Режим обработки:",
    modeFormat: "Форматирование",
    modeWrapper: "Value Wrapper",
    btnWrapNumbers: "🔢 Числа → value",
    wrapNumbersTitle:
      'Найти все числа в поле ввода и обернуть каждое в {"value": "..."}, собрав JSON-массив',
    hintFormat: "Pretty форматирует с отступами, Minify убирает пробелы",
    hintWrapper:
      'Wrap/Unwrap оборачивают/разворачивают значения JSON; «Числа → value» собирает JSON-массив {"value": "..."} из набора чисел',
    downloadName: "Скачать result.json",
    pasteFirst: "Вставьте JSON в поле ввода",
    copied: "JSON скопирован в буфер обмена",
    ok: (action) => `JSON ${action} выполнен успешно`,
    error: "Ошибка обработки JSON",
    wrapSuffix: '✅ Значения обернуты в {"value": ...}',
    unwrapSuffix: "✅ Значения развернуты",
    structureChanged: "Данные сохранены, структура изменена",
    noNumbers: "В поле ввода нет чисел для обёртки",
    wrappedCount: (n) => `Обёрнуто чисел: ${n}`,
    wrappedNotify: (n) => `Обёрнуто ${n} чисел`,
    resultCopied: "Результат скопирован в буфер обмена",
  },

  xml: {
    title: "📄 XML",
    sub: "Форматирование, минификация и проверка XML.",
    placeholder: "Вставьте XML или XML в виде JSON-строки...",
    optUnescape: "Unescape из JSON-строки",
    optKeepDecl: "Сохранить XML декларацию",
    optEscape: "Escape для JSON-строки",
    downloadName: "Скачать result.xml",
    pasteFirst: "Вставьте XML в поле ввода",
    copied: "XML скопирован в буфер обмена",
    ok: (action) => `XML ${action} выполнен успешно`,
    error: "Ошибка обработки XML",
  },

  logs: {
    title: "📋 Анализ логов",
    sub: "Извлечение, нормализация и дедупликация JSON-сообщений из больших логов.",
    fileLabel: "📁 Файл логов (до 10 МБ):",
    orPaste: "📝 Или вставьте текст вручную:",
    placeholder:
      "Вставьте логи в формате NDJSON (каждая строка - отдельный JSON объект)...",
    optReplaceEsc: "Заменять \\n на переводы строк",
    optMinLen: "Min длина после двоеточия:",
    optOnlyUnique: "Только уникальные",
    optShowDup: "Показывать дубликаты",
    optAutoSave: "Автосохранение",
    optRegex: "Regex-поиск",
    regexTitle:
      "Искать в результатах по регулярному выражению (RegExp), а не по обычной подстроке",
    btnNormalize: "⚡ Извлечь и проанализировать",
    btnReset: "🗑️ Очистить всё",
    btnLast: "↻ Последний результат",
    back: "← Назад к вводу",
    backTitle: "Вернуться к вводу",
    resultsTitle: "📊 Результаты анализа",
    searchPlaceholder: "🔍 Поиск по сообщениям...",
    filterAll: "Все типы",
    sortNumber: "По номеру",
    sortType: "По типу",
    sortSize: "По размеру",
    sortTimestamp: "По времени",
    collapseAllTitle: "Свернуть все",
    expandAllTitle: "Развернуть все",
    highlight: "Подсветка",
    btnDownloadReport: "📥 Скачать общий отчёт",
    btnCopyReport: "📋 Копировать отчёт",
    btnExportSelected: "✅ Экспорт выбранных",
    exportSelectedTitle:
      "Отметьте нужные сообщения галочками в карточках, затем нажмите — выбранные сохранятся в файл",
    btnCompare: "🔍 Сравнить (2)",

    // Динамика
    saveError: "Ошибка автосохранения",
    historyLabel: "История: ",
    statsLine: (s) =>
      `📊 Записей: ${s.totalEntries} | ✅ Извлечено: ${s.extracted} | 🎯 Уникальных: ${s.unique} | 📑 Дубликатов: ${s.duplicates} | ⏱️ ${s.durationMs} мс`,
    collapsedAll: "Все карточки свернуты",
    expandedAll: "Все карточки развернуты",
    exported: (n) => `Экспортировано ${n} сообщений`,
    jsonCopied: "JSON скопирован в буфер обмена",
    blockCopied: "Блок скопирован в буфер обмена",
    pickSecond: "Выберите второй элемент для сравнения",
    compareTitle: (n, key) => `Сообщение ${n}: ${key}`,
    fileLoaded: "Файл загружен успешно",
    pasteFirst: "Вставьте лог в поле ввода для анализа",
    reportCopied: "Отчет скопирован в буфер обмена",
    processed: (n) => `Обработано ${n} сообщений`,
    dataError: "Ошибка обработки данных",
    cleared: "Все данные очищены",
    restored: "Данные восстановлены из автосохранения",
    filtersCleared: "Фильтры очищены",
    jumpedTo: (n) => `Переход к сообщению №${n}`,
    notFound: (n) => `Сообщение №${n} не найдено`,
    droppedFile: (name) => `Файл ${name} загружен через Drag & Drop`,
    beforeUnload:
      "У вас есть несохраненные данные. Вы уверены, что хотите покинуть страницу?",
    counter: (shown, total) => `${shown} из ${total}`,
    showMore: (remaining) => `Показать ещё (осталось ${remaining})`,
    chartBar: (type, count) => `${type}: ${count} сообщений`,

    // Карточка сообщения
    cardCopyJson: "📋 Копировать JSON",
    cardCopyBlock: "📄 Копировать блок",
    cardDownload: "💾 Скачать",
    cardCompare: "🔍 Сравнить",
    cardMessage: (n) => `СООБЩЕНИЕ ${n}: `,
    cardLinesTitle: "Строк",
    cardSizeTitle: "Размер",
    cardDup: (n) => `Дубликат №${n}`,
    cardValues: (n) => `📊 Значений: ${n}`,
    cardRawSize: (n) => `🔤 Сырой размер: ${n} байт`,
    cardLines: (n) => `📝 ${n}`,
    cardSize: (s) => `📦 ${s}`,
    cardTrace: (t) => `🔗 ${t}`,
    cardTime: (t) => `⏰ ${t}`,
    starOn: "Убрать из избранного",
    starOff: "Добавить в избранное",
  },

  compare: {
    title: "🔍 Сравнение сообщений",
  },

  jump: {
    label: "Перейти к сообщению №",
    go: "Перейти",
    cancel: "Отмена",
  },
};

// Доступ по «точечному» ключу: getStr("logs.title").
export function getStr(path) {
  let cur = STR;
  for (const part of path.split(".")) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}
