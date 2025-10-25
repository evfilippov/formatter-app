package com.example.formatter.model.graphql;

public class MergeOptions {
    private String conflictStrategy = "KEEP_FIRST";
    private ConflictResolution conflictResolution = ConflictResolution.USE_FIRST;
    
    public String getConflictStrategy() { return conflictStrategy; }
    public void setConflictStrategy(String conflictStrategy) { this.conflictStrategy = conflictStrategy; }
    public ConflictResolution getConflictResolution() { return conflictResolution; }
    public void setConflictResolution(ConflictResolution conflictResolution) { this.conflictResolution = conflictResolution; }
    
    public enum ConflictResolution {
        USE_FIRST,
        USE_LATEST,
        MERGE_FIELDS
    }
}
