# AI-Guided SaaS MCP Server

A Model Context Protocol (MCP) server that provides AI-powered development tools for SaaS applications.

## Features

### 🛠️ Tools

1. **analyze-code** - Analyze code quality and provide improvement suggestions
   - Input: code (string), language (string)
   - Returns: Code quality report with suggestions

2. **generate-tests** - Generate unit tests for provided code
   - Input: code (string), framework (optional string)
   - Returns: Generated test code

3. **optimize-performance** - Analyze and suggest performance optimizations
   - Input: code (string), metrics (optional array)
   - Returns: Performance analysis and optimization suggestions

### 📚 Resources

1. **saas://docs/best-practices** - Comprehensive guide for SaaS development best practices
2. **saas://templates/api** - Ready-to-use API endpoint templates

## Installation

```bash
cd ~/projects/AI_Guided_SaaS/.mcp
npm install
npm run build
```

## Usage

### Start the server
```bash
npm start
```

### Register with Claude Code
```bash
claude mcp add ai-guided-saas "node ~/projects/AI_Guided_SaaS/.mcp/dist/index.js"
```

## Development

1. Edit source files in `src/`
2. Build: `npm run build`
3. Test: `npm start`

## Environment Variables

Create a `.env` file if needed:
```env
NODE_ENV=development
LOG_LEVEL=info
```

## License

MIT