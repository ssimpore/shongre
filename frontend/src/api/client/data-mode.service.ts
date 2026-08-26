import { apiClientConfig, type DataMode } from "./api-client.config";

export const DATA_MODE_STORAGE_KEY = "shongre_data_mode_v1";

interface DataModeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface DataModeServiceOptions {
  storage?: DataModeStorage | null;
  fetcher?: typeof fetch;
  apiBaseUrl?: string;
  defaultMode?: DataMode;
  availabilityTimeoutMs?: number;
}

export type LiveModeErrorCode =
  "LIVE_API_NOT_CONFIGURED" | "LIVE_API_UNAVAILABLE";

export class LiveModeError extends Error {
  constructor(
    public readonly code: LiveModeErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "LiveModeError";
  }
}

function browserStorage(): DataModeStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function resolveLiveReadinessUrl(apiBaseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(apiBaseUrl);
  } catch {
    throw new LiveModeError(
      "LIVE_API_NOT_CONFIGURED",
      "NEXT_PUBLIC_API_URL must be an absolute HTTP(S) URL.",
    );
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new LiveModeError(
      "LIVE_API_NOT_CONFIGURED",
      "NEXT_PUBLIC_API_URL must use HTTP or HTTPS.",
    );
  }

  const apiPath = parsed.pathname.replace(/\/+$/, "");
  const rootPath = apiPath.endsWith("/api/v1")
    ? apiPath.slice(0, -"/api/v1".length)
    : apiPath;
  parsed.pathname = `${rootPath}/readyz`.replace(/\/{2,}/g, "/");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

/**
 * Owns the browser's data-source selection.
 *
 * The build configuration remains the fallback, while the versioned local
 * preference is the only runtime override. Service adapters consume this
 * value centrally; pages never branch on data mode.
 */
export class DataModeService {
  private readonly storage: DataModeStorage | null;
  private readonly fetcher: typeof fetch | undefined;
  private readonly apiBaseUrl: string;
  private readonly defaultMode: DataMode | undefined;
  private readonly availabilityTimeoutMs: number;
  private selectedMode: DataMode | null = null;

  constructor(options: DataModeServiceOptions = {}) {
    this.storage =
      options.storage === undefined ? browserStorage() : options.storage;
    this.fetcher = options.fetcher ?? globalThis.fetch;
    this.apiBaseUrl = options.apiBaseUrl ?? apiClientConfig.apiBaseUrl;
    this.defaultMode = options.defaultMode;
    this.availabilityTimeoutMs = options.availabilityTimeoutMs ?? 5_000;
  }

  getActiveMode(): DataMode {
    if (this.selectedMode) return this.selectedMode;

    const persisted = this.storage?.getItem(DATA_MODE_STORAGE_KEY);
    if (persisted === "demo" || persisted === "api") return persisted;
    if (persisted) this.storage?.removeItem(DATA_MODE_STORAGE_KEY);
    return this.defaultMode ?? apiClientConfig.dataMode;
  }

  isLiveConfigured(): boolean {
    try {
      resolveLiveReadinessUrl(this.apiBaseUrl);
      return true;
    } catch {
      return false;
    }
  }

  async assertLiveAvailable(): Promise<void> {
    if (!this.apiBaseUrl.trim() || !this.fetcher) {
      throw new LiveModeError(
        "LIVE_API_NOT_CONFIGURED",
        "The live API URL is not configured in this frontend build.",
      );
    }

    const readinessUrl = resolveLiveReadinessUrl(this.apiBaseUrl);
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.availabilityTimeoutMs,
    );

    try {
      // Native browser fetch validates its receiver. Calling the stored
      // function as `this.fetcher(...)` binds `this` to DataModeService and
      // Chrome rejects the request with `TypeError: Illegal invocation`.
      const response = await this.fetcher.call(globalThis, readinessUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new LiveModeError(
          "LIVE_API_UNAVAILABLE",
          `The live API readiness check returned HTTP ${response.status}.`,
        );
      }
    } catch (error) {
      if (error instanceof LiveModeError) throw error;
      throw new LiveModeError(
        "LIVE_API_UNAVAILABLE",
        "The live API could not be reached.",
        { cause: error },
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async selectMode(nextMode: DataMode): Promise<void> {
    if (nextMode === "api") await this.assertLiveAvailable();

    this.storage?.setItem(DATA_MODE_STORAGE_KEY, nextMode);
    this.selectedMode = nextMode;
  }
}

export const dataModeService = new DataModeService();

export const isDemoMode = (): boolean =>
  dataModeService.getActiveMode() === "demo";
export const isApiMode = (): boolean =>
  dataModeService.getActiveMode() === "api";
