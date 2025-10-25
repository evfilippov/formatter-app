package com.example.formatter.model.graphql;

import java.util.List;

public class ValidationResponse {
    private boolean valid;
    private String message;
    private List<String> errors;
    private List<String> suggestions;
    
    public ValidationResponse() {}
    
    public ValidationResponse(boolean valid, String message, List<String> errors, List<String> suggestions) {
        this.valid = valid;
        this.message = message;
        this.errors = errors;
        this.suggestions = suggestions;
    }
    
    public boolean isValid() { return valid; }
    public void setValid(boolean valid) { this.valid = valid; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public List<String> getErrors() { return errors; }
    public void setErrors(List<String> errors) { this.errors = errors; }
    public List<String> getSuggestions() { return suggestions; }
    public void setSuggestions(List<String> suggestions) { this.suggestions = suggestions; }
}
