package com.example.formatter.model;

public record FormatOptions(
  Boolean escapeForJson,       // для XML minify/pretty → экранировать для JSON-строки
  Boolean unescapeFromJson,    // для XML входа → снять экранирование JSON
  Boolean keepXmlDeclaration   // сохранять XML декларацию; по умолчанию true
) {
  public static FormatOptions defaults() {
    return new FormatOptions(false, false, true);
  }
}
