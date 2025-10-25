package com.example.formatter.model.graphql;

public class MergeConflict {
    private String typeName;
    private String description;
    private String option1;
    private String option2;
    private Severity severity;
    
    public enum Severity {
        LOW, MEDIUM, HIGH
    }
    
    public MergeConflict() {}
    
    public MergeConflict(String typeName, String description, String option1, String option2, Severity severity) {
        this.typeName = typeName;
        this.description = description;
        this.option1 = option1;
        this.option2 = option2;
        this.severity = severity;
    }
    
    public String getTypeName() { return typeName; }
    public void setTypeName(String typeName) { this.typeName = typeName; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getOption1() { return option1; }
    public void setOption1(String option1) { this.option1 = option1; }
    public String getOption2() { return option2; }
    public void setOption2(String option2) { this.option2 = option2; }
    public Severity getSeverity() { return severity; }
    public void setSeverity(Severity severity) { this.severity = severity; }
}
