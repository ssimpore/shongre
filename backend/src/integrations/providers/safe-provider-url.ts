import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { AppError } from "../../shared/errors/app-error.js";

export interface ProviderUrlPolicy {
  allowPrivateNetwork?: boolean;
  allowedProtocols?: readonly ("https:" | "http:")[];
  allowedPorts?: readonly string[];
}

function ipv4Number(address: string): number {
  return address
    .split(".")
    .reduce((value, octet) => (value * 256 + Number(octet)) >>> 0, 0);
}

function ipv4InCidr(address: string, base: string, prefix: number) {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipv4Number(address) & mask) === (ipv4Number(base) & mask);
}

export function isPublicProviderAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const blocked: Array<[string, number]> = [
      ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10],
      ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
      ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16],
      ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
      ["224.0.0.0", 4], ["240.0.0.0", 4],
    ];
    return !blocked.some(([base, prefix]) => ipv4InCidr(address, base, prefix));
  }
  if (version === 6) {
    const normalized = address.toLocaleLowerCase("en-US");
    if (normalized.startsWith("::ffff:")) {
      return isPublicProviderAddress(normalized.slice("::ffff:".length));
    }
    return !(
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      /^fe[89ab]/.test(normalized) ||
      normalized.startsWith("ff")
    );
  }
  return false;
}

function unsafe(message: string): never {
  throw new AppError({
    code: "VALIDATION_ERROR",
    message,
    details: { reason: "unsafe_provider_endpoint" },
  });
}

/**
 * Validates a configurable provider endpoint before every outbound hop.
 * Redirects must be processed manually and passed through this function again.
 */
export async function assertSafeProviderUrl(
  rawUrl: string,
  policy: ProviderUrlPolicy = {},
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return unsafe("L’URL du fournisseur est invalide.");
  }
  const allowedProtocols = policy.allowedProtocols ?? ["https:"];
  if (!allowedProtocols.includes(url.protocol as "https:" | "http:")) {
    return unsafe("Le protocole du fournisseur n’est pas autorisé.");
  }
  if (url.username || url.password) {
    return unsafe("Les identifiants ne doivent pas apparaître dans l’URL.");
  }
  if (url.hash) return unsafe("Les fragments d’URL fournisseur sont interdits.");
  const allowedPorts = policy.allowedPorts ?? ["", "443"];
  if (!allowedPorts.includes(url.port)) {
    return unsafe("Le port du fournisseur n’est pas autorisé.");
  }
  const hostname = url.hostname.toLocaleLowerCase("en-US").replace(/\.$/, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "metadata.google.internal"
  ) {
    return unsafe("L’hôte du fournisseur n’est pas autorisé.");
  }
  if (!policy.allowPrivateNetwork && isIP(hostname) && !isPublicProviderAddress(hostname)) {
    return unsafe("L’adresse réseau du fournisseur n’est pas publique.");
  }
  if (!isIP(hostname)) {
    let addresses: Array<{ address: string; family: number }>;
    try {
      addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch {
      return unsafe("Le nom d’hôte du fournisseur ne peut pas être résolu.");
    }
    if (!addresses.length) return unsafe("Le fournisseur ne résout aucune adresse.");
    if (
      !policy.allowPrivateNetwork &&
      addresses.some(({ address }) => !isPublicProviderAddress(address))
    ) {
      return unsafe("Le fournisseur résout vers un réseau non public.");
    }
  }
  return url;
}

export async function safeProviderFetch(
  rawUrl: string,
  init: RequestInit = {},
  policy: ProviderUrlPolicy = {},
  remainingRedirects = 2,
): Promise<Response> {
  const safeUrl = await assertSafeProviderUrl(rawUrl, policy);
  const response = await fetch(safeUrl, { ...init, redirect: "manual" });
  if (response.status >= 300 && response.status < 400) {
    if (remainingRedirects <= 0) {
      throw new AppError({ code: "NETWORK_ERROR", statusCode: 502, message: "Trop de redirections fournisseur." });
    }
    const location = response.headers.get("location");
    if (!location) {
      throw new AppError({ code: "NETWORK_ERROR", statusCode: 502, message: "Redirection fournisseur invalide." });
    }
    return safeProviderFetch(new URL(location, safeUrl).toString(), init, policy, remainingRedirects - 1);
  }
  return response;
}
