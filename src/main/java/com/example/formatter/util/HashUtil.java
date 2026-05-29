package com.example.formatter.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Единая точка вычисления SHA-256 в hex-виде.
 * Ранее этот цикл дублировался в LogService, JsonUtils и XmlUtils — сведён сюда.
 */
public final class HashUtil {

  private HashUtil() {}

  public static String sha256(String text) {
    return sha256(text.getBytes(StandardCharsets.UTF_8));
  }

  public static String sha256(byte[] bytes) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      byte[] digest = md.digest(bytes);
      StringBuilder sb = new StringBuilder(digest.length * 2);
      for (byte b : digest) sb.append(String.format("%02x", b));
      return sb.toString();
    } catch (Exception e) {
      throw new RuntimeException("Unable to compute SHA-256", e);
    }
  }
}
