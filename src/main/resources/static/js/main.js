// Точка входа: подключает модули ядра и инструментов, выносит в window
// функции, которые вызываются из inline-onclick в статической разметке.

import { navigate } from "./core/router.js";
import "./core/theme.js";
import { closeCompareModal } from "./tools/logs.js";
import "./tools/json.js";
import "./tools/xml.js";

// В разметке остались только эти inline-вызовы: navigate (карточки главной,
// «Назад к вводу», «Последний результат») и closeCompareModal (крестик модалки).
// Карточки логов теперь вешают обработчики через addEventListener — глобальные
// функции для них больше не нужны.
Object.assign(window, { navigate, closeCompareModal });
