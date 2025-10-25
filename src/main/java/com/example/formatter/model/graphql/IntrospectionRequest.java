package com.example.formatter.model.graphql;

import java.util.Map;

public class IntrospectionRequest {
    private String endpoint;
    private Map<String, String> headers;
    private boolean includeDeprecated = true;
    
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public Map<String, String> getHeaders() { return headers; }
    public void setHeaders(Map<String, String> headers) { this.headers = headers; }
    public boolean isIncludeDeprecated() { return includeDeprecated; }
    public void setIncludeDeprecated(boolean includeDeprecated) { this.includeDeprecated = includeDeprecated; }
}
