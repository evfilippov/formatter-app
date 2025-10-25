package com.example.formatter.model.graphql;

public class ValidationRequest {
    private String schema;
    private String query;
    
    public String getSchema() { return schema; }
    public void setSchema(String schema) { this.schema = schema; }
    public String getQuery() { return query; }
    public void setQuery(String query) { this.query = query; }
}
