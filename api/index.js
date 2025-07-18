export default function handler(req, res) {
  res.status(200).json({
    name: 'AI-Guided SaaS',
    version: '1.0.0',
    description: 'AI-powered SaaS application with MCP integration',
    status: 'running',
    timestamp: new Date().toISOString(),
    features: {
      mcp: {
        status: 'available',
        tools: ['analyze-code', 'generate-tests', 'optimize-performance'],
        resources: ['saas://docs/best-practices', 'saas://templates/api']
      },
      deployment: {
        platform: 'Vercel',
        environment: process.env.VERCEL_ENV || 'development'
      }
    },
    endpoints: {
      api: '/api',
      health: '/api/health',
      mcp: 'Use Claude Code to connect to MCP server'
    }
  });
}