package com.example.formatter.model.graphql;

import java.util.List;

public class GraphQLResponse {
    private String result;
    private String message;
    private boolean success;
    private List<String> errors;
    
    public GraphQLResponse() {}
    
    public GraphQLResponse(String result, String message, boolean success, List<String> errors) {
        this.result = result;
        this.message = message;
        this.success = success;
        this.errors = errors;
    }
    
    public String getResult() { return result; }
    public void setResult(String result) { this.result = result; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public List<String> getErrors() { return errors; }
    public void setErrors(List<String> errors) { this.errors = errors; }
}
