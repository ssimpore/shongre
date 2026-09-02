export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "BAD_REQUEST"
  | "INSUFFICIENT_FUNDS"
  | "ESCROW_ERROR"
  | "PAYMENT_FAILED"
  | "INVALID_PIN"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"
  | "TAXONOMY_VERSION_UNSUPPORTED"
  | "TAXONOMY_CATEGORY_NOT_FOUND"
  | "TAXONOMY_CATEGORY_NOT_PUBLISHABLE"
  | "TAXONOMY_LISTING_TYPE_NOT_FOUND"
  | "TAXONOMY_LISTING_TYPE_AMBIGUOUS"
  | "TAXONOMY_MARKET_UNAVAILABLE"
  | "TAXONOMY_SELLER_INELIGIBLE"
  | "TAXONOMY_UNKNOWN_ATTRIBUTE"
  | "TAXONOMY_REQUIRED_ATTRIBUTE"
  | "TAXONOMY_INVALID_ATTRIBUTE_TYPE"
  | "TAXONOMY_ATTRIBUTE_OUT_OF_RANGE"
  | "TAXONOMY_INVALID_OPTION"
  | "TAXONOMY_INVALID_OPTION_PARENT"
  | "TAXONOMY_ATTRIBUTE_NOT_APPLICABLE"
  | "TAXONOMY_IMMUTABLE_ATTRIBUTE"
  | "TAXONOMY_OPTION_QUERY_INVALID";

export interface AppErrorParams {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  details?: Record<string, unknown>;
  originalError?: unknown;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly originalError?: unknown;

  constructor(params: AppErrorParams) {
    super(params.message);
    this.name = "AppError";
    this.code = params.code;
    this.details = params.details;
    this.originalError = params.originalError;

    if (params.statusCode) {
      this.statusCode = params.statusCode;
    } else {
      switch (params.code) {
        case "UNAUTHENTICATED":
          this.statusCode = 401;
          break;
        case "FORBIDDEN":
          this.statusCode = 403;
          break;
        case "NOT_FOUND":
          this.statusCode = 404;
          break;
        case "VALIDATION_ERROR":
        case "BAD_REQUEST":
        case "INVALID_PIN":
          this.statusCode = 400;
          break;
        case "CONFLICT":
          this.statusCode = 409;
          break;
        case "RATE_LIMITED":
          this.statusCode = 429;
          break;
        case "PAYMENT_FAILED":
        case "ESCROW_ERROR":
          this.statusCode = 402;
          break;
        default:
          this.statusCode = 500;
      }
    }
  }

  public toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        details: this.details,
      },
    };
  }
}
