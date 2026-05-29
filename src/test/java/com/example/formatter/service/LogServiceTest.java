package com.example.formatter.service;

import com.example.formatter.model.NormalizeRequest;
import com.example.formatter.model.NormalizeResponse;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Характеризационные тесты LogService.normalize — самой сложной парсинг-логики.
 * Фиксируют извлечение JSON по ключевым паттернам и дедупликацию,
 * чтобы защитить поведение перед разбиением normalize на шаги (Phase 4).
 */
class LogServiceTest {

  private final LogService service = new LogService();

  private static NormalizeRequest req(String input) {
    // enabledPatterns=null → используются дефолтные паттерны (включая "request")
    return new NormalizeRequest(input, false, null, null);
  }

  @Test
  void normalize_extractsJsonFromRequestPattern() {
    String log = """
        {"message":"Processing request = {\\"orderId\\":123,\\"amount\\":50}"}
        """;

    NormalizeResponse res = service.normalize(req(log));

    assertEquals(1, res.items().size(), "должен извлечься один JSON-блок");
    assertEquals(1, res.stats().unique());
    assertTrue(res.export().asText().contains("СООБЩЕНИЕ"));
  }

  @Test
  void normalize_deduplicatesIdenticalJson() {
    String log = """
        {"message":"First request = {\\"orderId\\":123,\\"amount\\":50}"}
        {"message":"Second request = {\\"orderId\\":123,\\"amount\\":50}"}
        """;

    NormalizeResponse res = service.normalize(req(log));

    assertEquals(2, res.stats().extracted(), "извлечено два совпадения");
    assertEquals(1, res.stats().unique(), "одинаковый JSON схлопывается в один уникальный");
    assertEquals(1, res.stats().duplicates());
    assertEquals(1, res.items().size());
  }

  @Test
  void normalize_emptyInputProducesNoItems() {
    NormalizeResponse res = service.normalize(req(""));
    assertEquals(0, res.items().size());
    assertEquals(0, res.stats().unique());
  }
}
