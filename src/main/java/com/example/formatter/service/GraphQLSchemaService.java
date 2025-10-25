package com.example.formatter.service.graphql;

import com.example.formatter.model.graphql.*;
import graphql.language.*;
import graphql.parser.Parser;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

@Service
public class GraphQLSchemaService {
    
    private static final Pattern INT_PATTERN = Pattern.compile("^-?\\d+$");
    private static final Pattern FLOAT_PATTERN = Pattern.compile("^-?\\d+\\.\\d+$");
    private static final Pattern BOOL_PATTERN = Pattern.compile("^(true|false)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern DATE_PATTERN = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}");
    private static final Pattern DATETIME_PATTERN = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}");
    
    // Хранилище для обнаруженных типов
    private Map<String, TypeInfo> discoveredTypes = new HashMap<>();
    private Map<String, Set<String>> enumCandidates = new HashMap<>();
    private Set<String> commonTypes = new HashSet<>();
    
    public SchemaResponse generateSchemaFromQuery(GraphQLRequest request) {
        try {
            String query = request.getQuery();
            Document document = Parser.parse(query);
            
            discoveredTypes.clear();
            enumCandidates.clear();
            commonTypes.clear();
            
            StringBuilder schema = new StringBuilder();
            
            // Анализируем все операции
            for (Definition definition : document.getDefinitions()) {
                if (definition instanceof OperationDefinition) {
                    analyzeOperation((OperationDefinition) definition);
                }
            }
            
            // Генерируем схему
            generateSchemaTypes(schema);
            
            return new SchemaResponse(
                schema.toString(),
                "Schema generated successfully",
                true,
                discoveredTypes.size(),
                enumCandidates.size()
            );
        } catch (Exception e) {
            return new SchemaResponse(
                null,
                "Schema generation error: " + e.getMessage(),
                false,
                0,
                0
            );
        }
    }
    
    private void analyzeOperation(OperationDefinition op) {
        String operationType = op.getOperation().toString();
        
        // Создаем корневой тип (Query/Mutation)
        TypeInfo rootType = discoveredTypes.computeIfAbsent(
            operationType.substring(0, 1).toUpperCase() + operationType.substring(1).toLowerCase(),
            k -> new TypeInfo(k, "type", new LinkedHashMap<>())
        );
        
        // Анализируем поля операции
        for (Selection selection : op.getSelectionSet().getSelections()) {
            if (selection instanceof Field) {
                Field field = (Field) selection;
                analyzeField(field, rootType, op.getName());
            }
        }
    }
    
    private void analyzeField(Field field, TypeInfo parentType, String operationName) {
        String fieldName = field.getName();
        
        // Определяем тип поля
        String fieldType = inferFieldType(field, operationName);
        
        // Обрабатываем аргументы
        if (!field.getArguments().isEmpty()) {
            String inputTypeName = generateInputTypeName(operationName, fieldName);
            TypeInfo inputType = analyzeArguments(field.getArguments(), inputTypeName);
            fieldType = fieldName + "(" + "input: " + inputTypeName + "!): " + fieldType;
        } else {
            fieldType = fieldName + ": " + fieldType;
        }
        
        parentType.fields.put(fieldName, fieldType);
        
        // Если есть подвыборка, создаем новый тип
        if (field.getSelectionSet() != null) {
            String typeName = generateTypeName(operationName, fieldName);
            TypeInfo newType = discoveredTypes.computeIfAbsent(
                typeName,
                k -> new TypeInfo(k, "type", new LinkedHashMap<>())
            );
            
            for (Selection subSelection : field.getSelectionSet().getSelections()) {
                if (subSelection instanceof Field) {
                    analyzeField((Field) subSelection, newType, operationName);
                }
            }
        }
    }
    
    private TypeInfo analyzeArguments(List<Argument> arguments, String inputTypeName) {
        TypeInfo inputType = discoveredTypes.computeIfAbsent(
            inputTypeName,
            k -> new TypeInfo(k, "input", new LinkedHashMap<>())
        );
        
        for (Argument arg : arguments) {
            String argName = arg.getName();
            String argType = inferValueType(arg.getValue());
            inputType.fields.put(argName, argName + ": " + argType);
        }
        
        return inputType;
    }
    
    private String inferFieldType(Field field, String operationName) {
        if (field.getSelectionSet() != null) {
            // Есть подвыборка - это объект
            return generateTypeName(operationName, field.getName());
        } else {
            // Простое поле - пытаемся определить тип
            return "String"; // По умолчанию
        }
    }
    
    private String inferValueType(Value value) {
        if (value instanceof StringValue) {
            String str = ((StringValue) value).getValue();
            return detectStringType(str);
        } else if (value instanceof IntValue) {
            return "Int";
        } else if (value instanceof FloatValue) {
            return "Float";
        } else if (value instanceof BooleanValue) {
            return "Boolean";
        } else if (value instanceof NullValue) {
            return "String"; // nullable по умолчанию
        } else if (value instanceof ObjectValue) {
            return analyzeObjectValue((ObjectValue) value);
        } else if (value instanceof ArrayValue) {
            return "[" + inferArrayElementType((ArrayValue) value) + "]";
        }
        return "String";
    }
    
    private String detectStringType(String value) {
        if (value == null || value.isEmpty()) return "String";
        
        if (INT_PATTERN.matcher(value).matches()) return "Int";
        if (FLOAT_PATTERN.matcher(value).matches()) return "Float";
        if (BOOL_PATTERN.matcher(value).matches()) return "Boolean";
        if (DATETIME_PATTERN.matcher(value).matches()) return "DateTime";
        if (DATE_PATTERN.matcher(value).matches()) return "Date";
        
        // Проверяем на потенциальный enum
        if (value.matches("^[A-Z][A-Z_0-9]*$")) {
            enumCandidates.computeIfAbsent("PossibleEnum", k -> new HashSet<>()).add(value);
            return "String"; // Пока как String, позже можем конвертировать в enum
        }
        
        return "String";
    }
    
    private String analyzeObjectValue(ObjectValue obj) {
        // Проверяем паттерн { value: ... }
        List<ObjectField> fields = obj.getObjectFields();
        if (fields.size() == 1 && fields.get(0).getName().equals("value")) {
            String innerType = inferValueType(fields.get(0).getValue());
            
            // Проверяем, не встречали ли мы этот тип раньше
            String wrapperTypeName = innerType + "Value";
            if (!commonTypes.contains(wrapperTypeName)) {
                commonTypes.add(wrapperTypeName);
                discoveredTypes.put(wrapperTypeName, new TypeInfo(
                    wrapperTypeName,
                    "input",
                    Map.of("value", "value: " + innerType)
                ));
            }
            return wrapperTypeName;
        }
        
        // Сложный объект - создаем новый тип
        String typeName = "Input" + UUID.randomUUID().toString().substring(0, 8);
        TypeInfo newType = new TypeInfo(typeName, "input", new LinkedHashMap<>());
        
        for (ObjectField field : fields) {
            String fieldType = inferValueType(field.getValue());
            newType.fields.put(field.getName(), field.getName() + ": " + fieldType);
        }
        
        discoveredTypes.put(typeName, newType);
        return typeName;
    }
    
    private String inferArrayElementType(ArrayValue array) {
        if (array.getValues().isEmpty()) return "String";
        
        // Берем тип первого элемента
        return inferValueType(array.getValues().get(0));
    }
    
    private String generateTypeName(String operationName, String fieldName) {
        String base = operationName != null ? 
            capitalize(operationName) + capitalize(fieldName) : 
            capitalize(fieldName);
        return base + "Response";
    }
    
    private String generateInputTypeName(String operationName, String fieldName) {
        String base = operationName != null ? 
            capitalize(operationName) + capitalize(fieldName) : 
            capitalize(fieldName);
        return base + "Input";
    }
    
    private void generateSchemaTypes(StringBuilder schema) {
        // Сначала генерируем корневые типы (Query, Mutation)
        for (Map.Entry<String, TypeInfo> entry : discoveredTypes.entrySet()) {
            TypeInfo type = entry.getValue();
            if (type.name.equals("Query") || type.name.equals("Mutation")) {
                schema.append(type.kind).append(" ").append(type.name).append(" {\n");
                for (String field : type.fields.values()) {
                    schema.append("  ").append(field).append("\n");
                }
                schema.append("}\n\n");
            }
        }
        
        // Генерируем общие типы (ValueOutput, InfoOutput и т.д.)
        generateCommonTypes(schema);
        
        // Генерируем Response типы
        for (Map.Entry<String, TypeInfo> entry : discoveredTypes.entrySet()) {
            TypeInfo type = entry.getValue();
            if (type.name.endsWith("Response") && !type.name.equals("Query") && !type.name.equals("Mutation")) {
                schema.append("type ").append(type.name).append(" {\n");
                for (String field : type.fields.values()) {
                    schema.append("  ").append(field).append("\n");
                }
                schema.append("}\n\n");
            }
        }
        
        // Генерируем Input типы
        for (Map.Entry<String, TypeInfo> entry : discoveredTypes.entrySet()) {
            TypeInfo type = entry.getValue();
            if (type.kind.equals("input")) {
                schema.append("input ").append(type.name).append(" {\n");
                for (String field : type.fields.values()) {
                    schema.append("  ").append(field).append("\n");
                }
                schema.append("}\n\n");
            }
        }
        
        // Генерируем enum типы если обнаружены
        if (!enumCandidates.isEmpty()) {
            for (Map.Entry<String, Set<String>> entry : enumCandidates.entrySet()) {
                if (entry.getValue().size() > 1) {  // Enum только если больше одного значения
                    schema.append("enum ").append(entry.getKey()).append(" {\n");
                    for (String value : entry.getValue()) {
                        schema.append("  ").append(value).append("\n");
                    }
                    schema.append("}\n\n");
                }
            }
        }
    }
    
    private void generateCommonTypes(StringBuilder schema) {
        // Стандартные типы для всех схем
        if (!discoveredTypes.containsKey("ValueOutput")) {
            schema.append("type ValueOutput {\n");
            schema.append("  value: String\n");
            schema.append("}\n\n");
        }
        
        if (!discoveredTypes.containsKey("StringValue")) {
            schema.append("input StringValue {\n");
            schema.append("  value: String\n");
            schema.append("}\n\n");
        }
        
        if (!discoveredTypes.containsKey("IntValue")) {
            schema.append("input IntValue {\n");
            schema.append("  value: Int\n");
            schema.append("}\n\n");
        }
        
        if (!discoveredTypes.containsKey("BooleanValue")) {
            schema.append("input BooleanValue {\n");
            schema.append("  value: Boolean\n");
            schema.append("}\n\n");
        }
    }
    
    private String capitalize(String str) {
        if (str == null || str.isEmpty()) return str;
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }
    
    // Класс для хранения информации о типе
    private static class TypeInfo {
        String name;
        String kind; // "type" или "input"
        Map<String, String> fields;
        
        TypeInfo(String name, String kind, Map<String, String> fields) {
            this.name = name;
            this.kind = kind;
            this.fields = fields;
        }
    }
    
    // Метод для генерации запроса из схемы
    public GraphQLResponse generateQueryFromSchema(SchemaRequest request) {
        try {
            String schema = request.getSchema();
            String operationType = request.getOperationType(); // "query" или "mutation"
            String operationName = request.getOperationName();
            
            // Парсим схему и генерируем запрос
            StringBuilder query = new StringBuilder();
            query.append(operationType).append(" ").append(operationName).append(" {\n");
            
            // TODO: Implement schema parsing and query generation
            // Это будет сложная логика парсинга SDL схемы
            
            query.append("}\n");
            
            return new GraphQLResponse(
                query.toString(),
                "Query generated successfully",
                true,
                null
            );
        } catch (Exception e) {
            return new GraphQLResponse(
                null,
                "Query generation error: " + e.getMessage(),
                false,
                List.of(e.getMessage())
            );
        }
    }
    
    // Шаблоны
    private List<QueryTemplate> templates = new ArrayList<>();
    
    public List<QueryTemplate> getTemplates() {
        return templates;
    }
    
    public QueryTemplate saveTemplate(QueryTemplate template) {
        template.setId(UUID.randomUUID().toString());
        template.setCreatedAt(new Date());
        templates.add(template);
        return template;
    }
}
