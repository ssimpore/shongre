import "reflect-metadata";
import { IncomingMessage, ServerResponse } from "http";
import { randomUUID } from "crypto";
import { gzip } from "zlib";
import { promisify } from "util";
import {
  All,
  ArgumentsHost,
  Catch,
  Controller,
  type ExceptionFilter,
  Inject,
  Module,
  Req,
  Res,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { WsAdapter } from "@nestjs/platform-ws";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import { buildApiUrl, config } from "../config/index.js";
import { bootstrapApp } from "../bootstrap/index.js";
import { apiV1Router, type ParsedRequestBody } from "../../api/v1/router.js";
import { requestContext } from "../../infrastructure/observability/request-context.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  openApiDocument,
  renderApiDocumentation,
} from "../../infrastructure/http/openapi-documentation.js";
import { developerConsolePage } from "../../infrastructure/http/developer-console.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { QueueModule } from "../../infrastructure/queue/queue.module.js";
import { RedisHealthService } from "../../infrastructure/queue/redis-health.service.js";
import { RealtimeModule } from "../../infrastructure/realtime/realtime.module.js";

const gzipAsync = promisify(gzip);

/**
 * The origin serves exactly two HTML documents and both are constant for the
 * life of the process, so each one is compressed once.
 */
const compressedDocuments = new Map<string, Buffer>();

async function compressDocument(html: string): Promise<Buffer> {
  const cached = compressedDocuments.get(html);
  if (cached) return cached;
  const compressed = await gzipAsync(html);
  compressedDocuments.set(html, compressed);
  return compressed;
}

/**
 * Serves an origin-owned HTML document with the API's negotiated gzip encoding.
 */
async function writeHtmlDocument(
  req: IncomingMessage,
  res: ServerResponse,
  html: string,
): Promise<void> {
  const acceptsGzip = String(req.headers["accept-encoding"] || "")
    .split(",")
    .some((value) => value.trim().split(";")[0] === "gzip");
  const payload: string | Buffer =
    acceptsGzip &&
    Buffer.byteLength(html) >= config.performance.compressionMinimumBytes
      ? await compressDocument(html)
      : html;
  const vary = new Set(
    String(res.getHeader("Vary") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ).add("Accept-Encoding");
  const headers: Record<string, string | number> = {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    Vary: [...vary].join(", "),
  };
  if (Buffer.isBuffer(payload)) headers["Content-Encoding"] = "gzip";
  res.writeHead(200, headers);
  res.end(payload);
}

function resolveRequestId(value: unknown): string {
  const supplied = String(value || "");
  return /^[A-Za-z0-9._-]{1,128}$/.test(supplied) ? supplied : randomUUID();
}

function sendTransportError(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const transportError = error as {
    statusCode?: number;
    code?: string;
    name?: string;
    getStatus?: () => number;
  };
  const requestId = resolveRequestId(request.headers["x-request-id"]);
  const candidateStatus = Number(
    transportError.getStatus?.() || transportError.statusCode || 500,
  );
  const statusCode =
    candidateStatus >= 400 && candidateStatus < 500 ? candidateStatus : 500;
  const message =
    statusCode === 413
      ? "Corps de requête trop volumineux."
      : statusCode < 500
        ? "La requête est invalide."
        : "Une erreur interne est survenue.";
  logger[statusCode < 500 ? "warn" : "error"]("http_transport_rejected", {
    requestId,
    method: request.method,
    path: request.url,
    statusCode,
    errorCode: transportError.code,
    errorName: transportError.name,
  });
  reply
    .header("X-Request-Id", requestId)
    .header("Cache-Control", "no-store")
    .header("Referrer-Policy", "no-referrer")
    .header("X-Content-Type-Options", "nosniff")
    .header("X-Frame-Options", "DENY")
    .header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    .header("Cross-Origin-Resource-Policy", "same-site")
    .status(statusCode)
    .send(
      new AppError({
        code: statusCode < 500 ? "BAD_REQUEST" : "INTERNAL_ERROR",
        statusCode,
        message,
      }).toJSON(requestId),
    );
}

@Catch()
class TransportExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    sendTransportError(
      error,
      host.switchToHttp().getRequest<FastifyRequest>(),
      host.switchToHttp().getResponse<FastifyReply>(),
    );
  }
}

