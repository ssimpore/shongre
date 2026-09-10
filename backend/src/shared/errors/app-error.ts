import { STATUS_CODES } from "node:http";

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
  | "DELIVERY_FEATURE_UNAVAILABLE"
  | "DELIVERY_MARKET_MISMATCH"
  | "DELIVERY_REQUEST_NOT_OPEN"
  | "DELIVERY_REQUEST_EXPIRED"
  | "DELIVERY_APPLICATION_EXISTS"
  | "DELIVERY_APPLICATION_CONFLICT"
  | "DELIVERY_NOT_ELIGIBLE"
  | "DELIVERY_ASSIGNMENT_CONFLICT"
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
  | "TAXONOMY_OPTION_QUERY_INVALID"
  /**
   * A third-party geocoder is unavailable or has exhausted its budget.
   *
   * Distinct from `NETWORK_ERROR` because it is actionable by the client in a
   * specific way: address autocomplete stops working, and typing a town by hand
   * still does. Nothing else in the product depends on it.
   */
  | "GEOCODING_UNAVAILABLE";

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
        case "DELIVERY_REQUEST_NOT_OPEN":
        case "DELIVERY_REQUEST_EXPIRED":
        case "DELIVERY_APPLICATION_EXISTS":
        case "DELIVERY_APPLICATION_CONFLICT":
        case "DELIVERY_ASSIGNMENT_CONFLICT":
          this.statusCode = 409;
          break;
        case "DELIVERY_FEATURE_UNAVAILABLE":
          this.statusCode = 404;
          break;
        case "DELIVERY_MARKET_MISMATCH":
        case "DELIVERY_NOT_ELIGIBLE":
          this.statusCode = 403;
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

  public toJSON(requestId?: string) {
    return {
      type: "about:blank",
      title: STATUS_CODES[this.statusCode] || "Request failed",
      status: this.statusCode,
      code: this.code,
      detail: this.message,
      ...(requestId ? { requestId } : {}),
      // v1 clients still consume this documented extension. Removing it is a
      // versioned contract change, not part of adding Problem Details fields.
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        details: this.details,
      },
    };
  }
}
