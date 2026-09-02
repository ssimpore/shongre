import { SecurityAuditLog } from "../types";
import { deterministicRuntimeId } from "../utilities/deterministic-id";
import { storageService } from "../services/storage.service";

const AUDIT_STORAGE_KEY = "shongre_security_audit_logs_v1";
export const AUDIT_LOG_LIMITS = {
  entries: 200,
  bytes: 256 * 1024,
  detailsCharacters: 2_000,
} as const;

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

  private serializedBytes(value: unknown): number {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  }

  private compactLog(log: SecurityAuditLog): SecurityAuditLog {
    const compact = {
      ...log,
      details: log.details.slice(0, AUDIT_LOG_LIMITS.detailsCharacters),
    };
    if (this.serializedBytes(compact) <= AUDIT_LOG_LIMITS.bytes) {
      return compact;
    }
    // Large payload evidence belongs at the asynchronous backend audit
    // boundary. The local demo preview retains the event without duplicating a
    // potentially sensitive, quota-filling payload in browser storage.
    return {
      ...compact,
      previousValue: undefined,
      newValue: undefined,
      details: compact.details.slice(0, 1_000),
    };
  }

  private bounded(logs: SecurityAuditLog[]): SecurityAuditLog[] {
    const bounded = logs
      .slice(0, AUDIT_LOG_LIMITS.entries)
      .map((log) => this.compactLog(log));
    while (
      bounded.length > 1 &&
      this.serializedBytes(bounded) > AUDIT_LOG_LIMITS.bytes
    ) {
      bounded.pop();
    }
    return bounded;
  }

  private getLogsFromStorage(): SecurityAuditLog[] {
    const stored = storageService.get(AUDIT_STORAGE_KEY, this.inMemoryLogs);
    const logs = this.bounded(
      Array.isArray(stored) ? stored : this.inMemoryLogs,
    );
    this.inMemoryLogs = logs;
    // This also repairs an old unbounded buffer on first read. A full or
    // unavailable store is deliberately silent: failing to prune diagnostics
    // must not generate more diagnostics.
    storageService.setSilently(AUDIT_STORAGE_KEY, logs);
    return [...logs];
  }

  private saveLogs(logs: SecurityAuditLog[]): void {
    const bounded = this.bounded(logs);
    this.inMemoryLogs = bounded;
    storageService.setSilently(AUDIT_STORAGE_KEY, bounded);
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
    const timestamp = new Date().toISOString();
    const newLog: SecurityAuditLog = {
      ...entry,
      id: deterministicRuntimeId("audit", [entry]),
      timestamp,
    };

    const logs = this.getLogsFromStorage();
    const repeatedIndex = logs.findIndex(
      (log) =>
        log.actorId === newLog.actorId &&
        log.action === newLog.action &&
        log.targetId === newLog.targetId &&
        log.market === newLog.market &&
        log.details === newLog.details &&
        JSON.stringify(log.previousValue) ===
          JSON.stringify(newLog.previousValue) &&
        JSON.stringify(log.newValue) === JSON.stringify(newLog.newValue),
    );
    if (repeatedIndex >= 0) {
      const repeated = logs.splice(repeatedIndex, 1)[0];
      logs.unshift({
        ...repeated,
        timestamp,
        occurrenceCount: (repeated.occurrenceCount ?? 1) + 1,
        firstOccurredAt: repeated.firstOccurredAt ?? repeated.timestamp,
      });
    } else {
      logs.unshift(newLog);
    }
    this.saveLogs(logs);

    return this.inMemoryLogs[0] ?? newLog;
  }

  clearLogs(): void {
    this.saveLogs([...INITIAL_AUDIT_LOGS]);
  }
}

export const auditService = new AuditService();
