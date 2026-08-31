import type { IncomingHttpHeaders } from "node:http";
import {
  countryCodeSchema,
  resolveCountryFromCoordinates,
  resolveCountryRecommendation,
  type MarketDetectionRecommendation,
} from "@shongre/contracts";
import { config } from "../../app/config/index.js";

export interface IpCountrySignal {
  countryCode?: string | null;
  proxyOrVpnLikely?: boolean;
}

function firstHeaderValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] || "") : String(value || "");
}

/**
 * Resolves coarse edge geolocation without ever reading or returning an IP.
 * The configured ingress must remove any client-supplied header with the same
 * name before injecting the provider result.
 */
export class MarketDetectionService {
  constructor(
    private readonly trustedCountryHeader:
      string | null = config.trustedIpCountryHeader,
  ) {}

  detectFromCountrySignal(
    signal: IpCountrySignal,
  ): MarketDetectionRecommendation {
    const normalized = String(signal.countryCode || "")
      .trim()
      .toUpperCase();
    const validCode = countryCodeSchema.safeParse(normalized);
    return resolveCountryRecommendation({
      countryCode: validCode.success ? validCode.data : null,
      source: "ip",
      confidence: validCode.success ? "medium" : "low",
      proxyOrVpnLikely:
        signal.proxyOrVpnLikely === true ||
        (normalized.length > 0 && !validCode.success),
    });
  }

  detectFromHeaders(
    headers: IncomingHttpHeaders,
  ): MarketDetectionRecommendation {
    const headerName = this.trustedCountryHeader;
    if (!headerName) {
      return resolveCountryRecommendation({
        countryCode: null,
        source: "ip",
        confidence: "low",
      });
    }
    return this.detectFromCountrySignal({
      countryCode: firstHeaderValue(headers[headerName]),
    });
  }

  detectFromCoordinates(input: unknown): MarketDetectionRecommendation {
    const value = input as {
      latitude?: number;
      longitude?: number;
      accuracy?: number;
    };
    return resolveCountryFromCoordinates({
      latitude: value?.latitude as number,
      longitude: value?.longitude as number,
      accuracy: value?.accuracy,
    });
  }
}

export const marketDetectionService = new MarketDetectionService();
