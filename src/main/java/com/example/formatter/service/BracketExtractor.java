package com.example.formatter.service;

public class BracketExtractor {
  public static int findJsonEnd(String text, int start) {
    if (start < 0 || start >= text.length() || text.charAt(start) != '{') return -1;
    int braces = 0;
    int squares = 0;
    boolean inString = false;
    boolean escape = false;

    for (int i = start; i < text.length(); i++) {
      char c = text.charAt(i);

      if (escape) { escape = false; continue; }
      if (c == '\\') { escape = true; continue; }
      if (c == '"') { inString = !inString; continue; }

      if (!inString) {
        if (c == '{') braces++;
        else if (c == '}') {
          braces--;
          if (braces == 0 && squares == 0) return i;
        } else if (c == '[') squares++;
        else if (c == ']') squares--;
      }
    }
    return -1;
  }
}
