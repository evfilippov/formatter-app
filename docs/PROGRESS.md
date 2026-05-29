# Журнал прогресса стабилизации

> Живой журнал работ по [ROADMAP.md](./ROADMAP.md). Обновляется в конце каждого блока работ.
> Цель — в любой момент (даже после потери контекста) понять: **что сделано** и **что дальше**.
> Легенда статусов: ✅ сделано · 🔄 в работе · ⬜ не начато.

## Текущая позиция

**Сейчас:** ⏸️ ПАУЗА (до завтра). Phase 1, 2, 4 завершены — бэкенд стабилизирован. Следующий шаг — **Phase 5: подготовка фронтенда (A–C) + ВИЗУАЛЬНЫЙ РЕДИЗАЙН (D)**.

> **Важно про фронт (со слов владельца):** текущий дизайн НЕ нравится — «скупой», дешёвый. Нужен серьёзный редизайн: по-настоящему современный вид, удобные ввод/вывод, заметные функциональные ключевые кнопки, наглядные переключатели функций, неброская но интересная палитра. Детали — в ROADMAP §6 «Этап D». Phase 5 дробить на под-шаги и согласовывать визуал с владельцем.

> **На будущее (конец плана):** функционал будет расти (GraphQL — приоритетный кандидат, плюс YAML/CSV, diff, схемы и др.). Зафиксировано в ROADMAP §15. Не текущая работа.

**Как запускать** — см. [RUNNING.md](./RUNNING.md). Основной способ — Docker Compose:
- приложение: `docker compose up --build` → http://localhost:8080
- тесты: `docker compose run --rm test`

Maven также установлен локально (`mvn test` / `mvn spring-boot:run` работают), но поддерживаемый способ — Compose.
Текущее состояние: **41 тест, все зелёные**; приложение проверено в контейнере (health UP, happy-path API, битое тело → 400, logs/normalize извлекает request+internalResponse).

---

## Статус по фазам

### Phase 1 — Низкорисковая стабилизация ✅ (2026-05-29)
- ✅ Удалён мёртвый код: `service/LogExtractor.java`, `service/BracketExtractor.java`, метод `XmlUtils.minify`.
  - `HashUtil` **сознательно оставлен** — будет переиспользован в Phase 2 для устранения дублей SHA-256.
- ✅ CORS: `allowedOrigins("*")` → список из конфига `app.cors.allowed-origins` (по умолчанию localhost). Файлы: `config/WebConfig.java`, `application.yml`.
- ✅ XSS: добавлен `escapeHtml(...)` в `static/app.js`; `highlightText` теперь всегда экранирует вход перед вставкой в `innerHTML` (включая ветки «без подсветки» и `catch`).
- ✅ Добавлен `.gitignore` (target/, логи, IDE).
- **Не делалось** (перенесено): удаление `console.log` из прод-путей — мелочь, заберём в Phase 5 вместе с фронтом.

### Phase 3 — Тестовый фундамент 🔄 (стартовал вместе с Phase 1, расширен в Phase 2)
Характеризационная сеть (34 теста, все зелёные):
- ✅ `JsonServiceTest` (6): pretty/minify/validate, wrap, **wrap→unwrap round-trip без потери данных**.
- ✅ `XmlServiceTest` (3): pretty/minify/validate.
- ✅ `LogServiceTest` (3): извлечение по паттерну `request`, **дедупликация**, пустой вход.
- ✅ `JsonUtilsTest` (4): стабильность канонического хеша к порядку ключей, компактный `value`, счётчики.
- ✅ `UniversalJsonExtractorTest` (4): `extractFromArgs`, `findAllJsonInText`.
- ✅ `XmlUtilsTest` (3): well-formed parse, **защита от XXE (DOCTYPE отклоняется)**, python-style one-line.
- ✅ `JsonBalancerTest` (11): крайние случаи балансировки — скобки/кавычки внутри строк, экранирование, хвост, несбалансированный вход.
- ⬜ Осталось на будущее: контроллерные тесты `@WebMvcTest`.

### Phase 2 — Очистка и дедупликация ✅ (2026-05-29)
- ✅ Создан общий `util/JsonBalancer.extractCompleteJson(...)`; приватные копии удалены из `LogService` и `UniversalJsonExtractor`. Контракт зафиксирован 11 тестами.
- ✅ SHA-256 сведён на единый `HashUtil` (добавлена перегрузка для `byte[]`): переведены `LogService.sha256` (удалён), `JsonUtils.canonicalHash`, `XmlUtils.structuralHashStrict/Normalized`. Хеши не изменились (проверено тестами + смоук).
- ✅ Фронт: два почти идентичных обработчика `btnWrap`/`btnUnwrap` (~120 строк) сведены в `handleJsonValueAction(action)` + конфиг `JSON_VALUE_ACTIONS`. Поведение 1:1.
- Проверено в живом контейнере: wrap/unwrap round-trip, normalize, xml pretty — корректно.

### Phase 4 — Структурные улучшения ✅ (2026-05-29)
- ✅ **A) Логирование (slf4j):** добавлен логгер в `LogService`; 3 молчаливых `catch (Exception ignore)` заменены на `log.debug(...)` (намеренные пропуски, поведение отсева НЕ изменено). Уровень `com.example.formatter` задаётся в `application.yml` (по умолчанию INFO).
- ✅ **B) Глобальная обработка ошибок:** `controller/ApiExceptionHandler` (@RestControllerAdvice) — непойманные исключения → читаемый JSON с `errors` + лог стектрейса (вместо голого 500). Покрыт `ApiExceptionHandlerTest`. Штатные ошибки сервисов не затронуты.
- ✅ **C) `LogService.normalize` разбит** на приватные шаги: `resolveEnabledPatterns` / `processEntry` / `resolveTextForPatterns` / `addExtractedMessage` + аккумулятор `Acc`. Логика 1:1. ПРЕДВАРИТЕЛЬНО заложены защитные тесты `LogServiceFilteringTest` (6) на нюансы отсева — они же задокументировали квирк: фильтр SERVICE_FIELDS работает только в ветке afterColon, а универсальный fallback извлекает служебный JSON с ключом `found_json_1`.
- ⏭️ **D) (пропущено сознательно)** перенос `UniversalJsonExtractor` `util`→`service` — низкая польза / лишний churn. Можно сделать позже при желании.

### Phase 5 — Подготовка фронтенда ⬜
DOM вместо `innerHTML`, единый HTTP-слой, ESM-модули, словарь строк, чистка `console.log` и inline-стилей.

### Phase 6 — Опциональная декомпозиция ⬜
По умолчанию — не делать. Только при кратном росте функциональности.

---

## История изменений
- **2026-05-29** — Phase 1 выполнена + заложена тестовая сеть (Phase 3). 23 теста зелёные. Коммитов не делалось по просьбе (изменения в рабочем дереве).
- **2026-05-29** — Phase 2 выполнена: унификация `extractCompleteJson` (JsonBalancer) и SHA-256 (HashUtil), дедуп wrap/unwrap на фронте. 34 теста зелёные, смоук в контейнере пройден. Без коммитов.
- **2026-05-29** — Phase 4-A/B: slf4j-логирование вместо молчаливых catch + глобальный @RestControllerAdvice. 35 тестов зелёные, смоук (400 на битом теле, happy-path ок). Без коммитов.
- **2026-05-29** — Phase 4-C: `LogService.normalize` разбит на приватные шаги под защитой 6 новых тестов отсева (поведение 1:1). Пункт D пропущен. 41 тест зелёный, смоук logs/normalize ок. Без коммитов.
