package com.example.formatter.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class XmlUtilsTest {

  @Test
  void parseSecure_parsesWellFormedXml() throws Exception {
    assertNotNull(XmlUtils.parseSecure("<root><a>1</a></root>"));
  }

  @Test
  void parseSecure_rejectsDoctype_xxeProtection() {
    // DOCTYPE запрещён (disallow-doctype-decl=true) → защита от XXE
    String xxe = "<?xml version=\"1.0\"?>"
        + "<!DOCTYPE foo [<!ENTITY xxe \"injected\">]>"
        + "<foo>&xxe;</foo>";
    assertThrows(Exception.class, () -> XmlUtils.parseSecure(xxe),
        "XML с DOCTYPE/сущностями должен отклоняться");
  }

  @Test
  void pythonStyleOneLine_collapsesWhitespaceAndKeepsDeclaration() {
    String xml = "<?xml version=\"1.0\"?>\n<root>\n  <a>1</a>\n</root>";
    String out = XmlUtils.pythonStyleOneLine(xml, true);

    assertFalse(out.contains("\n"));
    assertTrue(out.contains("<?xml"));
    assertTrue(out.contains("<a>1</a>"));
  }
}
