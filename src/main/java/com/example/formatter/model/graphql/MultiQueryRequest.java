package com.example.formatter.model.graphql;

import java.util.List;

public class MultiQueryRequest {
    private List<String> queries;
    
    public List<String> getQueries() { return queries; }
    public void setQueries(List<String> queries) { this.queries = queries; }
}
