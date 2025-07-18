# AI-Guided SaaS

An AI-powered SaaS application with MCP (Model Context Protocol) integration for intelligent code analysis and development assistance.

## Features

- **MCP Server Integration** - Built-in Model Context Protocol server
- **AI-Powered Tools** - Code analysis, test generation, and performance optimization
- **SaaS Architecture** - Ready for cloud deployment
- **Development Automation** - Git and deployment pipelines

## Project Structure

```
AI-Guided-SaaS/
├── .mcp/               # MCP server implementation
│   ├── src/           # TypeScript source files
│   ├── dist/          # Compiled JavaScript
│   └── package.json   # MCP dependencies
├── README.md          # This file
└── .gitignore         # Git ignore rules
```

## MCP Server

The `.mcp` directory contains a Model Context Protocol server that provides:
- `analyze-code` - Analyze code quality and provide improvement suggestions
- `generate-tests` - Generate unit tests for provided code
- `optimize-performance` - Analyze and suggest performance optimizations

### Resources
- `saas://docs/best-practices` - SaaS development best practices
- `saas://templates/api` - API endpoint templates

## Getting Started

### Prerequisites
- Node.js 18+
- Git
- Vercel CLI (for deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/CleanExpo/AI-Guided-SaaS.git
cd AI-Guided-SaaS

# Set up the MCP server
cd .mcp
npm install
npm run build
```

### Running the MCP Server

```bash
cd .mcp
npm start
```

### Register with Claude Code

```bash
claude mcp add ai-guided-saas "node ~/projects/AI_Guided_SaaS/.mcp/dist/index.js"
```

## Deployment

This project is configured for Vercel deployment:

```bash
vercel --prod
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT