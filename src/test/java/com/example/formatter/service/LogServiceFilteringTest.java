package com.example.formatter.service;

import com.example.formatter.model.NormalizeRequest;
import com.example.formatter.model.NormalizeResponse;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Защитные (характеризационные) тесты НЮАНСОВ ОТСЕВА логов.
 * Фиксируют текущее поведение фильтрации ДО разбиения LogService.normalize на шаги (Phase 4-C),
 * чтобы гарантировать: рефакторинг не меняет, что именно извлекается и что отбрасывается.
 */
class LogServiceFilteringTest {

  private final LogService service = new LogService();

  // --- Фильтр служебных полей (afterColon) ---

  @Test
  void afterColon_serviceLog_filteredFromAfterColonButPickedUpByUniversalFallback() {
    // ВАЖНЫЙ НЮАНС ТЕКУЩЕГО ПОВЕДЕНИЯ (а не желаемого):
    // Фильтр SERVICE_FIELDS применяется ТОЛЬКО в ветке afterColon (приоритет 2).
    // JSON с >=2 служебными полями там отбраковывается, messages пустой →
    // срабатывает приоритет 3 (универсальный fallback findAllJsonInText), который
    // фильтр НЕ применяет. В итоге служебный JSON всё же извлекается с ключом found_json_1.
    // Тест фиксирует это поведение, чтобы рефакторинг его не изменил.
    String log = "Log entry: {\"timestamp\":\"2024-01-01T00:00:00Z\",\"level\":\"INFO\",\"service\":\"api\",\"threadName\":\"main\"}";
    NormalizeResponse res = service.normalize(new NormalizeRequest(log, false, null, null));

    assertEquals(1, res.items().size());
    assertEquals("found_json_1", res.items().get(0).key());
  }

  @Test
  void afterColon_nonServiceJsonLongEnough_isExtractedAsMessageJson() {
    String log = "Data here: {\"orderId\":123,\"customerName\":\"John Doe\",\"totalAmount\":4567}";
    NormalizeResponse res = service.normalize(new NormalizeRequest(log, false, null, null));

    assertEquals(1, res.items().size());
    assertEquals("message_json", res.items().get(0).key());
  }

  // --- Порог minAfterColonLength ---

  @Test
  void afterColon_shortJson_belowDefaultThreshold_isIgnored() {
    String log = "Info: {\"productName\":\"test\",\"qty\":42}"; // JSON ~31 символ < порога 50
    NormalizeResponse res = service.normalize(new NormalizeRequest(log, false, null, null));

    assertEquals(0, res.items().size(), "по умолчанию короткий JSON после двоеточия игнорируется");
  }

  @Test
  void afterColon_shortJson_isExtractedWhenThresholdLowered() {
    String log = "Info: {\"productName\":\"test\",\"qty\":42}";
    NormalizeResponse res = service.normalize(new NormalizeRequest(log, false, null, 10));

    assertEquals(1, res.items().size(), "при пониженном пороге тот же JSON извлекается");
    assertEquals("message_json", res.items().get(0).key());
  }

  // --- Приоритет ключевых паттернов ---

  @Test
  void keyPattern_internalRequest_extractedWithKeyName() {
    String log = "Sending internalRequest = {\"userId\":1,\"action\":\"login\"}";
    NormalizeResponse res = service.normalize(new NormalizeRequest(log, false, null, null));

    assertEquals(1, res.items().size());
    assertEquals("internalRequest", res.items().get(0).key(), "ключ должен совпадать с именем паттерна");
  }

  // --- args= (только при явном включении) ---

  @Test
  void args_extractedWhenEnabled() {
    String log = "methodCall args=[{\"param1\":\"value1\",\"param2\":\"value2\"}]";
    NormalizeResponse res = service.normalize(new NormalizeRequest(log, false, List.of("args"), null));

    assertEquals(1, res.items().size());
    assertEquals("args", res.items().get(0).key());
  }
}
