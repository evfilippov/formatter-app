package com.example.formatter.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

  // Список разрешённых origin берётся из конфигурации (app.cors.allowed-origins).
  // По умолчанию — только локальная разработка. На проде задаётся явно через property/переменную окружения.
  @Value("${app.cors.allowed-origins:http://localhost:8080,http://127.0.0.1:8080}")
  private String[] allowedOrigins;

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**")
      .allowedOrigins(allowedOrigins)
      .allowedMethods("GET","POST","OPTIONS")
      .allowedHeaders("*");
  }
}
