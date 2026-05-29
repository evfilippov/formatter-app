package com.example.formatter.controller;

import com.example.formatter.service.JsonService;
import com.example.formatter.service.XmlService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Проверяет, что глобальный обработчик возвращает структурированный 400 с полем errors
 * при некорректном теле запроса (раньше это был «голый» 500).
 */
@WebMvcTest(controllers = FormatController.class)
class ApiExceptionHandlerTest {

  @Autowired
  private MockMvc mvc;

  @MockBean
  private JsonService jsonService;
  @MockBean
  private XmlService xmlService;

  @Test
  void malformedJsonBody_returns400WithErrors() throws Exception {
    mvc.perform(post("/api/format/pretty")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{ это не валидный json"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors").isArray());
  }
}
