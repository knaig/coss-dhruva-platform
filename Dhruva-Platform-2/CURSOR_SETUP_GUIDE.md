# Cursor IDE Setup Guide for Dhruva Platform

## Overview
This guide explains how to configure Cursor IDE to use the enhanced `.cursorrules` file for optimal AI assistance when working with the Dhruva Platform codebase.

## File Placement

### 1. .cursorrules File Location
The `.cursorrules` file has been placed at the project root:
```
Dhruva-Platform-2/.cursorrules
```

This location ensures that Cursor IDE automatically detects and applies the rules to the entire project.

### 2. Verify File Placement
Ensure the file is in the correct location by checking:
```bash
ls -la Dhruva-Platform-2/.cursorrules
```

## Cursor IDE Configuration

### 1. Open Project in Cursor
1. Launch Cursor IDE
2. Open the `Dhruva-Platform-2` directory as your workspace
3. Cursor should automatically detect the `.cursorrules` file

### 2. Verify Rules Are Active
1. Open any Python file in the `server/` directory
2. Start typing a comment or ask the AI assistant a question
3. The AI should demonstrate knowledge of:
   - FastAPI router patterns
   - MongoDB repository patterns
   - Pydantic model structures
   - Authentication requirements
   - Error handling patterns

### 3. Test AI Context Understanding
Try these test prompts to verify the rules are working:

**Test 1 - Router Creation:**
```
Create a new FastAPI router for managing user preferences with authentication
```

**Expected Response:** Should include proper imports, authentication dependencies, and follow the established router pattern.

**Test 2 - Data Transformation:**
```
How should I transform a complex MongoDB model to a simple API response?
```

**Expected Response:** Should reference the data transformation patterns and provide examples similar to the ModelViewResponse fix.

**Test 3 - Error Handling:**
```
Add proper error handling to a repository method
```

**Expected Response:** Should use BaseError with specific error codes from the Errors enum.

## Advanced Configuration

### 1. Cursor Settings
Access Cursor settings (Cmd/Ctrl + ,) and configure:

**AI Model Settings:**
- Ensure you're using the latest available model
- Set context window to maximum available

**Code Completion:**
- Enable "Use AI for code completion"
- Enable "Use project context for suggestions"

### 2. Workspace Settings
Create or update `.vscode/settings.json` in the project root:
```json
{
  "python.defaultInterpreterPath": "./server/venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": false,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.associations": {
    "*.cursorrules": "markdown"
  }
}
```

### 3. Extensions Recommendations
Install these Cursor/VSCode extensions for better development experience:
- Python (Microsoft)
- TypeScript and JavaScript Language Features
- Docker
- MongoDB for VS Code
- REST Client (for API testing)

## Verification Checklist

### ✅ Basic Setup
- [ ] `.cursorrules` file exists at project root
- [ ] Cursor IDE opens the project correctly
- [ ] AI assistant responds to queries

### ✅ Context Understanding
- [ ] AI knows about FastAPI router patterns
- [ ] AI understands MongoDB repository structure
- [ ] AI suggests proper authentication patterns
- [ ] AI recommends correct error handling
- [ ] AI follows naming conventions

### ✅ Code Generation Quality
- [ ] Generated routers include proper dependencies
- [ ] Generated models follow Pydantic patterns
- [ ] Generated code includes error handling
- [ ] Generated code follows project structure
- [ ] Generated TypeScript follows frontend patterns

## Troubleshooting

### Issue: AI doesn't seem to know project context
**Solution:**
1. Restart Cursor IDE
2. Ensure `.cursorrules` file is in the project root
3. Try opening a file and asking a specific question about the project

### Issue: Generated code doesn't follow patterns
**Solution:**
1. Be more specific in your prompts
2. Reference the `.cursorrules` file explicitly: "Following the project patterns in .cursorrules..."
3. Provide examples from existing code

### Issue: AI suggests outdated patterns
**Solution:**
1. Update the `.cursorrules` file with new patterns
2. Restart Cursor IDE to reload the rules
3. Be explicit about which patterns to follow

## Best Practices

### 1. Effective Prompting
- **Be specific:** "Create a FastAPI router for user management following the project patterns"
- **Reference context:** "Using the repository pattern from the project"
- **Specify location:** "Add this to server/module/auth/router/"

### 2. Code Review
Always review AI-generated code for:
- Proper imports and dependencies
- Correct error handling patterns
- Authentication requirements
- Data transformation needs
- Type hints and validation

### 3. Iterative Improvement
- Update `.cursorrules` when new patterns emerge
- Add examples of successful implementations
- Document any project-specific conventions

## Example Workflows

### Creating a New API Endpoint
1. Ask: "Create a new FastAPI router for managing notifications with proper authentication"
2. Review the generated code for pattern compliance
3. Ask for specific improvements: "Add proper error handling using the project's error patterns"
4. Test the endpoint and update documentation

### Adding Frontend Components
1. Ask: "Create a React component for displaying notification lists using Chakra UI"
2. Ensure it follows TypeScript patterns
3. Add API integration using the project's API client patterns
4. Test with the backend endpoints

## Maintenance

### Regular Updates
- Review and update `.cursorrules` monthly
- Add new patterns as the project evolves
- Remove outdated conventions
- Keep examples current with the latest code

### Team Synchronization
- Ensure all team members use the same `.cursorrules` file
- Document any changes in team meetings
- Share successful AI-generated code examples
- Maintain consistency across the team

## Support

If you encounter issues with the Cursor setup:
1. Check this guide first
2. Review the `.cursorrules` file for relevant patterns
3. Test with simple prompts before complex requests
4. Document any new patterns for future updates
