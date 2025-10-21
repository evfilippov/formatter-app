package com.example.formatter.service;

import com.example.formatter.model.*;
import com.example.formatter.util.JsonUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Iterator;

@Service
public class JsonService {

  private static final ObjectMapper MAPPER = JsonUtils.mapper();
  private static final JsonNodeFactory NODE_FACTORY = JsonNodeFactory.instance;

  public FormatResponse pretty(FormatRequest req) {
    long t0 = System.currentTimeMillis();
    List<String> warnings = new ArrayList<>();
    List<String> errors = new ArrayList<>();
    Integrity integrity = null;

    String input = req.input() == null ? "" : req.input();
    int inBytes = input.getBytes(StandardCharsets.UTF_8).length;
    String output = null;
    try {
      JsonNode inNode = JsonUtils.parse(input);
      output = JsonUtils.formatTabbed(inNode);
      JsonNode outNode = JsonUtils.parse(output);
      integrity = new Integrity(
        true, // strict: парсили и сериализовали без потерь структуры
        true,
        JsonUtils.canonicalHash(inNode),
        JsonUtils.canonicalHash(outNode)
      );
    } catch (JsonProcessingException e) {
      errors.add("JSON parse error: " + e.getMessage());
    } catch (Exception e) {
      errors.add("Unexpected: " + e.getMessage());
    }
    int outBytes = output == null ? 0 : output.getBytes(StandardCharsets.UTF_8).length;
    long dur = System.currentTimeMillis() - t0;
    return new FormatResponse(output, new Stats(inBytes, outBytes, dur), warnings, errors, integrity);
  }

  public FormatResponse minify(FormatRequest req) {
    long t0 = System.currentTimeMillis();
    List<String> warnings = new ArrayList<>();
    List<String> errors = new ArrayList<>();
    Integrity integrity = null;

    String input = req.input() == null ? "" : req.input();
    int inBytes = input.getBytes(StandardCharsets.UTF_8).length;
    String output = null;
    try {
      JsonNode inNode = JsonUtils.parse(input);
      output = JsonUtils.mapper().writeValueAsString(inNode);
      JsonNode outNode = JsonUtils.parse(output);
      integrity = new Integrity(
        true, true,
        JsonUtils.canonicalHash(inNode),
        JsonUtils.canonicalHash(outNode)
      );
    } catch (JsonProcessingException e) {
      errors.add("JSON parse error: " + e.getMessage());
    } catch (Exception e) {
      errors.add("Unexpected: " + e.getMessage());
    }
    int outBytes = output == null ? 0 : output.getBytes(StandardCharsets.UTF_8).length;
    long dur = System.currentTimeMillis() - t0;
    return new FormatResponse(output, new Stats(inBytes, outBytes, dur), warnings, errors, integrity);
  }

  public FormatResponse validate(FormatRequest req) {
    long t0 = System.currentTimeMillis();
    List<String> warnings = new ArrayList<>();
    List<String> errors = new ArrayList<>();

    String input = req.input() == null ? "" : req.input();
    int inBytes = input.getBytes(StandardCharsets.UTF_8).length;
    try {
      JsonUtils.parse(input);
    } catch (JsonProcessingException e) {
      errors.add("JSON parse error: " + e.getMessage());
    } catch (Exception e) {
      errors.add("Unexpected: " + e.getMessage());
    }
    long dur = System.currentTimeMillis() - t0;
    return new FormatResponse(null, new Stats(inBytes, 0, dur), warnings, errors, null);
  }

  /**
   * Оборачивает все простые значения в {"value": ...}
   */
  public FormatResponse wrapValues(FormatRequest req) {
    long t0 = System.currentTimeMillis();
    List<String> warnings = new ArrayList<>();
    List<String> errors = new ArrayList<>();
    Integrity integrity = null;

    String input = req.input() == null ? "" : req.input();
    int inBytes = input.getBytes(StandardCharsets.UTF_8).length;
    String output = null;
    
    try {
      JsonNode inNode = MAPPER.readTree(input);
      JsonNode wrappedNode = wrapNode(inNode);
      
      // Специальное форматирование с компактными value объектами
      output = formatWithCompactValues(wrappedNode);
      
      JsonNode outNode = MAPPER.readTree(output);
      integrity = new Integrity(
        false, // структура изменилась
        true,  // но данные те же
        JsonUtils.canonicalHash(inNode),
        JsonUtils.canonicalHash(outNode)
      );
      
    } catch (JsonProcessingException e) {
      errors.add("JSON parse error: " + e.getMessage());
    } catch (Exception e) {
      errors.add("Unexpected: " + e.getMessage());
    }
    
    int outBytes = output == null ? 0 : output.getBytes(StandardCharsets.UTF_8).length;
    long dur = System.currentTimeMillis() - t0;
    return new FormatResponse(output, new Stats(inBytes, outBytes, dur), warnings, errors, integrity);
  }

