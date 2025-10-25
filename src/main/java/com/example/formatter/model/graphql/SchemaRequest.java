package com.example.formatter.model.graphql;

public class SchemaRequest {
    private String schema;
    private String operationType;
    private String operationName;
    
    public String getSchema() { return schema; }
    public void setSchema(String schema) { this.schema = schema; }
    public String getOperationType() { return operationType; }
    public void setOperationType(String operationType) { this.operationType = operationType; }
    public String getOperationName() { return operationName; }
    public void setOperationName(String operationName) { this.operationName = operationName; }
}
