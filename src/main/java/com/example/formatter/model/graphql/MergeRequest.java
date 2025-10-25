package com.example.formatter.model.graphql;

import java.util.List;

public class MergeRequest {
    private List<String> schemas;
    private List<String> queries;
    private MergeOptions options;
    
    public List<String> getSchemas() { return schemas; }
    public void setSchemas(List<String> schemas) { this.schemas = schemas; }
    public List<String> getQueries() { return queries; }
    public void setQueries(List<String> queries) { this.queries = queries; }
    public MergeOptions getOptions() { return options; }
    public void setOptions(MergeOptions options) { this.options = options; }
}
