package com.example.formatter.service;

import com.example.formatter.model.FormatRequest;
import com.example.formatter.model.FormatResponse;
import com.example.formatter.model.Stats;
import com.example.formatter.util.JsonUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Service
public class JsonService {

  public FormatResponse pretty(FormatRequest req) {
    long t0 = System.currentTimeMillis();
    List<String> warnings = new ArrayList<>();
    List<String> errors = new ArrayList<>();

    String input = req.input() == null ? "" : req.input();
    int inBytes = input.getBytes(StandardCharsets.UTF_8).length;
    String output = null;
    try {
      JsonNode node = JsonUtils.parse(input);
      output = JsonUtils.formatTabbed(node);
    } catch (JsonProcessingException e) {
      errors.add("JSON parse error: " + e.getMessage());
    } catch (Exception e) {
      errors.add("Unexpected: " + e.getMessage());
    }
    int outBytes = output == null ? 0 : output.getBytes(StandardCharsets.UTF_8).length;
    long dur = System.currentTimeMillis() - t0;
    return new FormatResponse(output, new Stats(inBytes, outBytes, dur), warnings, errors);
  }

  public FormatResponse minify(FormatRequest req) {
    long t0 = System.currentTimeMillis();
    List<String> warnings = new ArrayList<>();
    List<String> errors = new ArrayList<>();

    String input = req.input() == null ? "" : req.input();
    int inBytes = input.getBytes(StandardCharsets.UTF_8).length;
    String output = null;
    try {
      JsonNode node = JsonUtils.parse(input);
      output = JsonUtils.mapper().writeValueAsString(node);
    } catch (JsonProcessingException e) {
      errors.add("JSON parse error: " + e.getMessage());
    } catch (Exception e) {
      errors.add("Unexpected: " + e.getMessage());
    }
    int outBytes = output == null ? 0 : output.getBytes(StandardCharsets.UTF_8).length;
    long dur = System.currentTimeMillis() - t0;
    return new FormatResponse(output, new Stats(inBytes, outBytes, dur), warnings, errors);
  }

  public FormatResponse validate(FormatRequest req) {
    long t0 = System.currentTimeMillis();
    List<String> warnings = new ArrayList<>();
    List<String> errors = new ArrayList<>();

    String input = req.input() == null ? "" : req.input();
    int inBytes = input.getBytes(StandardCharsets.UTF_8).length;
    try {
      JsonUtils.parse(input);
    } catch (JsonProcessingException e) {
      errors.add("JSON parse error: " + e.getMessage());
    } catch (Exception e) {
      errors.add("Unexpected: " + e.getMessage());
    }
    long dur = System.currentTimeMillis() - t0;
    return new FormatResponse(null, new Stats(inBytes, 0, dur), warnings, errors);
  }
}
