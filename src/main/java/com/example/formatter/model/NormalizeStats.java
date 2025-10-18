package com.example.formatter.model;

public record NormalizeStats(
  int totalEntries,
  int extracted,
  int unique,
  int duplicates,
  long durationMs
) {}
