import { isIP } from "node:net";
import type { DigitalMarketPolicy } from "@shongre/contracts/digital-products";
import { AppError } from "../../shared/errors/app-error.js";

const FORBIDDEN_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
]);

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part)))
    return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isUnsafeIp(hostname: string): boolean {
  if (isIP(hostname) === 4) return isPrivateIpv4(hostname);
  if (isIP(hostname) !== 6) return false;
  const normalized = hostname.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

function domainMatches(
  hostname: string,
  accepted: string,
  allowSubdomains: boolean,
) {
  const normalized = accepted.toLowerCase().replace(/^\.+|\.+$/g, "");
  return (
    hostname === normalized ||
    (allowSubdomains && hostname.endsWith(`.${normalized}`))
  );
}

export interface ValidatedExternalDestination {
  secretUrl: string;
  destinationDomain: string;
}

/**
 * Validates a destination without making a network request. Any future fetcher
 * must repeat DNS resolution and redirect checks immediately before connecting.
 */
export function validateExternalDestination(
  rawUrl: string,
  policy: DigitalMarketPolicy["externalLinks"],
  displayDomain?: string,
): ValidatedExternalDestination {
  let destination: URL;
  try {
    destination = new URL(rawUrl);
  } catch {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Lien d’accès invalide.",
    });
  }
  const hostname = destination.hostname.toLowerCase().replace(/\.$/, "");
  if (
    destination.protocol !== "https:" ||
    destination.username ||
    destination.password ||
    !hostname ||
    FORBIDDEN_HOSTS.has(hostname) ||
    hostname.endsWith(".localhost") ||
    isUnsafeIp(hostname)
  ) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Cette destination d’accès n’est pas autorisée.",
    });
  }
  if (
    policy.acceptedDomains.length === 0 ||
    !policy.acceptedDomains.some((accepted) =>
      domainMatches(hostname, accepted, policy.allowSubdomains),
    )
  ) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Le domaine de destination n’est pas autorisé pour ce marché.",
    });
  }
  if (!policy.allowQuery && destination.search) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Les paramètres de lien ne sont pas autorisés.",
    });
  }
  if (!policy.allowFragment && destination.hash) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Les fragments de lien ne sont pas autorisés.",
    });
  }
  if (
    displayDomain &&
    !domainMatches(hostname, displayDomain, policy.allowSubdomains)
  ) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Le domaine affiché ne correspond pas à la destination.",
    });
  }
  return { secretUrl: destination.toString(), destinationDomain: hostname };
}

export function assertSafeResolvedAddress(address: string): void {
  if (isIP(address) === 0 || isUnsafeIp(address)) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "La destination réseau résolue n’est pas autorisée.",
    });
  }
}
