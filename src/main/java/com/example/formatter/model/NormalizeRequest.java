package com.example.formatter.model;

import java.util.List;

public record NormalizeRequest(
  String input,
  Boolean replaceEscapedNewlines,
  List<String> enabledPatterns,
  Integer minAfterColonLength
) {}
