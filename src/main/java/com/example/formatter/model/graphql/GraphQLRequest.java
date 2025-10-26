package com.example.formatter.model.graphql;

import com.example.formatter.model.FormatOptions;

public class GraphQLRequest {
    private String query;
    private FormatOptions options;

    public GraphQLRequest() {}

    public GraphQLRequest(String query, FormatOptions options) {
        this.query = query;
        this.options = options;
    }

    public String getQuery() { return query; }
    public void setQuery(String query) { this.query = query; }
    public FormatOptions getOptions() { return options; }
    public void setOptions(FormatOptions options) { this.options = options; }
}
