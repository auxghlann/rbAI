# Context Gathering Skill

## Purpose
Efficiently collect all necessary context before making changes, avoiding incomplete implementations and repeated iterations.

## When to Gather Context
- Before implementing new features
- Before fixing bugs
- Before refactoring code
- When asked to make changes to unfamiliar code

## Context Gathering Strategy

### 1. Understand the Request
Clarify what's being asked:
- What is the exact goal?
- What are the acceptance criteria?
- Are there constraints or requirements?
- What should NOT change?

### 2. Identify Affected Components
Map the scope:
- Which files will be modified?
- What dependencies exist?
- What related components might be affected?
- Are there tests that need updating?

### 3. Read Relevant Code
Get full context efficiently:
- Read entire functions/classes, not just snippets
- Check related files in parallel
- Look for existing patterns to follow
- Review interfaces and types

### 4. Check Project Conventions
Ensure consistency:
- Reference copilot-instructions.md
- Look at similar existing implementations
- Check naming conventions
- Review error handling patterns

### 5. Understand Integration Points
Know how it fits together:
- API endpoints and their schemas
- Database models and relationships
- Frontend-backend contracts
- External service dependencies

## Efficient Tool Usage

### Parallel Context Gathering
Group independent operations:
```
✅ Good: Read multiple files in parallel
❌ Bad: Read files one at a time sequentially
```

### Strategic Search
Use the right tool:
- `semantic_search`: For concepts and functionality
- `grep_search`: For specific strings or patterns
- `file_search`: For known filename patterns
- `search_subagent`: For complex multi-step searches

### Progressive Reading
Start broad, then narrow:
1. Use search to find relevant files
2. Read file structure and key sections
3. Deep dive into specific implementations
4. Check related tests and docs

## Context Checklist

Before implementing, can you answer:
- [ ] What files need to be modified?
- [ ] What is the current implementation (if any)?
- [ ] What conventions should be followed?
- [ ] What error cases need handling?
- [ ] What types/interfaces are involved?
- [ ] Are there tests to update?
- [ ] Are there dependencies to consider?
- [ ] What is the expected behavior?

## Anti-Patterns to Avoid

❌ **Premature Implementation**: Don't start coding before understanding the full context  
❌ **Assumption-Based Changes**: Don't guess about code behavior, verify it  
❌ **Sequential Reading**: Don't read files one by one when parallel reads are possible  
❌ **Overlooking Tests**: Don't forget to check existing tests related to your changes  
❌ **Ignoring Conventions**: Don't skip reviewing project conventions before implementing  

