package com.example.formatter.service;

import com.example.formatter.util.JsonUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class LogExtractor {

  private static final List<String> DEFAULT_PATTERNS = List.of(
    "internalRequest","externalRequest","internalResponse","externalResponse","request","response","afterColon"
  );

  private static final Set<String> SERVICE_LOG_FIELDS = Set.of(
    "timestamp","threadName","context","module","service","level","traceId","spanId"
  );

  private static final Map<String, Pattern> KEY_PATTERNS = Map.of(
    "internalRequest", Pattern.compile("internalRequest\\s*[:=]\\s*\\{", Pattern.CASE_INSENSITIVE),
    "externalRequest", Pattern.compile("externalRequest\\s*[:=]\\s*\\{", Pattern.CASE_INSENSITIVE),
    "internalResponse", Pattern.compile("internalResponse\\s*[:=]\\s*\\{", Pattern.CASE_INSENSITIVE),
    "externalResponse", Pattern.compile("externalResponse\\s*[:=]\\s*\\{", Pattern.CASE_INSENSITIVE),
    "request", Pattern.compile("\\brequest\\s*[:=]\\s*\\{", Pattern.CASE_INSENSITIVE),
    "response", Pattern.compile("\\bresponse\\s*[:=]\\s*\\{", Pattern.CASE_INSENSITIVE)
  );

  public record Extracted(String key, String rawJson, String description) {}

  public static List<ObjectNode> parseEntries(String input) {
    List<ObjectNode> entries = new ArrayList<>();
    String[] lines = input.replace("\r\n", "\n").split("\n", -1);
    StringBuilder buf = new StringBuilder();

    for (String line : lines) {
      if (line.trim().isEmpty()) continue;
      if (buf.length() > 0) buf.append("\n");
      buf.append(line);
      try {
        JsonNode node = JsonUtils.parse(buf.toString());
        if (node != null && node.isObject()) {
          entries.add((ObjectNode) node);
          buf.setLength(0);
        }
      } catch (JsonProcessingException ignore) {}
    }
    if (buf.length() > 0) {
      try {
        JsonNode node = JsonUtils.parse(buf.toString());
        if (node != null && node.isObject()) entries.add((ObjectNode) node);
      } catch (JsonProcessingException ignore) {}
    }
    return entries;
  }

  public static List<Extracted> extractFromMessage(ObjectNode entry,
                                                   List<String> enabledPatterns,
                                                   boolean replaceEscapedNewlines,
                                                   int minAfterColonLen) {
    List<Extracted> out = new ArrayList<>();
    if (entry == null || entry.get("message") == null) return out;

    String message = entry.get("message").asText();
    String clean = message;
    if (replaceEscapedNewlines) {
      clean = clean.replace("\\n", "\n").replace("\\t", " ");
    }

    String description = extractDescription(message);

    for (String key : DEFAULT_PATTERNS) {
      if (!enabledPatterns.contains(key)) continue;
      if ("afterColon".equals(key)) continue;

      Pattern p = KEY_PATTERNS.get(key);
      if (p == null) continue;
      Matcher m = p.matcher(clean);
      if (m.find()) {
        int start = m.end() - 1;
        int end = BracketExtractor.findJsonEnd(clean, start);
        if (end > start) {
          String json = clean.substring(start, end+1);
          if (json.length() > 10 && isValidJson(json)) {
            out.add(new Extracted(key, json, description));
          }
        }
      }
    }

    if (enabledPatterns.contains("afterColon") && out.isEmpty()) {
      Matcher m = Pattern.compile(":\\s*\\{").matcher(clean);
      if (m.find()) {
        int start = m.end()-1;
        int end = BracketExtractor.findJsonEnd(clean, start);
        if (end > start) {
          String json = clean.substring(start, end+1);
          if (json.length() >= minAfterColonLen && isValidJson(json)) {
            try {
              JsonNode n = JsonUtils.parse(json);
              if (n.isObject()) {
                int matches = 0;
                Iterator<String> it = n.fieldNames();
                while (it.hasNext()) if (SERVICE_LOG_FIELDS.contains(it.next())) matches++;
                if (matches < 2) out.add(new Extracted("message_json", json, description));
              }
            } catch (Exception ignore) {}
          }
        }
      }
    }

    return out;
  }

  private static boolean isValidJson(String json) {
    try { JsonUtils.parse(json); return true; }
    catch (Exception e) { return false; }
  }

  private static String extractDescription(String message) {
    if (message == null) return "Без описания";
    String s = message.replaceAll("\\s+", " ").trim();
    var m = Pattern.compile("^(.+?)(?=\\s*[\\[\\{]|\\s*(?:internal|external|request|response))", Pattern.CASE_INSENSITIVE).matcher(s);
    String desc = null;
    if (m.find()) desc = m.group(1).trim().replaceAll("[\\.,: ]+$","");
    if (desc == null || desc.isEmpty()) {
      m = Pattern.compile("^(.+?)(?=\\s*[\\{\\[])", Pattern.CASE_INSENSITIVE).matcher(s);
      if (m.find()) desc = m.group(1).trim().replaceAll("[\\.,: ]+$","");
    }
    if (desc == null || desc.isEmpty()) desc = s.length() > 100 ? s.substring(0,97)+"..." : s;
    if (desc.length() > 150) desc = desc.substring(0,147) + "...";
    return desc.isEmpty() ? "Без описания" : desc;
  }

  public static String buildSeparator(int number, String key, String description, boolean first) {
    String line = "/".repeat(70) + "\n";
    StringBuilder sb = new StringBuilder();
    if (first) {
      sb.append(line);
      sb.append("// СООБЩЕНИЕ ").append(number).append(": ").append(key.toUpperCase()).append("\n");
      if (description != null && !description.equals("Без описания")) sb.append("// ").append(description).append("\n");
      sb.append(line).append("\n\n");
    } else {
      sb.append("\n\n").append(line);
      sb.append("// СООБЩЕНИЕ ").append(number).append(": ").append(key.toUpperCase()).append("\n");
      if (description != null && !description.equals("Без описания")) sb.append("// ").append(description).append("\n");
      sb.append(line).append("\n\n");
    }
    return sb.toString();
  }
}
