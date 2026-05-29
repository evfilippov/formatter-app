package com.example.formatter.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Универсальный экстрактор JSON из любых логов.
 * Поддерживает:
 * - args=[...]
 * - Экранированные JSON (с \")
 * - Автоисправление невалидных JSON
 * - Поиск JSON в любом месте текста
 */
public class UniversalJsonExtractor {

  private static final ObjectMapper MAPPER = new ObjectMapper();
  
  // Паттерн для args=[...]
  private static final Pattern ARGS_PATTERN = Pattern.compile(
      "args\\s*=\\s*\\[\\s*\\{", 
      Pattern.CASE_INSENSITIVE
  );

  /**
   * Извлекает JSON из args=[{...}]
   */
  public static String extractFromArgs(String content) {
    if (content == null || content.isEmpty()) return null;
    
    Matcher m = ARGS_PATTERN.matcher(content);
    if (m.find()) {
      int start = m.end() - 1; // позиция '{'
      String extracted = JsonBalancer.extractCompleteJson(content.substring(start));
      
      if (extracted != null) {
        // Деэкранируем если нужно
        extracted = unescapeIfNeeded(extracted);
        // Исправляем невалидный JSON
        extracted = fixInvalidJson(extracted);
        
        return extracted;
      }
    }
    
    return null;
  }

  /**
   * Ищет JSON в любом месте текста (fallback)
   */
  public static List<String> findAllJsonInText(String content) {
    List<String> results = new ArrayList<>();
    if (content == null || content.isEmpty()) return results;
    
    // Деэкранируем весь контент для поиска
    String unescaped = unescapeIfNeeded(content);
    
    // Ищем все позиции '{'
    for (int i = 0; i < unescaped.length(); i++) {
      if (unescaped.charAt(i) == '{') {
        String json = JsonBalancer.extractCompleteJson(unescaped.substring(i));
        if (json != null && json.length() > 50) {
          json = fixInvalidJson(json);
          if (isValidJson(json)) {
            results.add(json);
          }
        }
      }
    }
    
    return results;
  }

  /**
   * Деэкранирует JSON: \" → "
   */
  private static String unescapeIfNeeded(String text) {
    if (text == null) return null;
    
    // Проверяем, есть ли экранированные кавычки
    if (!text.contains("\\\"")) return text;
    
    // Деэкранируем
    return text
        .replace("\\\"", "\"")
        .replace("\\n", "\n")
        .replace("\\t", "\t")
        .replace("\\\\", "\\");
  }

  /**
   * Исправляет частые ошибки в JSON
   */
  private static String fixInvalidJson(String json) {
    if (json == null) return null;
    
    String fixed = json.trim();
    
    // Проблема 1: Лишние закрывающие скобки в конце
    // Например: ...}]] → ...}]
    while (fixed.matches(".*\\}\\]\\]+$")) {
      // Проверяем баланс скобок
      int openBraces = countChar(fixed, '{');
      int closeBraces = countChar(fixed, '}');
      int openBrackets = countChar(fixed, '[');
      int closeBrackets = countChar(fixed, ']');
      
      // Если закрывающих ] больше, чем открывающих
      if (closeBrackets > openBrackets) {
        fixed = fixed.substring(0, fixed.lastIndexOf(']'));
      } else {
        break;
      }
    }
    
    // Проблема 2: Лишние закрывающие }
    while (fixed.matches(".*\\}\\}+$")) {
      int openBraces = countChar(fixed, '{');
      int closeBraces = countChar(fixed, '}');
      
      if (closeBraces > openBraces) {
        fixed = fixed.substring(0, fixed.lastIndexOf('}'));
      } else {
        break;
      }
    }
    
    return fixed;
  }

  /**
   * Проверяет, валидный ли JSON
   */
  private static boolean isValidJson(String json) {
    if (json == null || json.isEmpty()) return false;
    try {
      JsonNode node = MAPPER.readTree(json);
      return node.isObject();
    } catch (Exception e) {
      return false;
    }
  }

  /**
   * Считает количество символов в строке
   */
  private static int countChar(String s, char c) {
    int count = 0;
    boolean inString = false;
    boolean escapeNext = false;
    
    for (int i = 0; i < s.length(); i++) {
      char ch = s.charAt(i);
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (ch == '\\') {
        escapeNext = true;
        continue;
      }
      
      if (ch == '\"') {
        inString = !inString;
        continue;
      }
      
      if (!inString && ch == c) {
        count++;
      }
    }
    
    return count;
  }
}
