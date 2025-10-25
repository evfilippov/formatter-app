package com.example.formatter.model.graphql;

public class SchemaResponse {
    private String schema;
    private String message;
    private boolean success;
    private int typesCount;
    private int enumsCount;
    
    public SchemaResponse() {}
    
    public SchemaResponse(String schema, String message, boolean success, int typesCount, int enumsCount) {
        this.schema = schema;
        this.message = message;
        this.success = success;
        this.typesCount = typesCount;
        this.enumsCount = enumsCount;
    }
    
    public String getSchema() { return schema; }
    public void setSchema(String schema) { this.schema = schema; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public int getTypesCount() { return typesCount; }
    public void setTypesCount(int typesCount) { this.typesCount = typesCount; }
    public int getEnumsCount() { return enumsCount; }
    public void setEnumsCount(int enumsCount) { this.enumsCount = enumsCount; }
}
