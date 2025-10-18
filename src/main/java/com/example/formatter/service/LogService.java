package com.example.formatter.service;

import com.example.formatter.model.*;
import com.example.formatter.util.HashUtil;
import com.example.formatter.util.JsonUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class LogService {

  public NormalizeResponse normalize(NormalizeRequest req) {
    long t0 = System.currentTimeMillis();
    List<String> warnings = new ArrayList<>();
    List<String> errors = new ArrayList<>();

    String input = Optional.ofNullable(req.input()).orElse("");
    boolean repl = Optional.ofNullable(req.replaceEscapedNewlines()).orElse(Boolean.TRUE);
    List<String> enabled = Optional.ofNullable(req.enabledPatterns()).orElse(
      List.of("internalRequest","externalRequest","internalResponse","externalResponse","request","response","afterColon")
    );
    int minAfterColon = Optional.ofNullable(req.minAfterColonLength()).orElse(50);

    List<ObjectNode> entries = LogExtractor.parseEntries(input);
    int totalEntries = entries.size();

    List<LogExtractor.Extracted> extracted = new ArrayList<>();
    for (ObjectNode e : entries) {
      extracted.addAll(LogExtractor.extractFromMessage(e, enabled, repl, minAfterColon));
    }

    List<NormalizeItem> items = new ArrayList<>();
    Map<String, Integer> firstIndexByHash = new LinkedHashMap<>();   // hash -> индекс первого
    Map<String, Integer> uniqueOrderByHash = new LinkedHashMap<>();  // hash -> порядковый номер сообщения
    int globalIndex = 0;
    int uniqueCounter = 0;

    for (LogExtractor.Extracted ex : extracted) {
      globalIndex++;
      try {
        JsonNode node = JsonUtils.parse(ex.rawJson());
        String canonical = JsonUtils.canonicalize(node);
        String hash = HashUtil.sha256(canonical);

        Integer duplicateOf = null;
        Integer number;
        if (!uniqueOrderByHash.containsKey(hash)) {
          uniqueCounter++;
          uniqueOrderByHash.put(hash, uniqueCounter);
          firstIndexByHash.put(hash, globalIndex);
          number = uniqueCounter;
        } else {
          number = uniqueOrderByHash.get(hash);
          duplicateOf = firstIndexByHash.get(hash);
        }

        String pretty = JsonUtils.formatTabbed(node);
        int lines = JsonUtils.countLines(pretty);
        int valueCount = JsonUtils.countValueKey(pretty);
        int rawLength = ex.rawJson().length();

        items.add(new NormalizeItem(
          globalIndex, ex.key(), number, ex.description(), hash, "json",
          pretty, lines, valueCount, rawLength, duplicateOf
        ));
      } catch (Exception e) {
        errors.add("Parse error at message index " + globalIndex + ": " + e.getMessage());
      }
    }

    // Уникальные в порядке message number
    List<NormalizeItem> uniqueItemsOrdered = items.stream()
      .filter(i -> i.duplicateOf() == null)
      .sorted(Comparator.comparing(NormalizeItem::number))
      .collect(Collectors.toList());

    String exportText = buildExport(uniqueItemsOrdered);

    NormalizeStats stats = new NormalizeStats(
      totalEntries,
      extracted.size(),
      uniqueItemsOrdered.size(),
      extracted.size() - uniqueItemsOrdered.size(),
      System.currentTimeMillis() - t0
    );
    NormalizeExport export = new NormalizeExport(exportText, "output.json");
    return new NormalizeResponse(stats, items, export, warnings, errors);
  }

  private String buildExport(List<NormalizeItem> uniqueItems) {
    StringBuilder sb = new StringBuilder();
    for (int i=0; i<uniqueItems.size(); i++) {
      NormalizeItem it = uniqueItems.get(i);
      String sep = LogExtractor.buildSeparator(it.number(), it.key(), it.description(), i==0);
      sb.append(sep);
      sb.append(it.pretty());
    }
    return sb.toString();
  }
}
