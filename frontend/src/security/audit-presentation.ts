import { labelIdentifier } from "../utilities/identifier-label";
import { roleLabel } from "./roles.config";

const AUDIT_FIELD_LABELS: Readonly<Record<string, string>> = {
  status: "Statut",
  badge: "Badge attribué",
  reason: "Motif",
  role: "Rôle",
  scope: "Périmètre",
  countries: "Marchés",
  marketCode: "Marché",
  providerId: "Fournisseur",
  enabled: "Activation",
  priority: "Priorité",
  environment: "Environnement",
  credentialStatus: "État des identifiants",
  credentialLastUpdatedAt: "Dernière mise à jour des identifiants",
  credentialKeyHint: "Indication de clé",
  health: "État de santé",
  healthLastCheckedAt: "Dernier contrôle de santé",
  healthMessage: "Message de santé",
  settings: "Paramètres",
  marketOverrides: "Surcharges par marché",
  updatedAt: "Dernière mise à jour",
  updatedBy: "Modifié par",
  version: "Version",
};

const AUDIT_VALUE_LABELS: Readonly<Record<string, string>> = {
  pro_verified: "Professionnel vérifié",
  offline_payment_solicitation: "Demande de paiement hors plateforme",
  INHERITED_FROM_FRANCE: "Hérité de la configuration France",
  configured: "Configurés",
  not_configured: "Non configurés",
  not_required: "Non requis",
  invalid: "Invalides",
  healthy: "Opérationnel",
  degraded: "Dégradé",
  unavailable: "Indisponible",
  unknown: "Inconnu",
};

const MARKET_LABELS: Readonly<Record<string, string>> = {
  FR: "France",
  BE: "Belgique",
  CH: "Suisse",
  ES: "Espagne",
  LU: "Luxembourg",
  DE: "Allemagne",
};

const DATE_FIELD_PATTERN = /(?:At|Date|timestamp)$/i;
const SENSITIVE_FIELD_PATTERN =
  /(?:secret|password|token|apiKey|privateKey|credentialValue)/i;
const TECHNICAL_VALUE_PATTERN = /^[a-z0-9]+(?:[._:-][a-z0-9]+)+$/i;
const SIMPLE_IDENTIFIER_PATTERN = /^[a-z][a-z0-9_]*$/;

export function formatAuditDateTime(
  isoDateString: string,
  locale = "fr-FR",
): string {
  const date = new Date(isoDateString);
  if (Number.isNaN(date.getTime())) return "Date indisponible";

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function auditFieldLabel(field: string): string {
  return (
    AUDIT_FIELD_LABELS[field] || MARKET_LABELS[field] || labelIdentifier(field)
  );
}

export function formatAuditValue(value: unknown, field?: string): string {
  if (field && SENSITIVE_FIELD_PATTERN.test(field)) return "Valeur masquée";
  if (value === null || value === undefined || value === "") {
    return "Non renseigné";
  }
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "number") return value.toLocaleString("fr-FR");
  if (typeof value !== "string") return String(value);

  if (field && DATE_FIELD_PATTERN.test(field)) {
    return formatAuditDateTime(value);
  }
  if (field === "role") return roleLabel(value);
  if (MARKET_LABELS[value]) return `${MARKET_LABELS[value]} (${value})`;
  if (AUDIT_VALUE_LABELS[value]) return AUDIT_VALUE_LABELS[value];
  if (
    TECHNICAL_VALUE_PATTERN.test(value) ||
    SIMPLE_IDENTIFIER_PATTERN.test(value)
  ) {
    return labelIdentifier(value);
  }
  return value;
}

export function isAuditRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isSensitiveAuditField(field: string): boolean {
  return SENSITIVE_FIELD_PATTERN.test(field);
}
