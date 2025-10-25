package com.example.formatter.service.graphql;

import com.example.formatter.model.graphql.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.*;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@Service
public class GraphQLIntrospectionService {
    
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    
    private final OkHttpClient httpClient = new OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build();
    
    // Стандартный introspection query
    private static final String INTROSPECTION_QUERY = """
        query IntrospectionQuery {
          __schema {
            queryType { name }
            mutationType { name }
            subscriptionType { name }
            types {
              ...FullType
            }
            directives {
              name
              description
              locations
              args {
                ...InputValue
              }
            }
          }
        }
        
        fragment FullType on __Type {
          kind
          name
          description
          fields(includeDeprecated: true) {
            name
            description
            args {
              ...InputValue
            }
            type {
              ...TypeRef
            }
            isDeprecated
            deprecationReason
          }
          inputFields {
            ...InputValue
          }
          interfaces {
            ...TypeRef
          }
          enumValues(includeDeprecated: true) {
            name
            description
            isDeprecated
            deprecationReason
          }
          possibleTypes {
            ...TypeRef
          }
        }
        
        fragment InputValue on __InputValue {
          name
          description
          type { ...TypeRef }
          defaultValue
        }
        
        fragment TypeRef on __Type {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                    ofType {
                      kind
                      name
                      ofType {
                        kind
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
    """;
    
    public IntrospectionResponse introspect(IntrospectionRequest request) {
        try {
            String endpoint = request.getEndpoint();
            
            // Выполняем introspection запрос
            String response = executeIntrospection(endpoint, request.getHeaders());
            
            // Парсим ответ
            JsonNode responseJson = MAPPER.readTree(response);
            
            if (responseJson.has("errors")) {
                return new IntrospectionResponse(
                    null,
                    "Introspection failed: " + responseJson.get("errors").toString(),
                    false
                );
            }
            
            // Конвертируем introspection result в SDL схему
            String sdlSchema = convertToSDL(responseJson.get("data").get("__schema"));
            
            return new IntrospectionResponse(
                sdlSchema,
                "Introspection successful",
                true
            );
        } catch (Exception e) {
            return new IntrospectionResponse(
                null,
                "Introspection error: " + e.getMessage(),
                false
            );
        }
    }
    
    private String executeIntrospection(String endpoint, java.util.Map<String, String> headers) throws IOException {
        // Создаем тело запроса
        String requestBody = MAPPER.writeValueAsString(
            java.util.Map.of("query", INTROSPECTION_QUERY)
        );
        
        // Создаем HTTP запрос
        Request.Builder requestBuilder = new Request.Builder()
            .url(endpoint)
            .post(RequestBody.create(requestBody, JSON));
        
        // Добавляем заголовки
        if (headers != null) {
            headers.forEach(requestBuilder::addHeader);
        }
        
        Request request = requestBuilder.build();
        
        // Выполняем запрос
        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Unexpected response code: " + response);
            }
            
