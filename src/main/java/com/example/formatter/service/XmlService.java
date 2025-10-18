package com.example.formatter.service;

import com.example.formatter.model.FormatOptions;
import com.example.formatter.model.FormatRequest;
import com.example.formatter.model.FormatResponse;
import com.example.formatter.model.Integrity;
import com.example.formatter.model.Stats;
import com.example.formatter.util.XmlUtils;
import org.w3c.dom.Document;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Service
public class XmlService {

  // Pretty: DOM/Transformer (читабельно, без лишних пустых строк)
  public FormatResponse pretty(FormatRequest req) {
    long t0 = System.currentTimeMillis();
    List<String> warnings = new ArrayList<>();
    List<String> errors = new ArrayList<>();
    Integrity integrity = null;

    String input = req.input() == null ? "" : req.input();
    FormatOptions ops = req.options() == null ? FormatOptions.defaults() : req.options();

    if (Boolean.TRUE.equals(ops.unescapeFromJson())) {
      try { input = XmlUtils.jsonUnescape(input); }
      catch (Exception e) { errors.add("Unescape from JSON failed: " + e.getMessage()); }
    }

    String output = null;
    try {
      final String standalone = XmlUtils.detectStandaloneFromProlog(input);
      Document inDoc = XmlUtils.parseSecure(input);

      String prettyXml = XmlUtils.pretty(input, ops.keepXmlDeclaration() == null ? true : ops.keepXmlDeclaration(), standalone);
      Document outDoc = XmlUtils.parseSecure(prettyXml);

      String hInStrict = XmlUtils.structuralHashStrict(inDoc);
      String hOutStrict = XmlUtils.structuralHashStrict(outDoc);
      String hInNorm = XmlUtils.structuralHashNormalized(inDoc);
      String hOutNorm = XmlUtils.structuralHashNormalized(outDoc);
      integrity = new Integrity(hInStrict.equals(hOutStrict), hInNorm.equals(hOutNorm), hInNorm, hOutNorm);

      output = Boolean.TRUE.equals(ops.escapeForJson()) ? XmlUtils.escapeDoubleQuotesOnly(prettyXml) : prettyXml;

    } catch (Exception e) {
      errors.add("XML error: " + e.getMessage());
    }

    int inBytes = input.getBytes(StandardCharsets.UTF_8).length;
    int outBytes = output == null ? 0 : output.getBytes(StandardCharsets.UTF_8).length;
    long dur = System.currentTimeMillis() - t0;
    return new FormatResponse(output, new Stats(inBytes, outBytes, dur), warnings, errors, integrity);
  }

  // Minify: PYTHON-СТИЛЬ (одна строка, удаление комментов, схлопывание пробелов, экранирование кавычек)
  public FormatResponse minify(FormatRequest req) {
    long t0 = System.currentTimeMillis();
    List<String> warnings = new ArrayList<>();
    List<String> errors = new ArrayList<>();
    Integrity integrity = null;

    String input = req.input() == null ? "" : req.input();
    FormatOptions ops = req.options() == null ? FormatOptions.defaults() : req.options();

    if (Boolean.TRUE.equals(ops.unescapeFromJson())) {
      try { input = XmlUtils.jsonUnescape(input); }
      catch (Exception e) { errors.add("Unescape from JSON failed: " + e.getMessage()); }
    }

    String output = null;
    try {
      // Для целостности берём DOM исходника (well-formedness)
      Document inDoc = XmlUtils.parseSecure(input);

      // Python-style однострочное представление (с учётом keepXmlDeclaration)
      boolean keepDecl = ops.keepXmlDeclaration() == null ? true : ops.keepXmlDeclaration();
      String oneLine = XmlUtils.pythonStyleOneLine(input, keepDecl);

      // Целостность: сравним с DOM из oneLine БЕЗ экранирования
      Document outDoc = XmlUtils.parseSecure(oneLine);
      String hInStrict = XmlUtils.structuralHashStrict(inDoc);
      String hOutStrict = XmlUtils.structuralHashStrict(outDoc);
      String hInNorm = XmlUtils.structuralHashNormalized(inDoc);
      String hOutNorm = XmlUtils.structuralHashNormalized(outDoc);
      integrity = new Integrity(hInStrict.equals(hOutStrict), hInNorm.equals(hOutNorm), hInNorm, hOutNorm);

      // Предупреждение, если normalized отличается: python-алгоритм схлопывает пробелы внутри текстов и удаляет комментарии
      if (!integrity.equalNormalized()) {
        warnings.add("Внимание: python-style minify удаляет комментарии и схлопывает пробелы в текстовых узлах — normalized-хеш отличается.");
      }

      // Экранируем КАВЫЧКИ (как в python), если требуется JSON-строка
      output = Boolean.TRUE.equals(ops.escapeForJson()) ? XmlUtils.escapeDoubleQuotesOnly(oneLine) : oneLine;

    } catch (Exception e) {
      errors.add("XML error: " + e.getMessage());
    }

    int inBytes = input.getBytes(StandardCharsets.UTF_8).length;
    int outBytes = output == null ? 0 : output.getBytes(StandardCharsets.UTF_8).length;
    long dur = System.currentTimeMillis() - t0;
    return new FormatResponse(output, new Stats(inBytes, outBytes, dur), warnings, errors, integrity);
  }

  public FormatResponse validate(FormatRequest req) {
    long t0 = System.currentTimeMillis();
    List<String> warnings = new ArrayList<>();
    List<String> errors = new ArrayList<>();

    String input = req.input() == null ? "" : req.input();
    FormatOptions ops = req.options() == null ? FormatOptions.defaults() : req.options();
    if (Boolean.TRUE.equals(ops.unescapeFromJson())) {
      try { input = XmlUtils.jsonUnescape(input); }
      catch (Exception e) { errors.add("Unescape from JSON failed: " + e.getMessage()); }
    }

    try {
      XmlUtils.parseSecure(input);
    } catch (Exception e) {
      errors.add("XML parse error: " + e.getMessage());
    }
    int inBytes = input.getBytes(StandardCharsets.UTF_8).length;
    long dur = System.currentTimeMillis() - t0;
    return new FormatResponse(null, new Stats(inBytes, 0, dur), warnings, errors, null);
  }
}
