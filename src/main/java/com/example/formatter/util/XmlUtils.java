package com.example.formatter.util;

import org.w3c.dom.*;
import javax.xml.XMLConstants;
import javax.xml.parsers.*;
import javax.xml.transform.*;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.regex.Pattern;

public class XmlUtils {

  // ---------- Безопасный парсинг для pretty/validate/целостности ----------
  public static Document parseSecure(String xml) throws Exception {
    DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();
    f.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
    f.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
    f.setFeature("http://xml.org/sax/features/external-general-entities", false);
    f.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
    f.setXIncludeAware(false);
    f.setExpandEntityReferences(false);
    f.setNamespaceAware(true);

    DocumentBuilder b = f.newDocumentBuilder();
    b.setEntityResolver((publicId, systemId) -> new org.xml.sax.InputSource(new StringReader("")));
    try (ByteArrayInputStream in = new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8))) {
      return b.parse(in);
    }
  }

  public static String transform(Document doc, boolean indent, boolean keepXmlDecl, String standalone) throws Exception {
    TransformerFactory tf = TransformerFactory.newInstance();
    tf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
    Transformer t = tf.newTransformer();
    t.setOutputProperty(OutputKeys.METHOD, "xml");
    t.setOutputProperty(OutputKeys.ENCODING, "UTF-8");
    t.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, keepXmlDecl ? "no" : "yes");
    if (keepXmlDecl && standalone != null) {
      t.setOutputProperty(OutputKeys.STANDALONE, standalone);
    }
    if (indent) {
      t.setOutputProperty(OutputKeys.INDENT, "yes");
      try { t.setOutputProperty("{http://xml.apache.org/xslt}indent-amount", "2"); } catch (Exception ignore) {}
    } else {
      t.setOutputProperty(OutputKeys.INDENT, "no");
    }
    StringWriter sw = new StringWriter();
    t.transform(new DOMSource(doc), new StreamResult(sw));
    return sw.toString();
  }

  // Удаляем чисто-пробельные текстовые узлы (кроме xml:space="preserve")
  private static void stripWhitespaceNodes(Node node) {
    if (node == null) return;
    if (node.getNodeType() == Node.ELEMENT_NODE) {
      Element el = (Element) node;
      boolean preserve = "preserve".equals(el.getAttributeNS(XMLConstants.XML_NS_URI, "space"))
                      || "preserve".equals(el.getAttribute("xml:space"));
      NodeList list = el.getChildNodes();
      for (int i = list.getLength() - 1; i >= 0; i--) {
        Node ch = list.item(i);
        if (ch.getNodeType() == Node.TEXT_NODE) {
          if (!preserve) {
            String v = ch.getNodeValue();
            if (v != null && v.trim().isEmpty()) {
              el.removeChild(ch);
              continue;
            }
          }
        }
        stripWhitespaceNodes(ch);
      }
    } else {
      NodeList list = node.getChildNodes();
      for (int i = list.getLength() - 1; i >= 0; i--) {
        stripWhitespaceNodes(list.item(i));
      }
    }
  }

  public static String minify(String xml, boolean keepXmlDecl, String standalone) throws Exception {
    Document doc = parseSecure(xml);
    stripWhitespaceNodes(doc);
    doc.normalizeDocument();
    String out = transform(doc, false, keepXmlDecl, standalone != null ? standalone : "no");
    return out.replace("\r", "").replace("\n", "");
  }

  public static String pretty(String xml, boolean keepXmlDecl, String standalone) throws Exception {
    Document doc = parseSecure(xml);
    stripWhitespaceNodes(doc);
    doc.normalizeDocument();
    return transform(doc, true, keepXmlDecl, standalone != null ? standalone : "no");
  }

  public static String detectStandaloneFromProlog(String xml) {
    int i = xml.indexOf("<?xml");
    int j = xml.indexOf("?>");
    if (i >= 0 && j > i) {
      String prolog = xml.substring(i, j);
      int k = prolog.indexOf("standalone=");
      if (k >= 0) {
        int q1 = prolog.indexOf('"', k);
        int q2 = prolog.indexOf('"', q1+1);
        if (q1 > 0 && q2 > q1) return prolog.substring(q1+1, q2);
        q1 = prolog.indexOf('\'', k);
        q2 = prolog.indexOf('\'', q1+1);
        if (q1 > 0 && q2 > q1) return prolog.substring(q1+1, q2);
      }
    }
    return null;
  }

  // ---------- JSON-строка утилиты ----------
  // Экранируем только двойные кавычки (как в python-скрипте)
  public static String escapeDoubleQuotesOnly(String s) {
    return s.replace("\"", "\\\"");
  }
  // Снятие JSON-эскейпа безопасно через Jackson (поддержка \n,\t и т.д.)
  public static String jsonUnescape(String s) throws Exception {
    String wrapped = "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
    return om.readValue(wrapped, String.class);
  }

  // ---------- Python-style однострочный алгоритм ----------
  // Соответствует format_xml_to_single_line из вашего python:
  // 1) удалить комментарии <!-- ... -->
  // 2) '>\s+<' -> '><'
  // 3) '\s+' -> ' ' (во всём тексте)
  // 4) trim
  // 5) затем, при необходимости, экранировать двойные кавычки
  private static final Pattern XML_COMMENTS = Pattern.compile("<!--.*?-->", Pattern.DOTALL);
  private static final Pattern BETWEEN_TAGS_SPACES = Pattern.compile(">\\s+<");
  private static final Pattern ALL_SPACES = Pattern.compile("\\s+");
  private static final Pattern XML_DECL = Pattern.compile("^\\s*<\\?xml[^>]*\\?>\\s*", Pattern.CASE_INSENSITIVE);

  public static String pythonStyleOneLine(String xml, boolean keepXmlDecl) {
    if (xml == null) return "";
    String s = xml;

    // Сохраним декларацию, если нужна
    String decl = "";
    if (keepXmlDecl) {
      var m = XML_DECL.matcher(s);
      if (m.find()) {
        decl = m.group().trim(); // например: <?xml version="1.0" ...?>
        s = s.substring(m.end()); // остальное
      }
    } else {
      // если не нужно — просто удалим
      s = XML_DECL.matcher(s).replaceFirst("");
    }

    // 1) удаляем комментарии
    s = XML_COMMENTS.matcher(s).replaceAll("");

    // trim
    s = s.trim();

    // 2) между тегами
    s = BETWEEN_TAGS_SPACES.matcher(s).replaceAll("><");

    // 3) глобально схлопываем пробелы
    s = ALL_SPACES.matcher(s).replaceAll(" ");

    // 4) trim
    s = s.trim();

    // Склеиваем обратно декларацию (без лишних пробелов)
    if (!decl.isEmpty()) {
      // между декларацией и корневым тегом пробелов не делаем, как в вашем примере
      s = decl + s;
    }
    return s;
  }

  // ---------- Хеши целостности ----------
  public static String structuralHashStrict(Document doc) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      ByteArrayOutputStream bos = new ByteArrayOutputStream(4096);
      try (OutputStreamWriter w = new OutputStreamWriter(bos, StandardCharsets.UTF_8)) {
        walk(doc, w, true);
      }
      byte[] dig = md.digest(bos.toByteArray());
      StringBuilder sb = new StringBuilder();
      for (byte b : dig) sb.append(String.format("%02x", b));
      return sb.toString();
    } catch (Exception e) {
      throw new RuntimeException("XML strict hash failed", e);
    }
  }

  public static String structuralHashNormalized(Document doc) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      ByteArrayOutputStream bos = new ByteArrayOutputStream(4096);
      try (OutputStreamWriter w = new OutputStreamWriter(bos, StandardCharsets.UTF_8)) {
        walk(doc, w, false);
      }
      byte[] dig = md.digest(bos.toByteArray());
      StringBuilder sb = new StringBuilder();
      for (byte b : dig) sb.append(String.format("%02x", b));
      return sb.toString();
    } catch (Exception e) {
      throw new RuntimeException("XML normalized hash failed", e);
    }
  }

  private static void walk(Node node, Writer w, boolean strict) throws IOException {
    switch (node.getNodeType()) {
      case Node.DOCUMENT_NODE -> {
        w.write("<DOC>");
        NodeList ch = node.getChildNodes();
        for (int i=0;i<ch.getLength();i++) walk(ch.item(i), w, strict);
      }
      case Node.ELEMENT_NODE -> {
        Element e = (Element) node;
        w.write("<E:");
        w.write(e.getTagName());
        NamedNodeMap attrs = e.getAttributes();
        List<String> names = new ArrayList<>();
        for (int i=0;i<attrs.getLength();i++) names.add(attrs.item(i).getNodeName());
        Collections.sort(names);
        for (String n : names) {
          w.write(" @");
          w.write(n);
          w.write("=");
          w.write(Objects.toString(attrs.getNamedItem(n).getNodeValue(),""));
        }
        w.write(">");
        NodeList ch = e.getChildNodes();
        for (int i=0;i<ch.getLength();i++) walk(ch.item(i), w, strict);
        w.write("</E>");
      }
      case Node.TEXT_NODE -> {
        String t = node.getNodeValue();
        if (!strict) {
          if (t.trim().isEmpty()) return;
          t = t.trim();
        }
        w.write("<T:"); w.write(t); w.write(">");
      }
      case Node.CDATA_SECTION_NODE -> {
        String t = node.getNodeValue();
        if (!strict) t = t.trim();
        if (!strict && t.isEmpty()) return;
        w.write("<C:"); w.write(t); w.write(">");
      }
      case Node.COMMENT_NODE -> {
        if (strict) { w.write("<COM:"); w.write(node.getNodeValue()); w.write(">"); }
      }
      case Node.PROCESSING_INSTRUCTION_NODE -> {
        w.write("<PI:"); w.write(((ProcessingInstruction) node).getTarget()); w.write(" ");
        w.write(((ProcessingInstruction) node).getData()); w.write(">");
      }
      default -> {}
    }
  }
}
