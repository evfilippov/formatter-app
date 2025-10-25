package com.example.formatter.service.graphql;

import com.example.formatter.model.graphql.*;
// import graphql.execution.ExecutionResult; // ← УДАЛИТЕ ЭТУ СТРОКУ
import graphql.GraphQL;
import graphql.language.Document;
import graphql.parser.Parser;
import graphql.schema.GraphQLSchema;
import graphql.schema.idl.RuntimeWiring;
import graphql.schema.idl.SchemaGenerator;
import graphql.schema.idl.SchemaParser;
import graphql.schema.idl.TypeDefinitionRegistry;
import graphql.validation.ValidationError;
import graphql.validation.Validator;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class GraphQLValidatorService {
    
    public ValidationResponse validate(ValidationRequest request) {
        try {
            String query = request.getQuery();
            String schema = request.getSchema();
            
            // Парсим схему
            SchemaParser schemaParser = new SchemaParser();
            TypeDefinitionRegistry typeDefinitionRegistry = schemaParser.parse(schema);
            
            // Создаем GraphQL схему
            RuntimeWiring runtimeWiring = RuntimeWiring.newRuntimeWiring().build();
            SchemaGenerator schemaGenerator = new SchemaGenerator();
            GraphQLSchema graphQLSchema = schemaGenerator.makeExecutableSchema(typeDefinitionRegistry, runtimeWiring);
            
            // Парсим запрос
            Document document = Parser.parse(query);
            
            // Валидируем
            Validator validator = new Validator();
            List<ValidationError> errors = validator.validateDocument(graphQLSchema, document, null);
            
            if (errors.isEmpty()) {
                return new ValidationResponse(
                    true,
                    "Query is valid",
                    List.of(),
                    null
                );
            } else {
                List<String> errorMessages = errors.stream()
                    .map(ValidationError::getMessage)
                    .collect(Collectors.toList());
                
                return new ValidationResponse(
                    false,
                    "Query validation failed",
                    errorMessages,
                    generateSuggestions(errors)
                );
            }
        } catch (Exception e) {
            return new ValidationResponse(
                false,
                "Validation error: " + e.getMessage(),
                List.of(e.getMessage()),
                null
            );
        }
    }
    
    private List<String> generateSuggestions(List<ValidationError> errors) {
        return errors.stream()
            .map(error -> {
                String message = error.getMessage();
                
                // Генерируем предложения на основе типа ошибки
                if (message.contains("Unknown field")) {
                    return "Check field name spelling or consult the schema";
                } else if (message.contains("Unknown type")) {
                    return "Verify type exists in schema";
                } else if (message.contains("Missing field argument")) {
                    return "Add required arguments to the field";
                } else {
                    return "Review GraphQL query syntax";
                }
            })
            .distinct()
            .collect(Collectors.toList());
    }
}
