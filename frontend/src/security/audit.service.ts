import { SecurityAuditLog } from "../types";
import { telemetryService } from "../services/telemetry.service";
import { deterministicRuntimeId } from "../utilities/deterministic-id";
import { storageService } from "../services/storage.service";

const AUDIT_STORAGE_KEY = "shongre_security_audit_logs_v1";

const INITIAL_AUDIT_LOGS: SecurityAuditLog[] = [
  {
    id: "audit-001",
    timestamp: "2026-08-15T14:32:00Z",
    actorId: "user_admin_antoine",
    actorName: "Antoine Fabre",
    actorRole: "admin",
    targetId: "user_pro_atelier",
    targetName: "Atelier Nordique SAS",
    action: "verification_approved",
    details:
      "Vérification SIRET et Kbis validée avec succès (Document RCS Bordeaux n° 849204892). Attribution du badge Pro Vérifié.",
    newValue: { status: "verified", badge: "pro_verified" },
    ipAddress: "194.254.119.34",
    market: "FR",
  },
  {
    id: "audit-002",
    timestamp: "2026-08-14T09:15:00Z",
    actorId: "user_mod_claire",
    actorName: "Claire Moreau",
    actorRole: "moderator",
    targetId: "user_suspended",
    targetName: "Compte Indisponible",
    action: "user_suspended",
    details:
      "Suspension préventive du compte suite à 4 signalements concordants pour tentative de paiement hors plateforme sécurisée.",
    previousValue: { status: "active" },
    newValue: { status: "suspended", reason: "offline_payment_solicitation" },
    ipAddress: "82.64.12.89",
    market: "FR",
  },
  {
    id: "audit-003",
    timestamp: "2026-08-12T16:45:00Z",
    actorId: "user_super_admin_alex",
    actorName: "Alexandre Meyer",
    actorRole: "super_admin",
    targetId: "user_market_mgr_be",
    targetName: "Sophie Vandamme",
    action: "role_assigned",
    details:
      "Attribution du rôle Responsable Marché avec portée territoriale limitée au marché Belgique (BE).",
    newValue: { role: "market_manager", scope: { countries: ["BE"] } },
    ipAddress: "90.84.144.12",
    market: "BE",
  },
  {
    id: "audit-004",
    timestamp: "2026-08-10T11:20:00Z",
    actorId: "user_mod_claire",
    actorName: "Claire Moreau",
    actorRole: "moderator",
    targetId: "list-fake-99",
    targetName: "Smartphone haut de gamme prix bradé",
    action: "listing_hidden",
    details:
      "Masquage immédiat de l’annonce pour suspicion de contrefaçon ou d’escroquerie.",
    previousValue: { status: "active" },
    newValue: { status: "pending_review" },
    ipAddress: "82.64.12.89",
    market: "FR",
  },
  {
    id: "audit-staff-marketplace-demo-grant",
    timestamp: "2026-08-20T09:00:00Z",
    actorId: "user_super_admin_alex",
    actorName: "Alexandre Meyer",
    actorRole: "super_admin",
    targetId: "user_ops_elena",
    targetName: "Elena Rossi",
    action: "capability_overrides_updated",
    details:
      "Autorisation temporaire et révocable pour les démonstrations marketplace dans le bac à sable local isolé.",
    previousValue: { customPermissions: [] },
    newValue: {
      customPermissions: ["staff.marketplace.demo"],
      dataMode: "demo",
    },
    market: "FR",
  },
];

class AuditService {
  private inMemoryLogs: SecurityAuditLog[] = [...INITIAL_AUDIT_LOGS];

  private getLogsFromStorage(): SecurityAuditLog[] {
    return storageService.get(AUDIT_STORAGE_KEY, this.inMemoryLogs);
  }

  private saveLogs(logs: SecurityAuditLog[]): void {
    try {
      this.inMemoryLogs = logs;
      storageService.set(AUDIT_STORAGE_KEY, logs);
    } catch (e) {
      telemetryService.captureException(e, "audit-storage-write");
    }
  }

  getLogs(
    filters?:
      | {
          actorId?: string;
          action?: string;
          targetId?: string;
          market?: string;
          query?: string;
        }
      | number,
  ): SecurityAuditLog[] {
    let logs = this.getLogsFromStorage();

    if (typeof filters === "number") {
      return logs
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, filters);
    }

    if (filters?.action && filters.action !== "all") {
      logs = logs.filter((l) => l.action === filters.action);
    }

    if (filters?.market && filters.market !== "all") {
      logs = logs.filter((l) => l.market === filters.market);
    }

    if (filters?.query && filters.query.trim()) {
      const q = filters.query.toLowerCase().trim();
      logs = logs.filter(
        (l) =>
          l.actorName.toLowerCase().includes(q) ||
          (l.targetName && l.targetName.toLowerCase().includes(q)) ||
          l.details.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q),
      );
    }

    return logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  exportLogsAsCsv(): string {
    const logs = this.getLogs();
    const headers = [
      "ID",
      "Date",
      "Auteur (ID)",
      "Auteur (Nom)",
      "Rôle",
      "Cible (ID)",
      "Cible (Nom)",
      "Action",
      "Détails",
      "Marché",
      "IP",
    ];
    const rows = logs.map((l) => [
      l.id,
      l.timestamp,
      l.actorId,
      `"${(l.actorName || "").replace(/"/g, '""')}"`,
      l.actorRole,
      l.targetId || "",
      `"${(l.targetName || "").replace(/"/g, '""')}"`,
      l.action,
      `"${(l.details || "").replace(/"/g, '""')}"`,
      l.market || "",
      l.ipAddress || "",
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  logEvent(
    entry: Omit<SecurityAuditLog, "id" | "timestamp">,
  ): SecurityAuditLog {
    const newLog: SecurityAuditLog = {
      ...entry,
      id: deterministicRuntimeId("audit", [entry]),
      timestamp: new Date().toISOString(),
    };

    const logs = this.getLogsFromStorage();
    logs.unshift(newLog);
    this.saveLogs(logs);

    return newLog;
  }

  clearLogs(): void {
    this.saveLogs([...INITIAL_AUDIT_LOGS]);
  }
}

export const auditService = new AuditService();
