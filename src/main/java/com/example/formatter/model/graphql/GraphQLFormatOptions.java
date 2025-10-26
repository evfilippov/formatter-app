package com.example.formatter.model.graphql;

public class GraphQLFormatOptions {
    private int indentSize = 2;
    private boolean sortFields = false;
    private boolean inlineFragments = false;
    private boolean compactValueObjects = true;
    
    public int getIndentSize() { return indentSize; }
    public void setIndentSize(int indentSize) { this.indentSize = indentSize; }
    public boolean isSortFields() { return sortFields; }
    public void setSortFields(boolean sortFields) { this.sortFields = sortFields; }
    public boolean isInlineFragments() { return inlineFragments; }
    public void setInlineFragments(boolean inlineFragments) { this.inlineFragments = inlineFragments; }
    public boolean isCompactValueObjects() { return compactValueObjects; }
    public void setCompactValueObjects(boolean compactValueObjects) { this.compactValueObjects = compactValueObjects; }
}
