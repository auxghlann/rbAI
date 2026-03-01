# Reflective Learning Skill

## Purpose
Learn from past mistakes by documenting issues encountered, their root causes, solutions applied, and lessons learned. This creates a living knowledge base that improves future responses.

## When to Use This Skill
- After resolving a bug or error
- After discovering incorrect assumptions
- After implementing a fix for a previously failed approach
- When encountering similar issues to past problems

## Process

### 1. Identify the Mistake
Document what went wrong:
- What was the intended outcome?
- What actually happened?
- When/where did the error occur?

### 2. Analyze Root Cause
Dig deeper than surface symptoms:
- What was the underlying cause?
- What assumptions were incorrect?
- What context was missing?

### 3. Document the Solution
Record how it was resolved:
- What steps were taken to fix it?
- What changes were made?
- What alternative approaches were considered?

### 4. Extract the Lesson
Generalize the learning:
- What should be done differently next time?
- What checks or patterns can prevent this?
- What tools or approaches work better?

### 5. Update This File
Add the lesson to the "Lessons Learned" section below.

---

## Lessons Learned

### Template for New Entries
```
**Issue**: [Brief description]
**Date**: [When it occurred]
**Root Cause**: [Why it happened]
**Solution**: [How it was fixed]
**Prevention**: [How to avoid in future]
**Related Files/Patterns**: [Relevant context]
```

---

### Example Entry

**Issue**: Used `console.log` instead of secure logger in production code  
**Date**: March 1, 2026  
**Root Cause**: Habit from quick debugging; forgot security guidelines  
**Solution**: Replaced all `console.log` with appropriate logger methods (debug/info/warn/error)  
**Prevention**: Always reference copilot-instructions.md security rules before any logging. Use grep search for "console.log" before committing.  
**Related Files/Patterns**: Frontend logging (utils/logger.ts), Backend logging (utils/logger.py)

---

## Active Learning Log

*This section is for recent/ongoing issues being resolved. Move to "Lessons Learned" once resolved.*

<!-- Add new entries here during development -->

