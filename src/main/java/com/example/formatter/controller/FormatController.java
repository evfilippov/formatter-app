package com.example.formatter.controller;

import com.example.formatter.model.*;
import com.example.formatter.service.JsonService;
import com.example.formatter.service.XmlService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/format")
public class FormatController {

  private final JsonService jsonService;
  private final XmlService xmlService;

  public FormatController(JsonService jsonService, XmlService xmlService) {
    this.jsonService = jsonService;
    this.xmlService = xmlService;
  }

  // ------- JSON Body endpoints -------
  @PostMapping(value = "/pretty", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<FormatResponse> pretty(@RequestBody FormatRequest req) {
    return ResponseEntity.ok(dispatch("pretty", req));
  }

  @PostMapping(value = "/minify", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<FormatResponse> minify(@RequestBody FormatRequest req) {
    return ResponseEntity.ok(dispatch("minify", req));
  }

  @PostMapping(value = "/validate", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<FormatResponse> validate(@RequestBody FormatRequest req) {
    return ResponseEntity.ok(dispatch("validate", req));
  }

  // ------- Multipart endpoints (file upload) -------
  @PostMapping(value = "/pretty", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<FormatResponse> prettyFile(
      @RequestParam("type") String type,
      @RequestParam("file") MultipartFile file,
      @RequestParam(value = "escapeForJson", required = false) Boolean escapeForJson,
      @RequestParam(value = "unescapeFromJson", required = false) Boolean unescapeFromJson,
      @RequestParam(value = "keepXmlDeclaration", required = false) Boolean keepXmlDeclaration
  ) throws Exception {
    return ResponseEntity.ok(dispatch("pretty", buildFromFile(type, file, escapeForJson, unescapeFromJson, keepXmlDeclaration)));
  }

  @PostMapping(value = "/minify", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<FormatResponse> minifyFile(
      @RequestParam("type") String type,
      @RequestParam("file") MultipartFile file,
      @RequestParam(value = "escapeForJson", required = false) Boolean escapeForJson,
      @RequestParam(value = "unescapeFromJson", required = false) Boolean unescapeFromJson,
      @RequestParam(value = "keepXmlDeclaration", required = false) Boolean keepXmlDeclaration
  ) throws Exception {
    return ResponseEntity.ok(dispatch("minify", buildFromFile(type, file, escapeForJson, unescapeFromJson, keepXmlDeclaration)));
  }

  @PostMapping(value = "/validate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<FormatResponse> validateFile(
      @RequestParam("type") String type,
      @RequestParam("file") MultipartFile file,
      @RequestParam(value = "escapeForJson", required = false) Boolean escapeForJson,
      @RequestParam(value = "unescapeFromJson", required = false) Boolean unescapeFromJson,
      @RequestParam(value = "keepXmlDeclaration", required = false) Boolean keepXmlDeclaration
  ) throws Exception {
    return ResponseEntity.ok(dispatch("validate", buildFromFile(type, file, escapeForJson, unescapeFromJson, keepXmlDeclaration)));
  }

@PostMapping(value = "/wrap", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
public ResponseEntity<FormatResponse> wrapValues(@RequestBody FormatRequest req) {
    if (!"json".equalsIgnoreCase(req.type())) {
        return ResponseEntity.ok(new FormatResponse(null, null, List.of(), 
            List.of("Wrap values только для JSON"), null));
    }
    return ResponseEntity.ok(jsonService.wrapValues(req));
}

@PostMapping(value = "/unwrap", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
public ResponseEntity<FormatResponse> unwrapValues(@RequestBody FormatRequest req) {
    if (!"json".equalsIgnoreCase(req.type())) {
        return ResponseEntity.ok(new FormatResponse(null, null, List.of(), 
            List.of("Unwrap values только для JSON"), null));
    }
    return ResponseEntity.ok(jsonService.unwrapValues(req));
}

// Также добавьте multipart версии:
@PostMapping(value = "/wrap", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
public ResponseEntity<FormatResponse> wrapValuesFile(
    @RequestParam("type") String type,
    @RequestParam("file") MultipartFile file
) throws Exception {
    if (!"json".equalsIgnoreCase(type)) {
        return ResponseEntity.ok(new FormatResponse(null, null, List.of(), 
            List.of("Wrap values только для JSON"), null));
    }
    String input = new String(file.getBytes(), StandardCharsets.UTF_8);
    return ResponseEntity.ok(jsonService.wrapValues(new FormatRequest("json", input, null)));
}

@PostMapping(value = "/unwrap", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
public ResponseEntity<FormatResponse> unwrapValuesFile(
    @RequestParam("type") String type,
    @RequestParam("file") MultipartFile file
) throws Exception {
    if (!"json".equalsIgnoreCase(type)) {
        return ResponseEntity.ok(new FormatResponse(null, null, List.of(), 
            List.of("Unwrap values только для JSON"), null));
    }
    String input = new String(file.getBytes(), StandardCharsets.UTF_8);
    return ResponseEntity.ok(jsonService.unwrapValues(new FormatRequest("json", input, null)));
}

  private FormatRequest buildFromFile(String type, MultipartFile file, Boolean escape, Boolean unescape, Boolean decl) throws Exception {
    String input = new String(file.getBytes(), StandardCharsets.UTF_8);
    FormatOptions opts = new FormatOptions(escape, unescape, decl);
    return new FormatRequest(type, input, opts);
  }

  private FormatResponse dispatch(String op, FormatRequest req) {
    String type = (req.type() == null ? "" : req.type()).toLowerCase().trim();
    switch (type) {
      case "json" -> {
        return switch (op) {
          case "pretty" -> jsonService.pretty(req);
          case "minify" -> jsonService.minify(req);
          case "validate" -> jsonService.validate(req);
          default -> new FormatResponse(null, null, List.of(), List.of("Unsupported operation"), null);
        };
      }
      case "xml" -> {
        return switch (op) {
          case "pretty" -> xmlService.pretty(req);
          case "minify" -> xmlService.minify(req);
          case "validate" -> xmlService.validate(req);
          default -> new FormatResponse(null, null, List.of(), List.of("Unsupported operation"), null);
        };
      }
      default -> {
        return new FormatResponse(null, null, List.of(), List.of("Unsupported type: " + type), null);
      }
    }
  }
}
