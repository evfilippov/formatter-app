package com.example.formatter.model.graphql;

import java.util.List;

public class MergeResponse {
    private String mergedSchema;
    private List<MergeConflict> conflicts;
    private String message;
    private boolean success;
    
    public MergeResponse() {}
    
    public MergeResponse(String mergedSchema, List<MergeConflict> conflicts, String message, boolean success) {
        this.mergedSchema = mergedSchema;
        this.conflicts = conflicts;
        this.message = message;
        this.success = success;
    }
    
    public String getMergedSchema() { return mergedSchema; }
    public void setMergedSchema(String mergedSchema) { this.mergedSchema = mergedSchema; }
    public String getSchema() { return mergedSchema; } // Alias for frontend compatibility
    public List<MergeConflict> getConflicts() { return conflicts; }
    public void setConflicts(List<MergeConflict> conflicts) { this.conflicts = conflicts; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
}