  /**
   * Разворачивает {"value": ...} обратно в простые значения
   */
  public FormatResponse unwrapValues(FormatRequest req) {
    long t0 = System.currentTimeMillis();
    List<String> warnings = new ArrayList<>();
    List<String> errors = new ArrayList<>();
    Integrity integrity = null;

    String input = req.input() == null ? "" : req.input();
    int inBytes = input.getBytes(StandardCharsets.UTF_8).length;
    String output = null;
    
    try {
      JsonNode inNode = MAPPER.readTree(input);
      JsonNode unwrappedNode = unwrapNode(inNode);
      output = JsonUtils.formatTabbed(unwrappedNode);
      
      JsonNode outNode = MAPPER.readTree(output);
      integrity = new Integrity(
        false, // структура изменилась
        true,  // но данные те же
        JsonUtils.canonicalHash(inNode),
        JsonUtils.canonicalHash(outNode)
      );
      
    } catch (JsonProcessingException e) {
      errors.add("JSON parse error: " + e.getMessage());
    } catch (Exception e) {
      errors.add("Unexpected: " + e.getMessage());
    }
    
    int outBytes = output == null ? 0 : output.getBytes(StandardCharsets.UTF_8).length;
    long dur = System.currentTimeMillis() - t0;
    return new FormatResponse(output, new Stats(inBytes, outBytes, dur), warnings, errors, integrity);
  }

  /**
   * Рекурсивно оборачивает все простые значения в {"value": ...}
   */
  private JsonNode wrapNode(JsonNode node) {
    if (node == null || node.isNull()) {
      return node;
    }
    
    if (node.isObject()) {
      ObjectNode wrapped = NODE_FACTORY.objectNode();
      Iterator<String> fieldNames = node.fieldNames();
      
      while (fieldNames.hasNext()) {
        String fieldName = fieldNames.next();
        JsonNode fieldValue = node.get(fieldName);
        
        if (fieldValue.isObject() || fieldValue.isArray()) {
          // Рекурсивно обрабатываем вложенные объекты и массивы
          wrapped.set(fieldName, wrapNode(fieldValue));
        } else {
          // Простое значение - оборачиваем в {"value": ...}
          ObjectNode valueWrapper = NODE_FACTORY.objectNode();
          valueWrapper.set("value", fieldValue);
          wrapped.set(fieldName, valueWrapper);
        }
      }
      return wrapped;
      
    } else if (node.isArray()) {
      ArrayNode wrapped = NODE_FACTORY.arrayNode();
      for (JsonNode item : node) {
        wrapped.add(wrapNode(item));
      }
      return wrapped;
    }
    
    return node;
  }

  /**
   * Рекурсивно разворачивает {"value": ...} в простые значения
   */
  private JsonNode unwrapNode(JsonNode node) {
    if (node == null || node.isNull()) {
      return node;
    }
    
    if (node.isObject()) {
      ObjectNode unwrapped = NODE_FACTORY.objectNode();
      Iterator<String> fieldNames = node.fieldNames();
      
      while (fieldNames.hasNext()) {
        String fieldName = fieldNames.next();
        JsonNode fieldValue = node.get(fieldName);
        
        // Проверяем, является ли это {"value": ...} паттерном
        if (fieldValue.isObject() && 
            fieldValue.size() == 1 && 
            fieldValue.has("value")) {
          // Разворачиваем
          unwrapped.set(fieldName, fieldValue.get("value"));
        } else if (fieldValue.isObject() || fieldValue.isArray()) {
          // Рекурсивно обрабатываем вложенные структуры
          unwrapped.set(fieldName, unwrapNode(fieldValue));
        } else {
          // Оставляем как есть
          unwrapped.set(fieldName, fieldValue);
        }
      }
      return unwrapped;
      
    } else if (node.isArray()) {
      ArrayNode unwrapped = NODE_FACTORY.arrayNode();
      for (JsonNode item : node) {
        unwrapped.add(unwrapNode(item));
      }
      return unwrapped;
    }
    
    return node;
  }

  /**
   * Форматирует JSON с компактными value объектами в одну строку
   */
  private String formatWithCompactValues(JsonNode node) throws JsonProcessingException {
    String json = MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(node);
    
    // Заменяем многострочные {"value": ...} на однострочные
    json = json.replaceAll("\\{\\s*\\n\\s*\"value\"\\s*:\\s*(.+?)\\n\\s*\\}", "{\"value\": $1}");
    
    // Убираем лишние пробелы в пустых value
    json = json.replaceAll("\\{\"value\":\\s+\"\"\\}", "{\"value\": \"\"}");
    json = json.replaceAll("\\{\"value\":\\s+null\\}", "{\"value\": null}");
    
    return json;
  }
}
