package com.example.formatter.service;

import com.example.formatter.model.FormatRequest;
import com.example.formatter.model.FormatResponse;
import com.example.formatter.util.JsonUtils;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Характеризационные тесты JsonService: фиксируют текущее поведение
 * pretty / minify / validate / wrap / unwrap перед рефакторингом дублей (Phase 2).
 * Проверяются устойчивые инварианты (сохранность данных), а не точное форматирование.
 */
class JsonServiceTest {

  private final JsonService service = new JsonService();

  private static FormatRequest json(String input) {
    return new FormatRequest("json", input, null);
  }

  @Test
  void pretty_preservesData() {
    FormatResponse res = service.pretty(json("{\"b\":1,\"a\":2}"));

    assertTrue(res.errors().isEmpty(), "не должно быть ошибок");
    assertNotNull(res.output());
    assertNotNull(res.integrity());
    // pretty не меняет данные → канонические хеши входа и выхода совпадают
    assertEquals(res.integrity().inputHash(), res.integrity().outputHash());
  }

  @Test
  void minify_producesSingleLineAndPreservesData() {
    FormatResponse res = service.minify(json("{\n  \"a\": 1,\n  \"b\": [1, 2, 3]\n}"));

    assertTrue(res.errors().isEmpty());
    assertNotNull(res.output());
    assertFalse(res.output().contains("\n"), "minify должен убрать переносы строк");
    assertEquals(res.integrity().inputHash(), res.integrity().outputHash());
  }

  @Test
  void validate_acceptsValidJson() {
    FormatResponse res = service.validate(json("{\"ok\": true}"));
    assertTrue(res.errors().isEmpty());
  }

  @Test
  void validate_reportsInvalidJson() {
    FormatResponse res = service.validate(json("{ not json "));
    assertFalse(res.errors().isEmpty(), "невалидный JSON должен дать ошибку");
  }

  @Test
  void wrap_wrapsSimpleValues() {
    FormatResponse res = service.wrapValues(json("{\"a\": 1}"));

    assertTrue(res.errors().isEmpty());
    assertNotNull(res.output());
    assertTrue(res.output().contains("\"value\""), "простые значения оборачиваются в {\"value\": ...}");
  }

  @Test
  void unwrap_unwrapsValueWrappersInsideArray() throws Exception {
    // Регрессия: обёртки {"value": ...} как ЭЛЕМЕНТЫ массива тоже должны разворачиваться.
    String input = "{\"payment_ids\": [ {\"value\": \"22341\"}, {\"value\": \"99\"} ]}";

    FormatResponse res = service.unwrapValues(json(input));
    assertTrue(res.errors().isEmpty());

    String expectedHash = JsonUtils.canonicalHash(
      JsonUtils.parse("{\"payment_ids\": [\"22341\", \"99\"]}"));
    String actualHash = JsonUtils.canonicalHash(JsonUtils.parse(res.output()));
    assertEquals(expectedHash, actualHash, "элементы-обёртки массива должны развернуться");
    assertFalse(res.output().contains("\"value\""), "value не должно остаться в результате");
  }

  @Test
  void wrapThenUnwrap_isLosslessRoundTrip() throws Exception {
    String original = "{\"a\": 1, \"b\": \"text\", \"c\": {\"d\": true}, \"e\": [1, 2]}";

    FormatResponse wrapped = service.wrapValues(json(original));
    assertTrue(wrapped.errors().isEmpty());

    FormatResponse unwrapped = service.unwrapValues(json(wrapped.output()));
    assertTrue(unwrapped.errors().isEmpty());

    // После wrap → unwrap данные должны вернуться к исходным (сравниваем по канонике)
    String originalHash = JsonUtils.canonicalHash(JsonUtils.parse(original));
    String roundTripHash = JsonUtils.canonicalHash(JsonUtils.parse(unwrapped.output()));
    assertEquals(originalHash, roundTripHash, "wrap+unwrap не должны менять данные");
  }
}
