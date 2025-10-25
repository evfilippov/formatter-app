package com.example.formatter.model.graphql;

public class IntrospectionResponse {
    private String schema;
    private String message;
    private boolean success;
    
    public IntrospectionResponse() {}
    
    public IntrospectionResponse(String schema, String message, boolean success) {
        this.schema = schema;
        this.message = message;
        this.success = success;
    }
    
    public String getSchema() { return schema; }
    public void setSchema(String schema) { this.schema = schema; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
}
