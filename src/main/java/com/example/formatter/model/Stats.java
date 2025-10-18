package com.example.formatter.model;

public record Stats(
  int inputBytes,
  int outputBytes,
  long durationMs
) {}
