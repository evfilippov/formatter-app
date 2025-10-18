package com.example.formatter.model;

public record FormatRequest(
  String type,       // "json" | "xml"
  String input,
  FormatOptions options
) {}