            return response.body().string();
        }
    }
    
    private String convertToSDL(JsonNode schemaNode) {
        StringBuilder sdl = new StringBuilder();
        
        // Обрабатываем типы
        JsonNode types = schemaNode.get("types");
        
        // Сначала обрабатываем Query и Mutation
        for (JsonNode type : types) {
            String name = type.get("name").asText();
            if (name.equals("Query") || name.equals("Mutation") || name.equals("Subscription")) {
                generateTypeFromIntrospection(type, sdl);
            }
        }
        
        // Затем обрабатываем пользовательские типы
        for (JsonNode type : types) {
            String name = type.get("name").asText();
            // Пропускаем встроенные типы
            if (!name.startsWith("__") && !isBuiltinScalar(name) && 
                !name.equals("Query") && !name.equals("Mutation") && !name.equals("Subscription")) {
                generateTypeFromIntrospection(type, sdl);
            }
        }
        
        return sdl.toString();
    }
    
    private void generateTypeFromIntrospection(JsonNode type, StringBuilder sdl) {
        String kind = type.get("kind").asText();
        String name = type.get("name").asText();
        
        switch (kind) {
            case "OBJECT":
                sdl.append("type ").append(name);
                
                // Interfaces
                JsonNode interfaces = type.get("interfaces");
                if (interfaces != null && interfaces.size() > 0) {
                    sdl.append(" implements ");
                    for (int i = 0; i < interfaces.size(); i++) {
                        if (i > 0) sdl.append(" & ");
                        sdl.append(interfaces.get(i).get("name").asText());
                    }
                }
                
                sdl.append(" {\n");
                
                // Fields
                JsonNode fields = type.get("fields");
                if (fields != null) {
                    for (JsonNode field : fields) {
                        generateField(field, sdl);
                    }
                }
                
                sdl.append("}\n\n");
                break;
                
            case "INPUT_OBJECT":
                sdl.append("input ").append(name).append(" {\n");
                
                JsonNode inputFields = type.get("inputFields");
                if (inputFields != null) {
                    for (JsonNode field : inputFields) {
                        generateInputField(field, sdl);
                    }
                }
                
                sdl.append("}\n\n");
                break;
                
            case "ENUM":
                sdl.append("enum ").append(name).append(" {\n");
                
                JsonNode enumValues = type.get("enumValues");
                if (enumValues != null) {
                    for (JsonNode value : enumValues) {
                        sdl.append("  ").append(value.get("name").asText());
                        
                        if (value.has("isDeprecated") && value.get("isDeprecated").asBoolean()) {
                            sdl.append(" @deprecated");
                            if (value.has("deprecationReason")) {
                                sdl.append("(reason: \"")
                                   .append(value.get("deprecationReason").asText())
                                   .append("\")");
                            }
                        }
                        
                        sdl.append("\n");
                    }
                }
                
                sdl.append("}\n\n");
                break;
                
            case "SCALAR":
                sdl.append("scalar ").append(name).append("\n\n");
                break;
                
            case "INTERFACE":
                sdl.append("interface ").append(name).append(" {\n");
                
                JsonNode interfaceFields = type.get("fields");
                if (interfaceFields != null) {
                    for (JsonNode field : interfaceFields) {
                        generateField(field, sdl);
                    }
                }
                
                sdl.append("}\n\n");
                break;
                
            case "UNION":
                sdl.append("union ").append(name).append(" = ");
                
                JsonNode possibleTypes = type.get("possibleTypes");
                if (possibleTypes != null) {
                    for (int i = 0; i < possibleTypes.size(); i++) {
                        if (i > 0) sdl.append(" | ");
                        sdl.append(possibleTypes.get(i).get("name").asText());
                    }
                }
                
                sdl.append("\n\n");
                break;
        }
    }
    
    private void generateField(JsonNode field, StringBuilder sdl) {
        sdl.append("  ").append(field.get("name").asText());
        
        // Arguments
        JsonNode args = field.get("args");
        if (args != null && args.size() > 0) {
            sdl.append("(");
            for (int i = 0; i < args.size(); i++) {
                if (i > 0) sdl.append(", ");
                JsonNode arg = args.get(i);
                sdl.append(arg.get("name").asText())
                   .append(": ")
                   .append(getTypeString(arg.get("type")));
            }
            sdl.append(")");
        }
        
        sdl.append(": ").append(getTypeString(field.get("type")));
        
        // Deprecation
        if (field.has("isDeprecated") && field.get("isDeprecated").asBoolean()) {
            sdl.append(" @deprecated");
            if (field.has("deprecationReason")) {
                sdl.append("(reason: \"")
                   .append(field.get("deprecationReason").asText())
                   .append("\")");
            }
        }
        
        sdl.append("\n");
    }
    
    private void generateInputField(JsonNode field, StringBuilder sdl) {
        sdl.append("  ").append(field.get("name").asText())
           .append(": ")
           .append(getTypeString(field.get("type")));
        
        // Default value
        if (field.has("defaultValue") && !field.get("defaultValue").isNull()) {
            sdl.append(" = ").append(field.get("defaultValue").asText());
        }
        
        sdl.append("\n");
    }
    
    private String getTypeString(JsonNode typeNode) {
        String kind = typeNode.get("kind").asText();
        
        switch (kind) {
            case "NON_NULL":
                return getTypeString(typeNode.get("ofType")) + "!";
            case "LIST":
                return "[" + getTypeString(typeNode.get("ofType")) + "]";
            default:
                return typeNode.get("name").asText();
        }
    }
    
    private boolean isBuiltinScalar(String name) {
        return name.equals("String") || 
               name.equals("Int") || 
               name.equals("Float") || 
               name.equals("Boolean") || 
               name.equals("ID");
    }
}
