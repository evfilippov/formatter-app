package com.example.formatter.util;

/**
 * Единый «балансировщик скобок» для извлечения первого полного JSON-объекта из текста.
 *
 * <p>Ранее эта логика дублировалась в нескольких местах (LogService, UniversalJsonExtractor,
 * а также в удалённом BracketExtractor). Реализации были идентичны; сведены сюда,
 * чтобы исправления делались в одном месте.
 *
 * <p>Алгоритм посимвольно считает баланс {@code { }} и {@code [ ]}, корректно игнорируя
 * скобки внутри строковых литералов и экранированные символы.
 */
public final class JsonBalancer {

  private JsonBalancer() {}

  /**
   * Возвращает подстроку с первым полным JSON-объектом, начинающимся с {@code '{'}.
   *
   * <p>Текст предварительно обрезается ({@code trim}) и должен начинаться с {@code '{'},
   * иначе возвращается {@code null}. Содержимое после закрывающей скобки отбрасывается.
   * Если объект не сбалансирован — возвращается {@code null}.
   *
   * @param text исходный текст (ожидается, что вызывающий уже спозиционировался на '{')
   * @return полный JSON-объект как строка, либо {@code null}
   */
  public static String extractCompleteJson(String text) {
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
}
