package com.example.formatter.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;

import java.util.*;

public class JsonUtils {
  private static final ObjectMapper MAPPER = new ObjectMapper();

  public static ObjectMapper mapper() { return MAPPER; }

  public static JsonNode parse(String json) throws JsonProcessingException {
    return MAPPER.readTree(json);
  }

  public static JsonNode sortRec(JsonNode node) {
    if (node == null || node.isNull() || node.isNumber() || node.isTextual() || node.isBoolean()) return node;
    if (node.isArray()) {
      ArrayNode arr = MAPPER.createArrayNode();
      for (JsonNode el : node) arr.add(sortRec(el));
      return arr;
    }
    if (node.isObject()) {
      ObjectNode src = (ObjectNode) node;
      ObjectNode dst = MAPPER.createObjectNode();
      List<String> names = new ArrayList<>();
      src.fieldNames().forEachRemaining(names::add);
      Collections.sort(names);
      for (String name : names) dst.set(name, sortRec(src.get(name)));
      return dst;
    }
    return node;
  }

  public static String canonicalize(JsonNode node) {
    try {
      JsonNode sorted = sortRec(node);
      return mapper().writeValueAsString(sorted);
    } catch (Exception e) {
      throw new RuntimeException("Canonicalization failed", e);
    }
  }

  public static String formatTabbed(JsonNode node) {
    StringBuilder sb = new StringBuilder();
    formatValue(node, 0, sb);
    return sb.toString();
  }

  private static void formatValue(JsonNode node, int indent, StringBuilder sb) {
    String tabs = "\t".repeat(indent);
    String itabs = "\t".repeat(indent + 1);

    if (node == null || node.isNull()) { sb.append("null"); return; }
    if (node.isBoolean() || node.isNumber()) { sb.append(node.toString()); return; }
    if (node.isTextual()) {
      try { sb.append(mapper().writeValueAsString(node.asText())); }
      catch (Exception e) { sb.append("\"").append(node.asText().replace("\"","\\\"")).append("\""); }
      return;
    }
    if (node.isArray()) {
      ArrayNode arr = (ArrayNode) node;
      if (arr.isEmpty()) { sb.append("[]"); return; }
      sb.append("[\n");
      for (int i=0; i<arr.size(); i++) {
        sb.append(itabs);
        formatValue(arr.get(i), indent+1, sb);
        if (i < arr.size() - 1) sb.append(",");
        sb.append("\n");
      }
      sb.append(tabs).append("]");
      return;
    }
    if (node.isObject()) {
      ObjectNode obj = (ObjectNode) node;
      Iterator<String> it = obj.fieldNames();
      List<String> fields = new ArrayList<>();
      it.forEachRemaining(fields::add);

      if (fields.isEmpty()) { sb.append("{}"); return; }

      if (fields.size() == 1 && "value".equals(fields.get(0))) {
        JsonNode val = obj.get("value");
        if (val == null || val.isNull() || val.isBoolean() || val.isNumber() ||
            (val.isTextual() && val.asText().length() < 100)) {
          sb.append("{\"value\": ");
          formatValue(val, 0, sb);
          sb.append("}");
          return;
        }
      }

      sb.append("{\n");
      for (int i=0; i<fields.size(); i++) {
        String name = fields.get(i);
        sb.append(itabs).append("\"").append(name).append("\": ");
        JsonNode val = obj.get(name);

        if (val != null && val.isObject()) {
          ObjectNode vobj = (ObjectNode) val;
          Iterator<String> fit = vobj.fieldNames();
          List<String> fn = new ArrayList<>();
          fit.forEachRemaining(fn::add);
          if (fn.size() == 1 && "value".equals(fn.get(0))) {
            JsonNode v = vobj.get("value");
            if (v == null || v.isNull() || v.isBoolean() || v.isNumber() ||
                (v.isTextual() && v.asText().length() < 100)) {
              sb.append("{\"value\": ");
              formatValue(v, 0, sb);
              sb.append("}");
            } else {
              formatValue(val, indent+1, sb);
            }
          } else {
            formatValue(val, indent+1, sb);
          }
        } else {
          formatValue(val, indent+1, sb);
        }

        if (i < fields.size() - 1) sb.append(",");
        sb.append("\n");
      }
      sb.append(tabs).append("}");
    }
  }

  public static int countLines(String s) {
    if (s == null || s.isEmpty()) return 0;
    int count = 1;
    for (int i=0; i<s.length(); i++) if (s.charAt(i) == '\n') count++;
    return count;
  }

  public static int countValueKey(String s) {
    if (s == null) return 0;
    int cnt=0, idx=0;
    String needle = "\"value\":";
    while ((idx = s.indexOf(needle, idx)) != -1) { cnt++; idx += needle.length(); }
    return cnt;
  }
}
