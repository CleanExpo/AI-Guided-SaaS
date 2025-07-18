# Contributing

Thank you for your interest in contributing to the WSL Deployment Sequential Thinking MCP framework!

## Quick Start for Non-Coders & New Team Members

**To publish your updates, run:**

```bash
npm run mcp-helper
```

- Follow the on-screen menu prompts to stage, commit, push, and deploy.
- The tool provides plain-English guidance for every step.
- All common problems are auto-detected and explained.

## Development Guidelines

### File Management
- All file writes and edits must go through the MCP API/utilities; do not write files directly
- Use the `writeSafeFile` helper from `src/path-helper.ts` to ensure files stay within the project root
- Always validate paths before file operations

### Deployment Pipeline
- **Easy Way**: Run `npm run mcp-helper` for a user-friendly menu interface
- **Advanced**: Run `runMCPDeploy("your commit message")` to stage, commit, push, and trigger Vercel deployment
- The pipeline automatically scans for orphaned files and validates project integrity
- All changes are committed with descriptive messages and pushed to GitHub

### Troubleshooting

#### SSH Issues
If you encounter push failures, ensure your SSH agent is properly configured:

```bash
# Start SSH agent and add your key
eval "$(ssh-agent -s)" && ssh-add ~/.ssh/id_rsa

# Verify your remote URL is SSH-based
git remote set-url origin git@github.com:CleanExpo/WSL-Deployment-Sequential-Thinking.git
```

#### Common Problems
- **"git" errors**: Are you connected to WiFi? Is your SSH key/agent ready?
- **"Vercel" errors**: Run `vercel login` or check that your Vercel token is valid.
- **Misplaced files**: Use the MCP Helper option "Check for misplaced files and fix" to recover orphaned code.

#### WSL/Windows Path Issues
- Always use `path.normalize()` in scripts to resolve path differences
- Keep `.ssh` key permissions set to `chmod 600`
- Use Node.js path utilities instead of manual string concatenation

### Code Standards

#### TypeScript
- Use strict TypeScript configuration
- Include proper type definitions for all functions
- Export functions that may be reused across modules

#### Error Handling
- Always wrap external commands in try-catch blocks
- Provide meaningful error messages
- Log success and failure states clearly

#### Testing
- Test all path resolution functions with edge cases
- Verify SSH connectivity before deployment
- Validate Vercel integration in staging environment

### Project Structure

```
src/
├── index.ts          # Main MCP server entry point
├── path-helper.ts    # Safe path resolution utilities
├── git-helper.ts     # Git operations with error handling
├── vercel-helper.ts  # Vercel deployment automation
└── mcp-pipeline.ts   # Complete deployment pipeline
```

### Environment Setup

1. **Node.js 18+** - Required for MCP SDK compatibility
2. **Git with SSH** - Configure SSH keys for GitHub authentication
3. **Vercel CLI** - Install globally: `npm install -g vercel`
4. **WSL2** - Recommended for Windows development

### Edge Cases Handled

- Files landing in unexpected places outside project root
- Git authentication/SSH problems in WSL
- Vercel commit-sync failures with automatic retries
- Path normalization across Windows/WSL boundaries

### Making Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes using the provided utilities
4. Test locally with `npm run build && npm start`
5. Use `runMCPDeploy("feat: your feature description")` to deploy
6. Create a pull request with detailed description

### Getting Help

- Check the README.md for environment setup tips
- Review existing code for patterns and best practices
- Open an issue for bugs or feature requests
- Join discussions in the repository issues

Thank you for contributing to making this MCP framework more robust and collaborative!
