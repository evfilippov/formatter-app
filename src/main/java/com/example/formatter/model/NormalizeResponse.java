package com.example.formatter.model;

import java.util.List;

public record NormalizeResponse(
  NormalizeStats stats,
  List<NormalizeItem> items,
  NormalizeExport export,
  List<String> warnings,
  List<String> errors
) {}
