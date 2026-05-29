# Как запустить и проверить проект

Всё работает через **Docker Compose** — локальные Java/Maven не нужны.
Файл: [`docker-compose.yml`](../docker-compose.yml) в корне проекта.

## Запустить приложение

```bash
docker compose up --build
```

Открыть в браузере: **http://localhost:8080**

Проверка, что бэкенд жив: http://localhost:8080/actuator/health (должно быть `{"status":"UP"}`).

Остановить:

```bash
docker compose down
```

> Флаг `--build` нужен, если менялся код. Если код не трогали — можно просто `docker compose up`.
> Для фонового запуска: `docker compose up -d --build` (контейнер работает в фоне, логи — `docker compose logs -f app`).

## Прогнать тесты

```bash
docker compose run --rm test
```

Тесты гоняются в контейнере Maven по исходникам; зависимости кэшируются в томе `maven-repo`,
поэтому повторные прогоны быстрые. Ожидаемый результат — `BUILD SUCCESS`, `Tests run: 23`.

## Что проверить руками после запуска

- Главная страница открывается на http://localhost:8080
- Раздел JSON: вставить `{"b":1,"a":2}`, нажать Pretty — получить отформатированный JSON.
- Раздел XML: вставить `<root><a>1</a></root>`, нажать Pretty/Minify.
- Раздел Logs: вставить лог-строку и нажать нормализацию.

## Альтернатива (если удобнее без Docker)

Maven установлен локально (Chocolatey), поэтому также работает:
- тесты: `mvn test`
- запуск: `mvn spring-boot:run`

Но основной поддерживаемый способ в этом проекте — Docker Compose (см. выше).
