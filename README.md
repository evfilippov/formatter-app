# DataStudio

Компактный веб-инструмент для разработчиков: форматирование/валидация **JSON** и
**XML**, а также **анализ логов** — извлечение, нормализация и дедупликация
JSON-сообщений из больших логов.

Spring Boot 3.3 / Java 21 + статический фронтенд на ванильном JS (без сборки).
Тёмная/светлая темы, подсветка синтаксиса, двухстраничный разбор логов.

## Быстрый старт (из Docker Hub)

```bash
docker run --rm -p 8080:8080 e1vg/datastudio:latest
```

Откройте http://localhost:8080. Чтобы закрепиться за версией на время
тестирования, используйте тег `1.0.0` вместо `latest`.

## Возможности

- **JSON** — Pretty / Minify / Validate; режим Value Wrapper (обернуть/развернуть
  значения в `{"value": ...}`), сборка JSON-массива из набора чисел.
- **XML** — Pretty / Minify / Validate, escape/unescape для JSON-строк, проверка
  целостности (структурные хеши).
- **Логи** — извлечение JSON-сообщений по набору паттернов, дедупликация,
  поиск (в т.ч. regex), фильтры по типу, сортировки, сравнение сообщений,
  экспорт отчёта.

## Запуск из исходников (через Docker Compose)

```bash
docker compose up --build      # → http://localhost:8080
docker compose down            # остановить
```

## Тесты

- Бэкенд (JUnit): `docker compose run --rm test`
- Фронтенд E2E (Playwright): см. [docs/TESTING.md](docs/TESTING.md)
  - быстрый дымовой набор: `npm run test:e2e`
  - полный UI-прогон (видимый браузер): `npm run test:ui-full`

## Документация

- [docs/RUNNING.md](docs/RUNNING.md) — способы запуска
- [docs/TESTING.md](docs/TESTING.md) — тестирование
- [docs/DEPLOY-DOCKERHUB.md](docs/DEPLOY-DOCKERHUB.md) — публикация образа
- [docs/ROADMAP.md](docs/ROADMAP.md) · [docs/PROGRESS.md](docs/PROGRESS.md) — план и журнал

## Лимиты

Максимум 10 МБ на вход, тайм-аут обработки 15 с.
