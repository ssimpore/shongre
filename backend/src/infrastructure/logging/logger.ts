import { requestContext } from "../observability/request-context.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  traceId?: string;
  userId?: string;
  orderId?: string;
  listingId?: string;
  [key: string]: unknown;
}

const REDACTED = "[REDACTED]";
const SENSITIVE_FIELD =
  /authorization|cookie|password|secret|token|private|credential|api[-_]?key|service[-_]?role|encryption[-_]?key|pepper|database[-_]?url/i;
const SENSITIVE_ENVIRONMENT_NAME =
  /authorization|cookie|password|secret|token|private|credential|api_key|service_role|encryption_key|pepper|database_url/i;

function configuredSecretValues(): string[] {
  return Object.entries(process.env)
    .filter(
      ([name, value]) =>
        SENSITIVE_ENVIRONMENT_NAME.test(name) &&
        Boolean(value && value.length >= 8),
    )
    .map(([, value]) => value as string)
    .sort((left, right) => right.length - left.length);
}

function redactString(value: string, secrets: readonly string[]): string {
  let sanitized = value
    .replace(/(bearer\s+)[^\s,;]+/gi, `$1${REDACTED}`)
    .replace(
      /\b[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g,
      REDACTED,
    );
  for (const secret of secrets) {
    sanitized = sanitized.split(secret).join(REDACTED);
  }
  return sanitized;
}

function redactValue(
  value: unknown,
  fieldName: string,
  ancestors: WeakSet<object>,
  secrets: readonly string[],
): unknown {
  if (SENSITIVE_FIELD.test(fieldName)) return REDACTED;
  if (typeof value === "string") return redactString(value, secrets);
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof URL) return redactString(value.toString(), secrets);
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message, secrets),
    };
  }
  if (ancestors.has(value)) return "[Circular]";
  ancestors.add(value);
  const redacted = Array.isArray(value)
    ? value.map((item) => redactValue(item, fieldName, ancestors, secrets))
    : Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          redactValue(item, key, ancestors, secrets),
        ]),
      );
  ancestors.delete(value);
  return redacted;
}

function redactContext(
  context: LogContext | undefined,
  secrets: readonly string[],
): LogContext {
  if (!context) return {};
  return redactValue(context, "context", new WeakSet(), secrets) as LogContext;
}

export function redactLogContext(context?: LogContext): LogContext {
  return redactContext(context, configuredSecretValues());
}

const DIAGNOSTIC_MESSAGE_LIMIT = 500;
const DIAGNOSTIC_STACK_LIMIT = 4_000;

/**
 * What an operator needs to diagnose a failure: its class, its stable code
 * (SQLSTATE, PostgREST, Node) and message — never provider `details`, which
 * carry row values. The logger still redacts secrets from every string.
 */
export function errorDiagnostics(
  error: unknown,
  options: { includeStack?: boolean } = {},
): LogContext {
  if (error === null || error === undefined) return {};
  if (typeof error !== "object")
    return {
      errorMessage: String(error).slice(0, DIAGNOSTIC_MESSAGE_LIMIT),
    };
  const candidate = error as {
    name?: unknown;
    code?: unknown;
    message?: unknown;
    stack?: unknown;
  };
  return {
    errorName:
      typeof candidate.name === "string"
        ? candidate.name
        : error instanceof Error
          ? "Error"
          : "Object",
    ...(typeof candidate.code === "string" || typeof candidate.code === "number"
      ? { errorCode: String(candidate.code) }
      : {}),
    ...(typeof candidate.message === "string"
      ? {
          errorMessage: candidate.message.slice(0, DIAGNOSTIC_MESSAGE_LIMIT),
        }
      : {}),
    ...(options.includeStack && typeof candidate.stack === "string"
      ? { errorStack: candidate.stack.slice(0, DIAGNOSTIC_STACK_LIMIT) }
      : {}),
  };
}

export class Logger {
  private scope: string;

  constructor(scope = "App") {
    this.scope = scope;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): string {
    const timestamp = new Date().toISOString();
    const secrets = configuredSecretValues();
    const payload = {
      ...redactContext({ ...requestContext.getStore(), ...context }, secrets),
      timestamp,
      level: level.toUpperCase(),
      scope: this.scope,
      message: redactString(message, secrets),
      appEnvironment: process.env.APP_ENV || "unknown",
      environmentId: process.env.ENVIRONMENT_ID || "unknown",
    };
    return JSON.stringify(payload);
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== "test") {
      console.debug(this.formatMessage("debug", message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== "test") {
      console.log(this.formatMessage("info", message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage("warn", message, context));
  }

  error(message: string, context?: LogContext): void {
    console.error(this.formatMessage("error", message, context));
  }
}

export const logger = new Logger("Server");
