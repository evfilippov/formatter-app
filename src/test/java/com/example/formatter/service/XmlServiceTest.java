package com.example.formatter.service;

import com.example.formatter.model.FormatRequest;
import com.example.formatter.model.FormatResponse;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Характеризационные тесты XmlService: pretty / minify / validate.
 */
class XmlServiceTest {

  private final XmlService service = new XmlService();

  private static FormatRequest xml(String input) {
    return new FormatRequest("xml", input, null);
  }

  @Test
  void pretty_formatsWellFormedXml() {
    FormatResponse res = service.pretty(xml("<root><a>1</a><b>2</b></root>"));

    assertTrue(res.errors().isEmpty());
    assertNotNull(res.output());
    assertTrue(res.output().contains("<a>1</a>"));
    assertNotNull(res.integrity());
    // Pretty не меняет структуру → нормализованные хеши совпадают
    assertTrue(res.integrity().equalNormalized());
  }

  @Test
  void minify_collapsesToSingleLine() {
    FormatResponse res = service.minify(xml("<root>\n  <a>1</a>\n  <b>2</b>\n</root>"));

    assertTrue(res.errors().isEmpty());
    assertNotNull(res.output());
    assertFalse(res.output().contains("\n"), "minify должен дать одну строку");
    assertTrue(res.output().contains("<a>1</a>"));
  }

  @Test
  void validate_reportsMalformedXml() {
    FormatResponse res = service.validate(xml("<root><a></root>"));
    assertFalse(res.errors().isEmpty(), "незакрытый тег должен дать ошибку");
  }
}
