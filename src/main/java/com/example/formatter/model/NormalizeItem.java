package com.example.formatter.model;

public record NormalizeItem(
  int index,
  String key,
  Integer number,
  String description,
  String hash,
  String format,
  String pretty,
  int lines,
  int valueCount,
  int rawLength,
  Integer duplicateOf
) {}
