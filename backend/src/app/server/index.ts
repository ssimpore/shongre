import { createServer, IncomingMessage, ServerResponse } from 'http';
import { config } from '../config/index.js';
import { bootstrapApp } from '../bootstrap/index.js';
import { apiV1Router } from '../../api/v1/router.js';
import { logger } from '../../infrastructure/logging/logger.js';

export function createHttpServer() {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', config.corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check root
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'shongre-backend', version: '1.0.0' }));
      return;
    }

    // Delegate to API v1 Router
    await apiV1Router.handleRequest(req, res);
  });

  return server;
}

export async function startServer() {
  await bootstrapApp();
  const server = createHttpServer();

  server.listen(config.port, () => {
    logger.info(`⚡ Shongre Backend API running on http://localhost:${config.port}${config.apiPrefix}`);
    logger.info(`⚡ Health check available at http://localhost:${config.port}/health`);
  });

  return server;
}

// Start immediately if executed directly
if (process.env.NODE_ENV !== 'test' && import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((err) => {
    logger.error('Fatal server startup error', { error: err.message });
    process.exit(1);
  });
}
