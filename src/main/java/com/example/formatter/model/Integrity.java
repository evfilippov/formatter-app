package com.example.formatter.model;

public record Integrity(
  boolean equalStrict,        // строгое равенство структур (учитывая текст/комменты)
  boolean equalNormalized,    // равенство после нормализации пробелов/комментариев
  String inputHash,           // хеш входной структуры
  String outputHash           // хеш выходной структуры
) {}
