package com.example.formatter.service;

import com.example.formatter.model.NormalizeExport;
import com.example.formatter.model.NormalizeItem;
import com.example.formatter.model.NormalizeRequest;
import com.example.formatter.model.NormalizeResponse;
import com.example.formatter.model.NormalizeStats;
import com.example.formatter.util.HashUtil;
import com.example.formatter.util.JsonBalancer;
import com.example.formatter.util.JsonUtils;
import com.example.formatter.util.UniversalJsonExtractor;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class LogService {

  private static final Logger log = LoggerFactory.getLogger(LogService.class);
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
    new KeyPattern("response", Pattern.compile("\\bresponse\\s*[:=]\\s*\\{", Pattern.CASE_INSENSITIVE)),
    new KeyPattern("args", Pattern.compile("args\\s*=\\s*\\[\\s*\\{", Pattern.CASE_INSENSITIVE))  // ← НОВЫЙ ПАТТЕРН
);


  private static final Pattern AFTER_COLON = Pattern.compile(":\\s*(\\{)");

  public NormalizeResponse normalize(NormalizeRequest req) {
    long t0 = System.currentTimeMillis();

    String input = req.input() == null ? "" : req.input();
    Set<String> enabled = resolveEnabledPatterns(req);
    int minLen = req.minAfterColonLength() == null ? 50 : Math.max(0, req.minAfterColonLength());

    // Парсим лог-записи по алгоритму Python
    List<Entry> entries = parseMultipleLogEntries(input);

    Acc acc = new Acc();
    for (Entry entry : entries) {
      processEntry(entry, req, enabled, minLen, acc);
    }

    // Экспортный текст ровно как в Python
    String exportText = buildExport(acc.blocks);
    NormalizeExport export = new NormalizeExport(exportText, "output.json");

    NormalizeStats stats = new NormalizeStats(
        entries.size(), acc.extracted, acc.unique, acc.duplicates, System.currentTimeMillis() - t0);

    return new NormalizeResponse(
        stats,
        acc.items,
        export,
        Collections.emptyList(),
        Collections.emptyList()
    );
  }

  /** Разрешённые паттерны из запроса; при отсутствии — набор по умолчанию. */
  private Set<String> resolveEnabledPatterns(NormalizeRequest req) {
    Set<String> enabled = new LinkedHashSet<>();
    if (req.enabledPatterns() != null && !req.enabledPatterns().isEmpty()) {
      for (String s : req.enabledPatterns()) {
        if (s != null) enabled.add(s.trim());
      }
    } else {
      enabled.addAll(List.of("internalRequest","externalRequest","internalResponse","externalResponse","request","response","afterColon"));
    }
    return enabled;
  }

  /** Обрабатывает одну лог-запись: фильтрация, извлечение паттернов, накопление результата. */
  private void processEntry(Entry entry, NormalizeRequest req, Set<String> enabled, int minLen, Acc acc) {
    String description = extractMessageDescription(entry.content());

    // Спец-фильтр, как в Python
    if (description.startsWith("{\"timestamp\"") || description.startsWith("{\"context\"")) {
      return;
    }

    String textForPatterns = resolveTextForPatterns(entry);
    if (textForPatterns == null) return;

    // НЕ трогаем экранированные кавычки; опционально заменяем \n и \t
    String contentClean = textForPatterns;
    if (Boolean.TRUE.equals(req.replaceEscapedNewlines())) {
      contentClean = contentClean.replace("\\n", "\n").replace("\\t", " ");
    }

    LinkedHashMap<String, String> messages = extractAllJsonPatterns(contentClean, enabled, minLen);
    if (messages.isEmpty()) return;

    for (Map.Entry<String, String> me : messages.entrySet()) {
      addExtractedMessage(me.getKey(), me.getValue(), description, acc);
    }
  }

  /** Текст, по которому ищем паттерны: message у JSON-записи (иначе пропуск), либо сырой текст. */
  private String resolveTextForPatterns(Entry entry) {
    if (entry.type() == Type.JSON) {
      Object obj = entry.content();
      if (obj instanceof ObjectNode on && on.hasNonNull("message")) {
        JsonNode msg = on.get("message");
        return msg.isTextual() ? msg.asText() : msg.toString();
      }
      return null; // JSON-запись без поля message — пропускаем
    }
    return String.valueOf(entry.content());
  }

  /** Каноникализация → хеш → дедупликация → формирование item/block. Счётчики ведёт acc. */
  private void addExtractedMessage(String baseKey, String rawJson, String description, Acc acc) {
    acc.extracted++;
    acc.messageCounter++;
    String uniqueKey = baseKey + "_" + acc.messageCounter;

    try {
      JsonNode node = MAPPER.readTree(rawJson);
      if (!node.isObject()) return;
      ObjectNode obj = (ObjectNode) node;

      // Каноникализация для хеша
      String canonical = JsonUtils.canonicalize(obj);
      String hash = HashUtil.sha256(canonical);

      if (acc.seenHashes.contains(hash)) {
        acc.duplicates++;
        // Дубликаты не добавляем в items (как в python-скрипте)
        return;
      }
      acc.seenHashes.add(hash);
      acc.unique++;

      String pretty = JsonUtils.formatTabbed(obj);
      int lines = JsonUtils.countLines(pretty);
      int valueCount = JsonUtils.countValueKey(pretty);
      int rawLength = rawJson.length();

      // NormalizeItem record порядок полей:
      // (index:int, key:String, number:Integer, description:String, hash:String,
      //  format:String, pretty:String, lines:int, valueCount:int, rawLength:int, duplicateOf:Integer)
      NormalizeItem item = new NormalizeItem(
          acc.messageCounter,
          baseKey,
          Integer.valueOf(acc.unique),
          description == null || description.isBlank() ? "Без описания" : description,
          hash,
          "json",
          pretty,
          lines,
          valueCount,
          rawLength,
          null
      );
      acc.items.add(item);

      acc.blocks.add(new Block(acc.unique, uniqueKey, baseKey, item.description(), pretty));
    } catch (Exception e) {
      // Некорректный JSON — пропускаем намеренно (как в Python). Лог для диагностики.
      log.debug("Пропущен некорректный JSON-блок при нормализации: {}", e.toString());
    }
  }

  // ==================== ВНУТРЕННИЕ МЕТОДЫ (Python-style) ====================

  private enum Type { JSON, TEXT }
  private record Entry(Type type, Object content) {}
  private record Block(int number, String uniqueKey, String baseKey, String description, String pretty) {}

  /** Изменяемый аккумулятор результата нормализации (списки, дедуп-хеши, счётчики). */
  private static final class Acc {
    final List<NormalizeItem> items = new ArrayList<>();
    final List<Block> blocks = new ArrayList<>();
    final Set<String> seenHashes = new LinkedHashSet<>();
    int messageCounter = 0;
    int extracted = 0;
    int unique = 0;
    int duplicates = 0;
  }

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
    } catch (Exception e) {
      log.debug("Не удалось извлечь описание сообщения: {}", e.toString());
    }
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
        String json = JsonBalancer.extractCompleteJson(contentClean.substring(jsonStart));
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
        String json = JsonBalancer.extractCompleteJson(contentClean.substring(jsonStart));
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
          } catch (Exception e) {
            log.debug("Пропущен JSON после двоеточия (afterColon): {}", e.toString());
          }
        }
      }
    }
        // Приоритет 3: НОВЫЙ универсальный поиск (если паттерны не сработали)
    if (messages.isEmpty()) {
      // Пробуем извлечь из args=
      if (enabled.contains("args")) {
        String argsJson = UniversalJsonExtractor.extractFromArgs(contentClean);
        if (argsJson != null) {
          messages.put("args", argsJson);
          return messages;
        }
      }
      
      // Fallback: ищем JSON в любом месте (если включен afterColon)
      if (enabled.contains("afterColon")) {
        List<String> foundJsons = UniversalJsonExtractor.findAllJsonInText(contentClean);
        for (int i = 0; i < foundJsons.size(); i++) {
          String json = foundJsons.get(i);
          if (json.length() > minAfterColonLength) {
            messages.put("found_json_" + (i + 1), json);
          }
        }
      }
    }
    return messages;
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
