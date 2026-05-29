package com.example.formatter.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.List;

/**
 * Единая обработка непойманных исключений API.
 *
 * <p>Срабатывает только на исключениях, вышедших из контроллеров (некорректное тело запроса,
 * превышение размера загрузки, непредвиденные ошибки). Штатные ошибки форматирования/валидации
 * по-прежнему возвращаются сервисами в поле {@code errors} ответа — это поведение не меняется.
 *
 * <p>Раньше такие исключения уходили в дефолтный обработчик Spring (голый 500 без читаемого текста)
 * и нигде не логировались. Теперь возвращается структурированный JSON с полем {@code errors}
 * (его уже умеет читать фронтенд), а стектрейс пишется в лог.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

  /** Тело ошибки в том же духе, что FormatResponse: фронт читает поле errors. */
  public record ApiError(List<String> errors) {}

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ApiError> handleUnreadable(HttpMessageNotReadableException e) {
    log.warn("Некорректное тело запроса: {}", e.getMostSpecificCause().toString());
    return ResponseEntity.badRequest()
        .body(new ApiError(List.of("Некорректный формат запроса: " + e.getMostSpecificCause().getMessage())));
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  public ResponseEntity<ApiError> handleTooLarge(MaxUploadSizeExceededException e) {
    log.warn("Превышен размер загрузки: {}", e.toString());
    return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
        .body(new ApiError(List.of("Файл слишком большой (лимит 10 МБ)")));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiError> handleGeneric(Exception e) {
    log.error("Непредвиденная ошибка обработки запроса", e);
    return ResponseEntity.internalServerError()
        .body(new ApiError(List.of("Внутренняя ошибка сервера")));
  }
}
