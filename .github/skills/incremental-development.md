# Incremental Development Skill

## Purpose
Break down complex tasks into smaller, testable increments that build toward the final goal while maintaining working code at each step.

## Core Principles

### 1. Working Code Always
Every increment should:
- Compile/run without errors
- Pass existing tests
- Add value (even if small)
- Be verifiable

### 2. Small, Focused Changes
Each step should:
- Have a single clear purpose
- Be easily understood
- Be quickly testable
- Be easily reverted if needed

### 3. Build Incrementally
Progress systematically:
- Start with simplest/most fundamental parts
- Add complexity gradually
- Test at each step
- Don't skip ahead

## Process

### 1. Plan the Increments
Before starting, break down the task:
- Use `manage_todo_list` for complex work
- Identify logical checkpoints
- Order by dependencies
- Keep each increment small

Example breakdown:
```
❌ Bad: "Implement user authentication"

✅ Good:
1. Create User model and database schema
2. Implement password hashing utility
3. Create login endpoint
4. Add JWT token generation
5. Create authentication middleware
6. Update protected endpoints
7. Add tests for each component
```

### 2. Implement One Increment
Focus on current step:
- Mark todo as in-progress
- Gather context for this step only
- Implement the change
- Verify it works

### 3. Verify Before Continuing
After each increment:
- Run relevant tests
- Check for errors
- Verify expected behavior
- Mark todo as completed

### 4. Adjust Plan If Needed
Be flexible:
- Add new todos if gaps discovered
- Reorder if dependencies change
- Break down if still too complex

## When to Use Todo Lists

### Use for:
- Multi-step features
- Complex refactoring
- Multiple related changes
- Unfamiliar codebases
- User provides multiple requests

### Skip for:
- Single file edits
- Simple bug fixes
- Minor refactoring
- Straightforward changes

## Todo Management

### Mark In-Progress
Before starting work:
```
Only ONE todo should be in-progress at a time
```

### Complete Immediately
After finishing a step:
```
Mark completed right away, don't batch completions
```

### Be Specific
Todo titles should be:
- Action-oriented
- Concrete and measurable
- 3-7 words
- Clear about the outcome

Examples:
```
❌ Bad: "Fix the API"
✅ Good: "Add rate limiting to login endpoint"

❌ Bad: "Work on frontend"
✅ Good: "Create LoginForm component with validation"
```

## Verification Steps

After each increment:

### For Backend Changes
- Run affected unit tests
- Check logs for errors
- Verify API responses
- Check database state

### For Frontend Changes
- Check browser console
- Verify UI renders correctly
- Test user interactions
- Check network requests

### For Full-Stack Changes
- Test frontend-backend integration
- Verify data flow
- Check error handling
- Test edge cases

## Anti-Patterns to Avoid

❌ **Big Bang Implementation**: Don't implement everything at once  
❌ **Skipping Verification**: Don't move to next step without testing current one  
❌ **Multiple In-Progress**: Don't work on multiple todos simultaneously  
❌ **Vague Todos**: Don't create ambiguous or unmeasurable tasks  
❌ **Forgetting to Update**: Don't leave completed todos marked as in-progress  

