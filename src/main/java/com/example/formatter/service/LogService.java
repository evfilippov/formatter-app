package com.example.formatter.service;

import com.example.formatter.model.NormalizeExport;
import com.example.formatter.model.NormalizeItem;
import com.example.formatter.model.NormalizeRequest;
import com.example.formatter.model.NormalizeResponse;
import com.example.formatter.model.NormalizeStats;
import com.example.formatter.util.JsonUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class LogService {

  private static final ObjectMapper MAPPER = JsonUtils.mapper();

  // Поля “служебных” логов (фильтр как в Python)
  private static final Set<String> SERVICE_FIELDS = Set.of(
      "timestamp", "threadName", "context", "module",
      "service", "level", "traceId", "spanId"
  );

  // Паттерны ключевых слов (в порядке приоритета)
  private record KeyPattern(String name, Pattern pattern) {}
  private static final List<KeyPattern> ALL_KEY_PATTERNS = List.of(
      new KeyPattern("internalRequest", Pattern.compile("internalRequest\\s*=\\s*\\{", Pattern.CASE_INSENSITIVE)),
      new KeyPattern("externalRequest", Pattern.compile("externalRequest\\s*=\\s*\\{", Pattern.CASE_INSENSITIVE)),
      new KeyPattern("internalResponse", Pattern.compile("internalResponse\\s*=\\s*\\{", Pattern.CASE_INSENSITIVE)),
      new KeyPattern("externalResponse", Pattern.compile("externalResponse\\s*=\\s*\\{", Pattern.CASE_INSENSITIVE)),
      new KeyPattern("request", Pattern.compile("\\brequest\\s*[:=]\\s*\\{", Pattern.CASE_INSENSITIVE)),
      new KeyPattern("response", Pattern.compile("\\bresponse\\s*[:=]\\s*\\{", Pattern.CASE_INSENSITIVE))
  );

  private static final Pattern AFTER_COLON = Pattern.compile(":\\s*(\\{)");

  public NormalizeResponse normalize(NormalizeRequest req) {
    long t0 = System.currentTimeMillis();

    String input = req.input() == null ? "" : req.input();
    int totalInBytes = input.getBytes(StandardCharsets.UTF_8).length;

    // Ограничения по размеру тут уже должны быть, но на всякий:
    // if (totalInBytes > 10 * 1024 * 1024) { ... }

    // Разрешённые паттерны из запроса
    Set<String> enabled = new LinkedHashSet<>();
    if (req.enabledPatterns() != null && !req.enabledPatterns().isEmpty()) {
      for (String s : req.enabledPatterns()) {
        if (s != null) enabled.add(s.trim());
      }
    } else {
      enabled.addAll(List.of("internalRequest","externalRequest","internalResponse","externalResponse","request","response","afterColon"));
    }

    // Парсим лог-записи по алгоритму Python
    List<Entry> entries = parseMultipleLogEntries(input);

    List<NormalizeItem> outItems = new ArrayList<>();
    List<Block> uniqueBlocks = new ArrayList<>();
    Set<String> seenHashes = new LinkedHashSet<>();
    int messageCounter = 0;

    int extractedCount = 0;
    int uniqueCount = 0;
    int dupCount = 0;

    for (Entry entry : entries) {
      String description = extractMessageDescription(entry.content());

      // Спец-фильтр, как в Python
      if (description.startsWith("{\"timestamp\"") || description.startsWith("{\"context\"")) {
        continue;
      }

      String textForPatterns;
      if (entry.type() == Type.JSON) {
        Object obj = entry.content();
        if (obj instanceof ObjectNode on && on.hasNonNull("message")) {
          JsonNode msg = on.get("message");
          textForPatterns = msg.isTextual() ? msg.asText() : msg.toString();
        } else {
          continue;
        }
      } else {
        textForPatterns = String.valueOf(entry.content());
      }

      // НЕ трогаем экранированные кавычки; опционально заменяем \n и \t
      String contentClean = textForPatterns;
      if (Boolean.TRUE.equals(req.replaceEscapedNewlines())) {
        contentClean = contentClean.replace("\\n", "\n").replace("\\t", " ");
      }

      int minLen = req.minAfterColonLength() == null ? 50 : Math.max(0, req.minAfterColonLength());

      LinkedHashMap<String, String> messages = extractAllJsonPatterns(contentClean, enabled, minLen);
      if (messages.isEmpty()) continue;

      for (Map.Entry<String, String> me : messages.entrySet()) {
        extractedCount++;
        messageCounter++;
        String baseKey = me.getKey();
        String uniqueKey = baseKey + "_" + messageCounter;
        String rawJson = me.getValue();

        try {
          JsonNode node = MAPPER.readTree(rawJson);
          if (!node.isObject()) continue;
          ObjectNode obj = (ObjectNode) node;

          // Каноникализация для хеша
          String canonical = JsonUtils.canonicalize(obj);
          String hash = sha256(canonical);

          if (!seenHashes.contains(hash)) {
            seenHashes.add(hash);
            uniqueCount++;

            String pretty = JsonUtils.formatTabbed(obj);
            int lines = JsonUtils.countLines(pretty);
            int valueCount = JsonUtils.countValueKey(pretty);
            int rawLength = rawJson.length();

            // NormalizeItem record порядок полей:
            // (index:int, key:String, number:Integer, description:String, hash:String,
            //  format:String, pretty:String, lines:int, valueCount:int, rawLength:int, duplicateOf:Integer)
            NormalizeItem item = new NormalizeItem(
                messageCounter,
                baseKey,
                Integer.valueOf(uniqueCount),
                description == null || description.isBlank() ? "Без описания" : description,
                hash,
                "json",
                pretty,
                lines,
                valueCount,
                rawLength,
                null
            );
            outItems.add(item);

            uniqueBlocks.add(new Block(uniqueCount, uniqueKey, baseKey, item.description(), pretty));
          } else {
            dupCount++;
            // Дубликаты не добавляем в outItems (как в python-скрипте)
          }
        } catch (Exception ignore) {
          // Некорректный JSON — пропускаем, как в Python
        }
      }
    }

    // Экспортный текст ровно как в Python
    String exportText = buildExport(uniqueBlocks);
    NormalizeExport export = new NormalizeExport(exportText, "output.json");

    NormalizeStats stats = new NormalizeStats(entries.size(), extractedCount, uniqueCount, dupCount, System.currentTimeMillis() - t0);

    return new NormalizeResponse(
        stats,
        outItems,
        export,
        Collections.emptyList(),
        Collections.emptyList()
    );
  }

  // ==================== ВНУТРЕННИЕ МЕТОДЫ (Python-style) ====================

  private enum Type { JSON, TEXT }
  private record Entry(Type type, Object content) {}
  private record Block(int number, String uniqueKey, String baseKey, String description, String pretty) {}

  private List<Entry> parseMultipleLogEntries(String content) {
    List<Entry> list = new ArrayList<>();
    String src = content == null ? "" : content;
    String[] lines = src.strip().split("\\R");
    StringBuilder current = new StringBuilder();

    for (String line : lines) {
      String s = line.trim();
      if (s.isEmpty()) continue;

      if (s.startsWith("{")) {
        if (current.length() > 0) {
          addEntry(list, current.toString());
          current.setLength(0);
        }
        current.append(s);
      } else {
        if (current.length() > 0) current.append(' ').append(s);
        else current.append(s);
      }
    }
    if (current.length() > 0) addEntry(list, current.toString());

    if (list.isEmpty()) list.add(new Entry(Type.TEXT, content));
    return list;
  }

  private void addEntry(List<Entry> list, String raw) {
    try {
      JsonNode n = MAPPER.readTree(raw);
      if (n.isObject()) list.add(new Entry(Type.JSON, (ObjectNode) n));
      else list.add(new Entry(Type.TEXT, raw));
    } catch (Exception e) {
      list.add(new Entry(Type.TEXT, raw));
    }
  }

  private String extractMessageDescription(Object entryContent) {
    try {
      if (entryContent instanceof ObjectNode on) {
        String message = on.hasNonNull("message")
            ? (on.get("message").isTextual() ? on.get("message").asText() : on.get("message").toString())
            : "";
        String messageClean = message.replaceAll("\\s+", " ").trim();

        String[] patterns = new String[] {
            "^(.+?)(?=\\s*[\\[{:])",
            "^(.+?)(?=\\s*(?:internal|external|request|response))"
        };
        for (String p : patterns) {
          Matcher m = Pattern.compile(p, Pattern.CASE_INSENSITIVE).matcher(messageClean);
          if (m.find()) {
            String desc = trimTail(m.group(1));
            if (desc.length() > 150) return desc.substring(0, 147) + "...";
            if (desc.length() > 3) return desc;
          }
        }
        if (messageClean.length() > 100) return messageClean.substring(0, 97) + "...";
        return messageClean.isEmpty() ? "Без описания" : messageClean;

      } else if (entryContent instanceof String s) {
        String messageClean = s.replaceAll("\\s+", " ").trim();
        Matcher m = Pattern.compile("^(.+?)(?=\\s*[\\[{=])").matcher(messageClean);
        if (m.find()) {
          String desc = trimTail(m.group(1));
          if (desc.length() > 100) return desc.substring(0, 97) + "...";
          return desc.isEmpty() ? "Без описания" : desc;
        }
        return "Без описания";
      }
    } catch (Exception ignore) {}
    return "Без описания";
  }

  private String trimTail(String s) {
    if (s == null) return "";
    s = s.trim();
    while (s.endsWith(".") || s.endsWith(",") || s.endsWith(":") || s.endsWith(" ")) {
      s = s.substring(0, s.length() - 1);
    }
    return s.trim();
  }

  private LinkedHashMap<String, String> extractAllJsonPatterns(String content, Set<String> enabled, int minAfterColonLength) {
    LinkedHashMap<String, String> messages = new LinkedHashMap<>();
    if (content == null || content.isEmpty()) return messages;

    String contentClean = content;

    // Приоритет 1: ключевые слова (только разрешённые)
    for (KeyPattern kp : ALL_KEY_PATTERNS) {
      if (!enabled.contains(kp.name())) continue;
      Matcher m = kp.pattern().matcher(contentClean);
      if (m.find()) {
        int jsonStart = m.end() - 1; // позиция '{'
        String json = extractCompleteJson(contentClean.substring(jsonStart));
        if (json != null && json.length() > 10) {
          messages.put(kp.name(), json);
        }
      }
    }

    // Приоритет 2: после двоеточия
    if (messages.isEmpty() && enabled.contains("afterColon")) {
      Matcher m = AFTER_COLON.matcher(contentClean);
      if (m.find()) {
        int jsonStart = m.start(1);
        String json = extractCompleteJson(contentClean.substring(jsonStart));
        if (json != null && json.length() > minAfterColonLength) {
          try {
            JsonNode node = MAPPER.readTree(json);
            if (node.isObject()) {
              int matching = 0;
              Iterator<String> it = node.fieldNames();
              while (it.hasNext()) {
                if (SERVICE_FIELDS.contains(it.next())) matching++;
                if (matching >= 2) break;
              }
              if (matching < 2) {
                messages.put("message_json", json);
              }
            }
          } catch (Exception ignore) { }
        }
      }
    }
    return messages;
  }

  private String extractCompleteJson(String text) {
    if (text == null) return null;
    String s = text.trim();
    if (!s.startsWith("{")) return null;

    int brace = 0, square = 0;
    boolean inString = false, escapeNext = false;
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      if (escapeNext) { escapeNext = false; continue; }
      if (c == '\\') { escapeNext = true; continue; }
      if (c == '\"') { inString = !inString; continue; }
      if (!inString) {
        if (c == '{') brace++;
        else if (c == '}') {
          brace--;
          if (brace == 0 && square == 0) return s.substring(0, i + 1);
        } else if (c == '[') square++;
        else if (c == ']') square--;
      }
    }
    return null;
  }

  private String sha256(String s) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      byte[] dig = md.digest(s.getBytes(StandardCharsets.UTF_8));
      StringBuilder sb = new StringBuilder();
      for (byte b : dig) sb.append(String.format("%02x", b));
      return sb.toString();
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  private String buildExport(List<Block> blocks) {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < blocks.size(); i++) {
      Block b = blocks.get(i);
      if (i == 0) {
        sb.append("/".repeat(70)).append("\n");
        sb.append("// СООБЩЕНИЕ ").append(b.number()).append(": ").append(b.uniqueKey().toUpperCase()).append("\n");
        if (b.description() != null && !b.description().isBlank() && !"Без описания".equals(b.description())) {
          sb.append("// ").append(b.description()).append("\n");
        }
        sb.append("/".repeat(70)).append("\n\n");
      } else {
        sb.append("\n\n").append("/".repeat(70)).append("\n");
        sb.append("// СООБЩЕНИЕ ").append(b.number()).append(": ").append(b.uniqueKey().toUpperCase()).append("\n");
        if (b.description() != null && !b.description().isBlank() && !"Без описания".equals(b.description())) {
          sb.append("// ").append(b.description()).append("\n");
        }
        sb.append("/".repeat(70)).append("\n\n");
      }
      sb.append(b.pretty());
    }
    return sb.toString();
  }
}
