package com.example.formatter.util;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JsonUtilsTest {

  @Test
  void canonicalHash_isIndependentOfKeyOrder() throws Exception {
    JsonNode a = JsonUtils.parse("{\"a\":1,\"b\":2}");
    JsonNode b = JsonUtils.parse("{\"b\":2,\"a\":1}");

    assertEquals(JsonUtils.canonicalHash(a), JsonUtils.canonicalHash(b),
        "хеш не должен зависеть от порядка ключей");
  }

  @Test
  void canonicalHash_differsForDifferentData() throws Exception {
    JsonNode a = JsonUtils.parse("{\"a\":1}");
    JsonNode b = JsonUtils.parse("{\"a\":2}");

    assertNotEquals(JsonUtils.canonicalHash(a), JsonUtils.canonicalHash(b));
  }

  @Test
  void formatTabbed_compactsSingleValueKeyObject() throws Exception {
    // {"x": {"value": 1}} → объект с единственным ключом value печатается компактно в одну строку
    JsonNode node = JsonUtils.parse("{\"x\":{\"value\":1}}");
    String out = JsonUtils.formatTabbed(node);

    assertTrue(out.contains("{\"value\": 1}"), "ключ value должен печататься компактно");
  }

  @Test
  void countLines_and_countValueKey() {
    String pretty = "{\n\t\"a\": {\"value\": 1},\n\t\"b\": {\"value\": 2}\n}";
    assertEquals(4, JsonUtils.countLines(pretty));
    assertEquals(2, JsonUtils.countValueKey(pretty));
  }
}
