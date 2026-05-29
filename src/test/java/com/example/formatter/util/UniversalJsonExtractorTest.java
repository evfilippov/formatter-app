package com.example.formatter.util;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class UniversalJsonExtractorTest {

  @Test
  void extractFromArgs_extractsFirstObject() {
    String content = "method call args=[{\"id\":1,\"name\":\"test\"}] done";
    String json = UniversalJsonExtractor.extractFromArgs(content);

    assertNotNull(json);
    assertTrue(json.startsWith("{") && json.endsWith("}"));
    assertTrue(json.contains("\"id\""));
  }

  @Test
  void extractFromArgs_returnsNullWhenNoArgs() {
    assertNull(UniversalJsonExtractor.extractFromArgs("no args here"));
  }

  @Test
  void findAllJsonInText_findsObjectsLongerThanThreshold() {
    String content = "prefix {\"description\":\"this value is definitely longer than fifty chars\"} suffix";
    List<String> found = UniversalJsonExtractor.findAllJsonInText(content);

    assertFalse(found.isEmpty(), "должен найти JSON длиннее порога (50)");
    assertTrue(found.get(0).contains("\"description\""));
  }

  @Test
  void findAllJsonInText_ignoresEmptyInput() {
    assertTrue(UniversalJsonExtractor.findAllJsonInText("").isEmpty());
  }
}
