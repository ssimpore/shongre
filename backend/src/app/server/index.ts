import { createServer, IncomingMessage, ServerResponse } from "http";
import { randomUUID } from "crypto";
import { buildApiUrl, config } from "../config/index.js";
import { bootstrapApp } from "../bootstrap/index.js";
import { apiV1Router } from "../../api/v1/router.js";
import { logger } from "../../infrastructure/logging/logger.js";

function renderBackendHomePage(
  port: number,
  prefix: string,
  frontendUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shongre Backend API</title>
  <style>
    :root {
      --bg: #090d16;
      --card: #111827;
      --card-hover: #1f2937;
      --border: #1f2937;
      --text: #f9fafb;
      --muted: #9ca3af;
      --primary: #38bdf8;
      --success: #34d399;
      --success-glow: rgba(52, 211, 153, 0.15);
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 2.5rem 1rem;
      display: flex;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      max-width: 760px;
      width: 100%;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .brand-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #38bdf8, #818cf8);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: #090d16;
      font-size: 1.25rem;
    }
    h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .subtitle {
      margin: 0.25rem 0 0;
      color: var(--muted);
      font-size: 0.875rem;
    }
    .badge {
      background: var(--success-glow);
      color: var(--success);
      border: 1px solid rgba(52, 211, 153, 0.3);
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .dot {
      width: 8px;
      height: 8px;
      background: var(--success);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--success);
    }
    .section-title {
      font-size: 0.8125rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      margin: 1.5rem 0 0.75rem;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.75rem;
    }
    .link-item {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.875rem 1rem;
      text-decoration: none;
      color: inherit;
      transition: all 0.15s ease;
      display: flex;
      flex-direction: column;
    }
    .link-item:hover {
      background: var(--card-hover);
      border-color: var(--primary);
      transform: translateY(-1px);
    }
    .link-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--primary);
      margin-bottom: 0.2rem;
    }
    .link-path {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.75rem;
      color: var(--muted);
    }
    .cta-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #0284c7;
      color: white;
      text-decoration: none;
      padding: 0.6rem 1.2rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.875rem;
      transition: background 0.15s;
    }
    .cta-btn:hover {
      background: #0369a1;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">
        <div class="brand-icon">S</div>
        <div>
          <h1>Shongre Backend API</h1>
          <p class="subtitle">Multi-country classifieds and marketplace payment platform</p>
        </div>
      </div>
      <div class="badge">
        <span class="dot"></span> Online (Port ${port})
      </div>
    </div>

    <div class="card" style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
      <div>
        <div style="font-weight: 600; font-size: 1rem; margin-bottom: 0.25rem;">Frontend Web Application</div>
        <div style="color: var(--muted); font-size: 0.875rem;">Access the marketplace UI, search, publication wizard & workspaces.</div>
      </div>
      <a href="${frontendUrl || "#"}" class="cta-btn" target="_blank" rel="noreferrer">
        Open Frontend ➜
      </a>
    </div>

    <div class="section-title">Core API Endpoints</div>
    <div class="grid">
      <a class="link-item" href="/health" target="_blank">
        <span class="link-name">Health Check</span>
        <span class="link-path">GET /health</span>
      </a>
      <a class="link-item" href="${prefix}/taxonomy/root" target="_blank">
        <span class="link-name">Taxonomy Tree</span>
        <span class="link-path">GET ${prefix}/taxonomy/root</span>
      </a>
      <a class="link-item" href="${prefix}/listings" target="_blank">
        <span class="link-name">Listings Feed</span>
        <span class="link-path">GET ${prefix}/listings</span>
      </a>
      <a class="link-item" href="${prefix}/markets" target="_blank">
        <span class="link-name">Supported Markets</span>
        <span class="link-path">GET ${prefix}/markets</span>
      </a>
      <a class="link-item" href="${prefix}/business-rules/catalog?marketCode=FR" target="_blank">
        <span class="link-name">Commercial Catalog</span>
        <span class="link-path">GET ${prefix}/business-rules/catalog</span>
      </a>
      <a class="link-item" href="${prefix}/admin/stats" target="_blank">
        <span class="link-name">Admin Platform Stats</span>
        <span class="link-path">GET ${prefix}/admin/stats</span>
      </a>
    </div>
  </div>
</body>
</html>`;
}

export function createHttpServer() {
  const server = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      const startedAt = performance.now();
      const suppliedRequestId = String(req.headers["x-request-id"] || "");
      const requestId = /^[A-Za-z0-9._-]{1,128}$/.test(suppliedRequestId)
        ? suppliedRequestId
        : randomUUID();
      res.setHeader("X-Request-Id", requestId);
      res.once("finish", () => {
        logger.info("http_request_completed", {
          traceId: requestId,
          method: req.method || "GET",
          path: new URL(req.url || "/", "http://request.invalid").pathname,
          statusCode: res.statusCode,
          durationMs: Math.round(performance.now() - startedAt),
        });
      });

      // Set CORS headers
      const requestOrigin = String(req.headers.origin || "");
      const configuredOrigins = new Set([
        ...config.corsOrigin
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        ...config.oauthAllowedReturnOrigins,
      ]);
      if (requestOrigin && configuredOrigins.has(requestOrigin)) {
        res.setHeader("Access-Control-Allow-Origin", requestOrigin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Vary", "Origin");
      }
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS, PATCH",
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Accept, X-CSRF-Token, X-Shongre-Client, X-Shongre-Market, X-Request-Id",
      );
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()",
      );
      res.setHeader("Cross-Origin-Resource-Policy", "same-site");
      if (config.environment.environment === "production") {
        res.setHeader(
          "Strict-Transport-Security",
          "max-age=31536000; includeSubDomains",
        );
      }
      res.setHeader("Cache-Control", "no-store");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const acceptHeader = req.headers.accept || "";

      // Backend Home Page (HTML in browser, JSON otherwise)
      if (req.url === "/") {
        if (acceptHeader.includes("text/html")) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(
            renderBackendHomePage(
              config.port,
              config.apiPrefix,
              config.frontendUrl,
            ),
          );
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ok",
            service: "shongre-backend",
            version: config.version,
            environment: config.environment.environment,
            release: config.release,
            port: config.port,
            home: config.publicApiUrl,
            api: buildApiUrl("/"),
            health: new URL("/health", config.environment.urls.api).toString(),
          }),
        );
        return;
      }

      // Liveness is deliberately shallow: it answers whether this process can
      // serve HTTP, without ejecting every replica during a dependency outage.
      if (
        req.url === "/health" ||
        req.url === "/livez" ||
        req.url === "/api/health"
      ) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ok",
            service: "shongre-backend",
            version: config.version,
            environment: config.environment.environment,
            release: config.release,
          }),
        );
        return;
      }

      // Readiness is dependency-aware and returns a failing status so the
      // orchestrator does not route traffic before the database is usable.
      if (req.url === "/readyz" || req.url === "/api/ready") {
        const databaseReady =
          await import("../../infrastructure/database/db-client.js").then(
            ({ db }) => db.healthCheck(),
          );
        const statusCode = databaseReady ? 200 : 503;
        res.writeHead(statusCode, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: databaseReady ? "ready" : "not_ready",
            service: "shongre-backend",
            version: config.version,
            environment: config.environment.environment,
            release: config.release,
            dependencies: { database: databaseReady ? "up" : "down" },
          }),
        );
        return;
      }

      // Delegate to API v1 Router
      await apiV1Router.handleRequest(req, res);
    },
  );

  server.requestTimeout = config.requestTimeoutMs;
  server.headersTimeout = Math.min(config.requestTimeoutMs, 15_000);
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 1_000;

  return server;
}

export async function startServer() {
  await bootstrapApp();
  const server = createHttpServer();

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  {
    console.log(
      `\n  \x1b[32m\x1b[1mSHONGRE BACKEND v1.0.0\x1b[0m \x1b[2mready on port ${config.port}\x1b[0m\n`,
    );
    console.log(
      `  \x1b[32m➜\x1b[0m  \x1b[1mLocal:\x1b[0m   \x1b[36mhttp://${config.host}:${config.port}/\x1b[0m`,
    );
    console.log(
      `  \x1b[32m➜\x1b[0m  \x1b[1mAPI:\x1b[0m     \x1b[36mhttp://${config.host}:${config.port}${config.apiPrefix}\x1b[0m`,
    );
    console.log(
      `  \x1b[32m➜\x1b[0m  \x1b[1mHealth:\x1b[0m  \x1b[36mhttp://${config.host}:${config.port}/health\x1b[0m\n`,
    );
  }

  let stopping = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (stopping) return;
    stopping = true;
    logger.info("graceful_shutdown_started", { signal });
    const forceTimer = setTimeout(() => {
      logger.error("graceful_shutdown_deadline_exceeded", { signal });
      server.closeAllConnections();
      process.exitCode = 1;
    }, config.shutdownGraceMs);
    forceTimer.unref();
    server.close((error) => {
      clearTimeout(forceTimer);
      if (error) {
        logger.error("graceful_shutdown_failed", {
          signal,
          error: error.message,
        });
        process.exitCode = 1;
      } else {
        logger.info("graceful_shutdown_completed", { signal });
      }
    });
    server.closeIdleConnections();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);

  return server;
}

// Start immediately if executed directly
if (
  process.env.NODE_ENV !== "test" &&
  import.meta.url === `file://${process.argv[1]}`
) {
  startServer().catch((err) => {
    logger.error("Fatal server startup error", { error: err.message });
    process.exit(1);
  });
}
