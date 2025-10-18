package com.example.formatter.controller;

import com.example.formatter.model.NormalizeRequest;
import com.example.formatter.model.NormalizeResponse;
import com.example.formatter.service.LogService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/logs")
public class LogsController {

  private final LogService logService;

  public LogsController(LogService logService) {
    this.logService = logService;
  }

  @PostMapping(value = "/normalize", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
  public NormalizeResponse normalize(@RequestBody NormalizeRequest req) {
    return logService.normalize(req);
  }
}