function rejectMalformedPath(
  path: string,
  request: IncomingMessage,
  response: ServerResponse,
): void {
  const requestId = resolveRequestId(request.headers["x-request-id"]);
  logger.warn("http_transport_rejected", {
    requestId,
    method: request.method,
    path,
    statusCode: 400,
    errorCode: "FST_ERR_BAD_URL",
  });
  const body = JSON.stringify(
    new AppError({
      code: "BAD_REQUEST",
      statusCode: 400,
      message: "Le chemin de la requête est invalide.",
    }).toJSON(requestId),
  );
  response.writeHead(400, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "X-Request-Id": requestId,
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Resource-Policy": "same-site",
  });
  response.end(body);
}

export async function handleHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  parsedRequestBody?: ParsedRequestBody,
  redisHealth: RedisHealthService = new RedisHealthService(),
): Promise<void> {
  const startedAt = performance.now();
  const requestId = resolveRequestId(req.headers["x-request-id"]);
  return requestContext.run({ requestId }, async () => {
    const context = requestContext.getStore()!;
    res.setHeader("X-Request-Id", requestId);
    res.once("finish", () => {
      logger.info("http_request_completed", {
        requestId,
        operationId: context.operationId,
        marketCode: context.marketCode,
        method: req.method || "GET",
        path: context.route || "[operational-or-unmatched]",
        statusCode: res.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
        cacheControl: String(res.getHeader("Cache-Control") || ""),
        cacheTagCount: String(res.getHeader("Cache-Tag") || "")
          .split(",")
          .filter(Boolean).length,
        contentEncoding: String(
          res.getHeader("Content-Encoding") || "identity",
        ),
        responseBytes: Number(res.getHeader("Content-Length") || 0),
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
      "Content-Type, Authorization, Accept, X-CSRF-Token, X-Shongre-Client, X-Shongre-Market, X-Request-Id, Idempotency-Key, If-None-Match",
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

    if (req.method === "GET" && req.url === "/api/openapi.json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(await openApiDocument()));
      return;
    }
    if (req.method === "GET" && req.url === "/api/docs") {
      await writeHtmlDocument(req, res, await renderApiDocumentation());
      return;
    }

    // Developer console for browsers, service descriptor for everything else.
    if (req.url === "/") {
      if (acceptHeader.includes("text/html")) {
        await writeHtmlDocument(req, res, await developerConsolePage());
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
      req.url === "/health/live" ||
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
    if (
      req.url === "/readyz" ||
      req.url === "/api/ready" ||
      req.url === "/health/ready"
    ) {
      const [databaseReady, redisReady] = await Promise.all([
        import("../../infrastructure/database/db-client.js").then(({ db }) =>
          db.healthCheck(),
        ),
        redisHealth.check(),
      ]);
      const ready = databaseReady && redisReady;
      const statusCode = ready ? 200 : 503;
      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: ready ? "ready" : "not_ready",
          service: "shongre-backend",
          version: config.version,
          environment: config.environment.environment,
          release: config.release,
          dependencies: {
            database: databaseReady ? "up" : "down",
            redis: redisReady ? "up" : "down",
          },
        }),
      );
      return;
    }

    // Delegate to API v1 Router
    await apiV1Router
      .handleRequest(req, res, parsedRequestBody)
      .catch((error: unknown) => {
        // Parsing and dispatch failures must remain request-local, including
        // failures before the router can select an operation.
        const invalidUrl =
          error instanceof TypeError &&
          "code" in error &&
          error.code === "ERR_INVALID_URL";
        if (!invalidUrl)
          logger.error("http_dispatch_failed", {
            errorName: error instanceof Error ? error.name : "UnknownError",
            operationId: context.operationId,
            requestId,
          });
        if (res.headersSent) {
          res.destroy();
          return;
        }
        res.writeHead(invalidUrl ? 400 : 500, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        res.end(
          JSON.stringify(
            new AppError({
              code: invalidUrl ? "BAD_REQUEST" : "INTERNAL_ERROR",
              message: invalidUrl
                ? "Le chemin de la requête est invalide."
                : "Une erreur interne est survenue.",
            }).toJSON(requestId),
          ),
        );
      });
  });
}

type FastifyRequestWithRawBody = FastifyRequest & { rawBody?: Buffer };

@Controller()
class HttpTransportController {
  constructor(
    @Inject(RedisHealthService)
    private readonly redisHealth: RedisHealthService,
  ) {}

  @All("*")
  async dispatch(
    @Req() request: FastifyRequestWithRawBody,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const parsedRequestBody = ["POST", "PUT", "PATCH", "DELETE"].includes(
      request.method,
    )
      ? {
          body: request.body ?? null,
          rawBody: request.rawBody?.toString("utf8") || "",
        }
      : undefined;
    // Existing operation handlers write to ServerResponse directly. Hijacking
    // prevents Fastify from serializing a second response while the migration
    // retains the domain-owned route registry and response policies.
    reply.hijack();
    await handleHttpRequest(
      request.raw,
      reply.raw,
      parsedRequestBody,
      this.redisHealth,
    );
  }
}

@Module({
  imports: [QueueModule, RealtimeModule],
  controllers: [HttpTransportController],
})
class BackendApplicationModule {}

export async function createBackendApplication(): Promise<NestFastifyApplication> {
  const parserBodyLimit = config.maxRequestBodyBytes + 64 * 1_024;
  const adapter = new FastifyAdapter({
    bodyLimit: parserBodyLimit,
    requestTimeout: config.requestTimeoutMs,
    routerOptions: { onBadUrl: rejectMalformedPath },
  });
  const fastify = adapter.getInstance();
  const jsonParser = fastify.getDefaultJsonParser("error", "error");
  adapter.useBodyParser(
    "application/json",
    true,
    { bodyLimit: parserBodyLimit },
    (request, body, done) => {
      if (Buffer.isBuffer(body) && body.length === 0) {
        done(null, null);
        return;
      }
      jsonParser(request, body.toString("utf8"), done);
    },
  );
  const app = await NestFactory.create<NestFastifyApplication>(
    BackendApplicationModule,
    adapter,
    { logger: false, rawBody: true },
  );
  app.useGlobalFilters(new TransportExceptionFilter());
  app.useWebSocketAdapter(new WsAdapter(app));
  await app.init();
  const server = app.getHttpServer();
  server.requestTimeout = config.requestTimeoutMs;
  server.headersTimeout = Math.min(
    config.requestTimeoutMs,
    config.performance.headersTimeoutMs,
  );
  server.keepAliveTimeout = config.performance.keepAliveTimeoutMs;
  server.maxRequestsPerSocket = config.performance.maxRequestsPerSocket;
  return app;
}

export async function startServer() {
  await bootstrapApp();
  const app = await createBackendApplication();
  await app.listen(config.port, config.host);
  const server = app.getHttpServer();

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
  const shutdown = async (signal: NodeJS.Signals) => {
    if (stopping) return;
    stopping = true;
    logger.info("graceful_shutdown_started", { signal });
    const forceTimer = setTimeout(() => {
      logger.error("graceful_shutdown_deadline_exceeded", { signal });
      server.closeAllConnections?.();
      process.exitCode = 1;
    }, config.shutdownGraceMs);
    forceTimer.unref();
    try {
      await app.close();
      clearTimeout(forceTimer);
      logger.info("graceful_shutdown_completed", { signal });
    } catch (error) {
      clearTimeout(forceTimer);
      logger.error("graceful_shutdown_failed", {
        signal,
        error: error instanceof Error ? error.message : String(error),
      });
      process.exitCode = 1;
    }
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);

  return app;
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
