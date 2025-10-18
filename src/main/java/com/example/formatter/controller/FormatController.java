package com.example.formatter.controller;

import com.example.formatter.model.FormatRequest;
import com.example.formatter.model.FormatResponse;
import com.example.formatter.service.JsonService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/format")
public class FormatController {

  private final JsonService jsonService;

  public FormatController(JsonService jsonService) {
    this.jsonService = jsonService;
  }

  @PostMapping(value = "/pretty", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<FormatResponse> pretty(@RequestBody FormatRequest req) {
    if (!"json".equalsIgnoreCase(req.type())) {
      return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
        .body(new FormatResponse(null, null, null, java.util.List.of("Only JSON supported in MVP")));
    }
    return ResponseEntity.ok(jsonService.pretty(req));
  }

  @PostMapping(value = "/minify", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<FormatResponse> minify(@RequestBody FormatRequest req) {
    if (!"json".equalsIgnoreCase(req.type())) {
      return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
        .body(new FormatResponse(null, null, null, java.util.List.of("Only JSON supported in MVP")));
    }
    return ResponseEntity.ok(jsonService.minify(req));
  }

  @PostMapping(value = "/validate", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<FormatResponse> validate(@RequestBody FormatRequest req) {
    if (!"json".equalsIgnoreCase(req.type())) {
      return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
        .body(new FormatResponse(null, null, null, java.util.List.of("Only JSON supported in MVP")));
    }
    return ResponseEntity.ok(jsonService.validate(req));
  }
}
