package com.example.formatter.model;

import java.util.List;

public record FormatResponse(
  String output,
  Stats stats,
  List<String> warnings,
  List<String> errors,
  Integrity integrity // может быть null (например, validate)
) {}
