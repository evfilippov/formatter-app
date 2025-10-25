package com.example.formatter.service.graphql;

import com.example.formatter.model.graphql.*;
import graphql.language.*;
import graphql.parser.Parser;
import graphql.schema.idl.SchemaParser;
import graphql.schema.idl.TypeDefinitionRegistry;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class GraphQLMergerService {
    
    public MergeResponse mergeSchemas(MergeRequest request) {
        try {
            List<String> schemas = request.getSchemas();
            MergeOptions options = request.getOptions();
            
            // Парсим все схемы
            List<TypeDefinitionRegistry> registries = new ArrayList<>();
            SchemaParser schemaParser = new SchemaParser();
            
            for (String schema : schemas) {
                registries.add(schemaParser.parse(schema));
            }
            
            // Объединяем
            MergeResult result = performMerge(registries, options);
            
            return new MergeResponse(
                result.mergedSchema,
                result.conflicts,
                "Schemas merged successfully",
                true
            );
        } catch (Exception e) {
            return new MergeResponse(
                null,
                new ArrayList<>(),
                "Merge error: " + e.getMessage(),
                false
            );
        }
    }
    
    public SchemaResponse mergeQueries(MultiQueryRequest request) {
        try {
            List<String> queries = request.getQueries();
            Map<String, TypeInfo> allTypes = new HashMap<>();
            Map<String, Set<String>> allOperations = new HashMap<>();
            
            // Анализируем каждый запрос
            for (String query : queries) {
                Document document = Parser.parse(query);
                analyzeDocument(document, allTypes, allOperations);
            }
            
            // Генерируем объединенную схему
            String mergedSchema = generateMergedSchema(allTypes, allOperations);
            
            return new SchemaResponse(
                mergedSchema,
                "Queries merged into schema successfully",
                true,
                allTypes.size(),
                0
            );
        } catch (Exception e) {
            return new SchemaResponse(
                null,
                "Merge queries error: " + e.getMessage(),
                false,
                0,
                0
            );
        }
    }
    
    private void analyzeDocument(Document document, Map<String, TypeInfo> allTypes, Map<String, Set<String>> allOperations) {
        for (Definition definition : document.getDefinitions()) {
            if (definition instanceof OperationDefinition) {
                OperationDefinition op = (OperationDefinition) definition;
                String operationType = op.getOperation().toString();
                
                // Добавляем операцию
                Set<String> operations = allOperations.computeIfAbsent(
                    operationType,
                    k -> new HashSet<>()
                );
                
                String operationSignature = buildOperationSignature(op);
                operations.add(operationSignature);
                
                // Анализируем типы
                analyzeOperationTypes(op, allTypes);
            }
        }
    }
    
    private String buildOperationSignature(OperationDefinition op) {
        StringBuilder sig = new StringBuilder();
        
        if (op.getName() != null) {
            sig.append(op.getName());
        }
        
        // Добавляем аргументы если есть
        for (Selection selection : op.getSelectionSet().getSelections()) {
            if (selection instanceof Field) {
                Field field = (Field) selection;
                sig.append("\n  ").append(field.getName());
                
                if (!field.getArguments().isEmpty()) {
                    sig.append("(");
                    // Определяем тип входных данных
                    String inputType = inferInputTypeName(op.getName(), field.getName());
                    sig.append("input: ").append(inputType).append("!");
                    sig.append(")");
                }
                
                sig.append(": ").append(inferResponseTypeName(op.getName(), field.getName()));
            }
        }
        
        return sig.toString();
    }
    
    private void analyzeOperationTypes(OperationDefinition op, Map<String, TypeInfo> allTypes) {
        for (Selection selection : op.getSelectionSet().getSelections()) {
            if (selection instanceof Field) {
                Field field = (Field) selection;
                
                // Анализируем аргументы (input types)
                if (!field.getArguments().isEmpty()) {
                    String inputTypeName = inferInputTypeName(op.getName(), field.getName());
                    TypeInfo inputType = analyzeFieldArguments(field, inputTypeName);
                    mergeType(allTypes, inputType);
                }
                
                // Анализируем response type
                if (field.getSelectionSet() != null) {
                    String responseTypeName = inferResponseTypeName(op.getName(), field.getName());
                    TypeInfo responseType = analyzeFieldSelection(field, responseTypeName);
                    mergeType(allTypes, responseType);
                }
            }
        }
    }
    
    private void mergeType(Map<String, TypeInfo> allTypes, TypeInfo newType) {
        if (allTypes.containsKey(newType.name)) {
            // Тип уже существует - объединяем поля
            TypeInfo existing = allTypes.get(newType.name);
            for (Map.Entry<String, String> field : newType.fields.entrySet()) {
                if (existing.fields.containsKey(field.getKey())) {
                    // Поле уже существует - проверяем совместимость
                    String existingType = existing.fields.get(field.getKey());
                    if (!existingType.equals(field.getValue())) {
                        // Конфликт типов - добавляем как альтернативу
                        existing.conflicts.add(new FieldConflict(
                            field.getKey(),
                            existingType,
                            field.getValue()
                        ));
                    }
                } else {
                    // Добавляем новое поле
                    existing.fields.put(field.getKey(), field.getValue());
                }
            }
        } else {
            // Добавляем новый тип
            allTypes.put(newType.name, newType);
        }
    }
    
    private TypeInfo analyzeFieldArguments(Field field, String typeName) {
        TypeInfo inputType = new TypeInfo(typeName, "input", new LinkedHashMap<>());
        
        for (Argument arg : field.getArguments()) {
            analyzeArgumentValue(arg.getName(), arg.getValue(), inputType);
        }
        
        return inputType;
    }
    
    private void analyzeArgumentValue(String name, Value value, TypeInfo parentType) {
        if (value instanceof ObjectValue) {
            ObjectValue obj = (ObjectValue) value;
            
            // Проверяем паттерн { value: ... }
            List<ObjectField> fields = obj.getObjectFields();
            if (fields.size() == 1 && fields.get(0).getName().equals("value")) {
                // Простой value wrapper
                String innerType = inferValueType(fields.get(0).getValue());
                parentType.fields.put(name, name + ": " + capitalize(innerType) + "Value");
            } else {
                // Сложный объект - создаем вложенный тип
                String nestedTypeName = capitalize(name) + "Input";
                TypeInfo nestedType = new TypeInfo(nestedTypeName, "input", new LinkedHashMap<>());
                
                for (ObjectField field : fields) {
                    analyzeArgumentValue(field.getName(), field.getValue(), nestedType);
                }
                
                parentType.fields.put(name, name + ": " + nestedTypeName);
                parentType.nestedTypes.put(nestedTypeName, nestedType);
            }
        } else if (value instanceof ArrayValue) {
            ArrayValue array = (ArrayValue) value;
            if (!array.getValues().isEmpty()) {
                Value firstElement = array.getValues().get(0);
                if (firstElement instanceof ObjectValue) {
                    String elementTypeName = capitalize(name) + "Input";
                    TypeInfo elementType = new TypeInfo(elementTypeName, "input", new LinkedHashMap<>());
                    analyzeArgumentValue("element", firstElement, elementType);
                    parentType.fields.put(name, name + ": [" + elementTypeName + "]");
                    parentType.nestedTypes.put(elementTypeName, elementType);
                } else {
                    String elementType = inferValueType(firstElement);
                    parentType.fields.put(name, name + ": [" + elementType + "]");
                }
            }
        } else {
            String fieldType = inferValueType(value);
            parentType.fields.put(name, name + ": " + fieldType);
        }
    }
    
    private TypeInfo analyzeFieldSelection(Field field, String typeName) {
        TypeInfo responseType = new TypeInfo(typeName, "type", new LinkedHashMap<>());
        
        for (Selection selection : field.getSelectionSet().getSelections()) {
            if (selection instanceof Field) {
                Field subField = (Field) selection;
                
                if (subField.getSelectionSet() != null) {
                    // Вложенный объект
                    String nestedTypeName = capitalize(subField.getName()) + "Type";
                    responseType.fields.put(subField.getName(), subField.getName() + ": " + nestedTypeName);
                    
                    TypeInfo nestedType = analyzeFieldSelection(subField, nestedTypeName);
                    responseType.nestedTypes.put(nestedTypeName, nestedType);
                } else {
                    // Скалярное поле
                    responseType.fields.put(subField.getName(), subField.getName() + ": String");
                }
            }
        }
        
        return responseType;
    }
    
    private String inferInputTypeName(String operationName, String fieldName) {
        if (operationName != null) {
            return capitalize(operationName) + "Input";
        }
        return capitalize(fieldName) + "Input";
    }
    
    private String inferResponseTypeName(String operationName, String fieldName) {
        if (operationName != null) {
            return capitalize(operationName) + "Response";
        }
        return capitalize(fieldName) + "Response";
    }
    
    private String inferValueType(Value value) {
        if (value instanceof StringValue) {
            return "String";
        } else if (value instanceof IntValue) {
            return "Int";
        } else if (value instanceof FloatValue) {
            return "Float";
        } else if (value instanceof BooleanValue) {
            return "Boolean";
        } else if (value instanceof NullValue) {
            return "String";
        }
        return "String";
    }
    
    private String generateMergedSchema(Map<String, TypeInfo> allTypes, Map<String, Set<String>> allOperations) {
        StringBuilder schema = new StringBuilder();
        
        // Генерируем корневые типы (Query, Mutation)
        for (Map.Entry<String, Set<String>> entry : allOperations.entrySet()) {
            String operationType = entry.getKey();
            Set<String> operations = entry.getValue();
            
            schema.append("type ").append(capitalize(operationType)).append(" {\n");
            for (String op : operations) {
                schema.append("  ").append(op).append("\n");
            }
            schema.append("}\n\n");
        }
        
        // Генерируем общие value типы
        generateCommonValueTypes(schema);
        
        // Генерируем response типы
        Set<String> processedTypes = new HashSet<>();
        for (TypeInfo type : allTypes.values()) {
            if (!processedTypes.contains(type.name)) {
                generateType(type, schema, allTypes, processedTypes);
            }
        }
        
        return schema.toString();
    }
    
    private void generateType(TypeInfo type, StringBuilder schema, Map<String, TypeInfo> allTypes, Set<String> processedTypes) {
        if (processedTypes.contains(type.name)) {
            return;
        }
        
        processedTypes.add(type.name);
        
        // Генерируем вложенные типы сначала
        for (TypeInfo nestedType : type.nestedTypes.values()) {
            generateType(nestedType, schema, allTypes, processedTypes);
        }
        
        // Генерируем сам тип
        schema.append(type.kind).append(" ").append(type.name).append(" {\n");
        
        for (Map.Entry<String, String> field : type.fields.entrySet()) {
            schema.append("  ").append(field.getValue()).append("\n");
        }
        
        // Добавляем комментарии о конфликтах если есть
        if (!type.conflicts.isEmpty()) {
            schema.append("  # CONFLICTS DETECTED:\n");
            for (FieldConflict conflict : type.conflicts) {
                schema.append("  # Field '").append(conflict.fieldName)
                      .append("': ").append(conflict.type1)
                      .append(" vs ").append(conflict.type2).append("\n");
            }
        }
        
        schema.append("}\n\n");
    }
    
    private void generateCommonValueTypes(StringBuilder schema) {
        // Стандартные value wrapper типы
        schema.append("type ValueOutput {\n  value: String\n}\n\n");
        schema.append("input StringValue {\n  value: String\n}\n\n");
        schema.append("input IntValue {\n  value: Int\n}\n\n");
        schema.append("input BooleanValue {\n  value: Boolean\n}\n\n");
        schema.append("input FloatValue {\n  value: Float\n}\n\n");
    }
    
    private String capitalize(String str) {
        if (str == null || str.isEmpty()) return str;
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }
    
    // Вспомогательные классы
    private static class TypeInfo {
        String name;
        String kind; // "type" или "input"
        Map<String, String> fields;
        Map<String, TypeInfo> nestedTypes;
        List<FieldConflict> conflicts;
        
        TypeInfo(String name, String kind, Map<String, String> fields) {
            this.name = name;
            this.kind = kind;
            this.fields = fields;
            this.nestedTypes = new HashMap<>();
            this.conflicts = new ArrayList<>();
        }
    }
    
        private static class FieldConflict {
        String fieldName;
        String type1;
        String type2;
        
        FieldConflict(String fieldName, String type1, String type2) {
            this.fieldName = fieldName;
            this.type1 = type1;
            this.type2 = type2;
        }
    }
    
    private static class MergeResult {
        String mergedSchema;
        List<MergeConflict> conflicts;
        
        MergeResult(String mergedSchema, List<MergeConflict> conflicts) {
            this.mergedSchema = mergedSchema;
            this.conflicts = conflicts;
        }
    }
    
    private MergeResult performMerge(List<TypeDefinitionRegistry> registries, MergeOptions options) {
        Map<String, TypeDefinition> mergedTypes = new HashMap<>();
        List<MergeConflict> conflicts = new ArrayList<>();
        
        // Объединяем все типы из всех схем
        for (TypeDefinitionRegistry registry : registries) {
            registry.types().forEach((name, type) -> {
                if (mergedTypes.containsKey(name)) {
                    // Тип уже существует - проверяем на конфликты
                    TypeDefinition existing = mergedTypes.get(name);
                    MergeConflict conflict = detectConflict(name, existing, type);
                    
                    if (conflict != null) {
                        conflicts.add(conflict);
                        
                        // Применяем стратегию разрешения конфликтов
                        if (options != null && options.getConflictStrategy() != null) {
                            switch (options.getConflictStrategy()) {
                                case "KEEP_FIRST":
                                    // Оставляем первый
                                    break;
                                case "KEEP_LAST":
                                    // Заменяем на последний
                                    mergedTypes.put(name, type);
                                    break;
                                case "MERGE_FIELDS":
                                    // Объединяем поля
                                    TypeDefinition merged = mergeTypeDefinitions(existing, type);
                                    mergedTypes.put(name, merged);
                                    break;
                            }
                        }
                    } else {
                        // Конфликтов нет - можно безопасно объединить
                        TypeDefinition merged = mergeTypeDefinitions(existing, type);
                        mergedTypes.put(name, merged);
                    }
                } else {
                    // Новый тип - добавляем
                    mergedTypes.put(name, type);
                }
            });
        }
        
        // Генерируем результирующую схему
        String mergedSchema = generateSchemaFromTypes(mergedTypes);
        
        return new MergeResult(mergedSchema, conflicts);
    }
    
    private MergeConflict detectConflict(String typeName, TypeDefinition type1, TypeDefinition type2) {
        if (type1.getClass() != type2.getClass()) {
            // Разные виды типов (например, type vs input)
            return new MergeConflict(
                typeName,
                "Type kind mismatch",
                type1.getClass().getSimpleName(),
                type2.getClass().getSimpleName(),
                MergeConflict.Severity.HIGH
            );
        }
        
        // Проверяем поля для ObjectTypeDefinition или InputObjectTypeDefinition
        if (type1 instanceof ObjectTypeDefinition) {
            ObjectTypeDefinition obj1 = (ObjectTypeDefinition) type1;
            ObjectTypeDefinition obj2 = (ObjectTypeDefinition) type2;
            
            List<FieldDefinition> fields1 = obj1.getFieldDefinitions();
            List<FieldDefinition> fields2 = obj2.getFieldDefinitions();
            
            // Ищем конфликтующие поля
            for (FieldDefinition field1 : fields1) {
                for (FieldDefinition field2 : fields2) {
                    if (field1.getName().equals(field2.getName())) {
                        // Проверяем, одинаковые ли типы
                        String type1Str = typeToString(field1.getType());
                        String type2Str = typeToString(field2.getType());
                        
                        if (!type1Str.equals(type2Str)) {
                            return new MergeConflict(
                                typeName,
                                "Field type mismatch: " + field1.getName(),
                                type1Str,
                                type2Str,
                                MergeConflict.Severity.MEDIUM
                            );
                        }
                    }
                }
            }
        }
        
        return null; // Конфликтов не обнаружено
    }
    
    private TypeDefinition mergeTypeDefinitions(TypeDefinition type1, TypeDefinition type2) {
        if (type1 instanceof ObjectTypeDefinition) {
            ObjectTypeDefinition obj1 = (ObjectTypeDefinition) type1;
            ObjectTypeDefinition obj2 = (ObjectTypeDefinition) type2;
            
            // Объединяем поля
            List<FieldDefinition> mergedFields = new ArrayList<>(obj1.getFieldDefinitions());
            
            for (FieldDefinition field2 : obj2.getFieldDefinitions()) {
                boolean exists = mergedFields.stream()
                    .anyMatch(f -> f.getName().equals(field2.getName()));
                
                if (!exists) {
                    mergedFields.add(field2);
                }
            }
            
            return ObjectTypeDefinition.newObjectTypeDefinition()
                .name(obj1.getName())
                .fieldDefinitions(mergedFields)
                .build();
        }
        
        // Для других типов возвращаем первый
        return type1;
    }
    
    private String typeToString(Type type) {
        if (type instanceof NonNullType) {
            NonNullType nonNull = (NonNullType) type;
            return typeToString(nonNull.getType()) + "!";
        } else if (type instanceof ListType) {
            ListType list = (ListType) type;
            return "[" + typeToString(list.getType()) + "]";
        } else if (type instanceof TypeName) {
            return ((TypeName) type).getName();
        }
        return "Unknown";
    }
    
    private String generateSchemaFromTypes(Map<String, TypeDefinition> types) {
        StringBuilder schema = new StringBuilder();
        
        // Сортируем типы для консистентного вывода
        List<String> sortedNames = new ArrayList<>(types.keySet());
        sortedNames.sort((a, b) -> {
            // Query и Mutation первыми
            if (a.equals("Query")) return -1;
            if (b.equals("Query")) return 1;
            if (a.equals("Mutation")) return -1;
            if (b.equals("Mutation")) return 1;
            return a.compareTo(b);
        });
        
        for (String typeName : sortedNames) {
            TypeDefinition type = types.get(typeName);
            generateTypeDefinition(type, schema);
        }
        
        return schema.toString();
    }
    
    private void generateTypeDefinition(TypeDefinition type, StringBuilder schema) {
        if (type instanceof ObjectTypeDefinition) {
            ObjectTypeDefinition objType = (ObjectTypeDefinition) type;
            schema.append("type ").append(objType.getName()).append(" {\n");
            
            for (FieldDefinition field : objType.getFieldDefinitions()) {
                schema.append("  ").append(field.getName());
                
                // Аргументы
                if (!field.getInputValueDefinitions().isEmpty()) {
                    schema.append("(");
                    for (int i = 0; i < field.getInputValueDefinitions().size(); i++) {
                        if (i > 0) schema.append(", ");
                        InputValueDefinition arg = field.getInputValueDefinitions().get(i);
                        schema.append(arg.getName()).append(": ").append(typeToString(arg.getType()));
                    }
                    schema.append(")");
                }
                
                schema.append(": ").append(typeToString(field.getType())).append("\n");
            }
            
            schema.append("}\n\n");
        } else if (type instanceof InputObjectTypeDefinition) {
            InputObjectTypeDefinition inputType = (InputObjectTypeDefinition) type;
            schema.append("input ").append(inputType.getName()).append(" {\n");
            
            for (InputValueDefinition field : inputType.getInputValueDefinitions()) {
                schema.append("  ").append(field.getName())
                      .append(": ").append(typeToString(field.getType())).append("\n");
            }
            
            schema.append("}\n\n");
        } else if (type instanceof EnumTypeDefinition) {
            EnumTypeDefinition enumType = (EnumTypeDefinition) type;
            schema.append("enum ").append(enumType.getName()).append(" {\n");
            
            for (EnumValueDefinition value : enumType.getEnumValueDefinitions()) {
                schema.append("  ").append(value.getName()).append("\n");
            }
            
            schema.append("}\n\n");
        } else if (type instanceof ScalarTypeDefinition) {
            ScalarTypeDefinition scalarType = (ScalarTypeDefinition) type;
            schema.append("scalar ").append(scalarType.getName()).append("\n\n");
        }
    }
}
