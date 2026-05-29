package com.example.formatter.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Защитные тесты на крайние случаи балансировщика скобок.
 * Фиксируют контракт ДО того, как LogService и UniversalJsonExtractor
 * будут переведены на этот общий класс (Phase 2).
 */
class JsonBalancerTest {

  @Test
  void simpleObject() {
    assertEquals("{\"a\":1}", JsonBalancer.extractCompleteJson("{\"a\":1}"));
  }

  @Test
  void nestedObject() {
    String s = "{\"a\":{\"b\":{\"c\":2}}}";
    assertEquals(s, JsonBalancer.extractCompleteJson(s));
  }

  @Test
  void arrayInsideObject() {
    String s = "{\"a\":[1,2,3]}";
    assertEquals(s, JsonBalancer.extractCompleteJson(s));
  }

  @Test
  void braceInsideStringValueIsIgnored() {
    // Закрывающая } внутри строки не должна завершать объект досрочно
    String s = "{\"a\":\"}\"}";
    assertEquals(s, JsonBalancer.extractCompleteJson(s));
  }

  @Test
  void bracketsInsideStringAreIgnored() {
    String s = "{\"a\":\"][\"}";
    assertEquals(s, JsonBalancer.extractCompleteJson(s));
  }

  @Test
  void escapedQuoteInsideStringDoesNotCloseString() {
    // Значение содержит экранированные кавычки: he said \"hi\"
    String s = "{\"a\":\"he said \\\"hi\\\" and }{\"}";
    assertEquals(s, JsonBalancer.extractCompleteJson(s));
  }

  @Test
  void trailingContentAfterObjectIsDropped() {
    assertEquals("{\"a\":1}", JsonBalancer.extractCompleteJson("{\"a\":1} garbage after }]"));
  }

  @Test
  void leadingWhitespaceIsTrimmed() {
    assertEquals("{\"a\":1}", JsonBalancer.extractCompleteJson("   \n\t{\"a\":1}"));
  }

  @Test
  void unbalancedReturnsNull() {
    assertNull(JsonBalancer.extractCompleteJson("{\"a\":1"));
    assertNull(JsonBalancer.extractCompleteJson("{\"a\":[1,2}"));
  }

  @Test
  void notStartingWithBraceReturnsNull() {
    // Вызывающий обязан спозиционироваться на '{'
    assertNull(JsonBalancer.extractCompleteJson("prefix {\"a\":1}"));
  }

  @Test
  void nullAndEmptyReturnNull() {
    assertNull(JsonBalancer.extractCompleteJson(null));
    assertNull(JsonBalancer.extractCompleteJson(""));
    assertNull(JsonBalancer.extractCompleteJson("   "));
  }
}
