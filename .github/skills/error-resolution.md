# Error Resolution Skill

## Purpose
Systematically debug and resolve errors using a methodical approach that minimizes trial-and-error and maximizes learning.

## Process

### 1. Gather Error Context
Before attempting fixes:
- Read the full error message and stack trace
- Identify the exact file and line number
- Check what operation was being performed
- Review recent changes that might have caused it

### 2. Reproduce the Issue
Understand when/how it occurs:
- Can it be consistently reproduced?
- What are the exact steps to trigger it?
- Does it occur in specific environments only?

### 3. Form a Hypothesis
Based on evidence, not guesses:
- What is the most likely cause?
- What would explain all observed symptoms?
- What can be ruled out?

### 4. Test the Hypothesis
Verify before implementing:
- Use targeted logging to validate assumptions
- Check relevant code sections
- Review related configurations
- Run specific test cases

### 5. Implement the Fix
Once confident in the cause:
- Make minimal, targeted changes
- Follow project conventions
- Add error handling if missing
- Update related tests

### 6. Verify the Solution
Ensure it's truly fixed:
- Run tests (unit and integration)
- Check for new errors introduced
- Verify edge cases
- Test in appropriate environment

### 7. Reflect and Document
Apply reflective learning:
- Update `reflective-learning.md` if applicable
- Add tests to prevent regression
- Update documentation if needed

## Common Error Patterns

### Import/Module Errors
- Check file paths and imports
- Verify virtual environment is activated
- Check for circular dependencies
- Ensure packages are installed

### Type Errors
- Review type annotations
- Check Pydantic model definitions
- Verify API request/response schemas
- Look for None/null handling issues

### Database Errors
- Check connection strings
- Verify migrations are applied
- Review SQL syntax in queries
- Check for missing foreign keys

### API Errors
- Verify endpoint paths match routes
- Check HTTP methods (GET/POST/PUT/DELETE)
- Review request/response models
- Check authentication/authorization

### Configuration Errors
- Review environment variables
- Check Docker configurations
- Verify paths are correct for OS
- Look for hardcoded values

## Anti-Patterns to Avoid

❌ **Random Changes**: Don't make changes without understanding the cause  
❌ **Copying Solutions Blindly**: Understand why a solution works before applying  
❌ **Ignoring Warnings**: Address warnings before they become errors  
❌ **Skipping Tests**: Always run tests after making changes  
❌ **Incomplete Error Handling**: Don't just catch errors, handle them properly  

