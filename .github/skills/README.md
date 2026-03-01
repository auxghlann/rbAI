# Copilot Skills

This directory contains structured behavioral skills and patterns that guide how GitHub Copilot approaches tasks in the rbAI project.

## Purpose

Skills provide:
- **Consistent approaches** to common development tasks
- **Learning mechanisms** through reflection and documentation
- **Best practices** specific to this project
- **Decision frameworks** for complex scenarios

## Available Skills

### 🎓 [Reflective Learning](./reflective-learning.md)
Learn from mistakes by documenting issues, root causes, solutions, and preventive measures. Maintains a living knowledge base of lessons learned.

**Use when:**
- Resolving bugs or errors
- Discovering incorrect assumptions
- Fixing previously failed approaches

### 🔧 [Error Resolution](./error-resolution.md)
Systematic approach to debugging and resolving errors with minimal trial-and-error. Includes common error patterns and anti-patterns to avoid.

**Use when:**
- Encountering runtime errors
- Debugging test failures
- Investigating unexpected behavior

### 🔍 [Context Gathering](./context-gathering.md)
Efficiently collect all necessary context before making changes. Ensures complete understanding and avoids incomplete implementations.

**Use when:**
- Implementing new features
- Working with unfamiliar code
- Making cross-component changes

### 📦 [Incremental Development](./incremental-development.md)
Break down complex tasks into small, testable increments. Maintain working code at each step while building toward the final goal.

**Use when:**
- Implementing complex features
- Refactoring large sections
- Working on multi-step tasks

## How Skills Are Used

1. **Referenced by copilot-instructions.md**: Main instructions reference these skills
2. **Applied contextually**: Skills guide decision-making during development
3. **Updated through reflection**: Skills improve based on lessons learned
4. **Project-specific**: Tailored to rbAI's architecture and conventions

## Adding New Skills

To add a new skill:

1. Create a new markdown file in this directory
2. Follow the template structure:
   - **Purpose**: What the skill achieves
   - **When to Use**: Situational guidance
   - **Process**: Step-by-step approach
   - **Examples**: Concrete demonstrations
   - **Anti-Patterns**: What to avoid

3. Update this README with the new skill
4. Reference it in copilot-instructions.md if applicable

## Skill Updates

Skills are living documents and should be updated when:
- New patterns emerge from development
- Mistakes are made and lessons learned
- Better approaches are discovered
- Project conventions change

See [reflective-learning.md](./reflective-learning.md) for the process of documenting lessons learned.

