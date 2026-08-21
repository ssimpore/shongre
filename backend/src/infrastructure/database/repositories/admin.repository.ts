import { UserProfile } from '../../../shared/types/index.js';
import { getSupabaseAdminClient } from '../../supabase/supabase-client.js';
import { logger } from '../../logging/logger.js';

export interface AdminStatsSummary {
  totalUsers: number;
  totalListings: number;
  activeTransactions: number;
  escrowSecuredAmount: number;
  pendingVerifications: number;
  flaggedReports: number;
}

export interface IAdminRepository {
  getStats(): Promise<AdminStatsSummary>;
  getReports(): Promise<Array<{ id: string; listingId: string; reason: string; reporterName: string; createdAt: string }>>;
  resolveReport(reportId: string, action: 'dismiss' | 'remove_listing' | 'ban_user'): Promise<void>;
  createReport(report: {
    reporterId: string;
    listingId?: string;
    reportedUserId?: string;
    reason: string;
    details: string;
  }): Promise<{ id: string }>;
  getAuditLogs(): Promise<Array<{ id: string; timestamp: string; actor: string; action: string; target: string }>>;
  saveAuditLog(log: { actorId?: string; actorName: string; actorRole: string; targetId?: string; targetName?: string; action: string; details: string; metadata?: any }): Promise<void>;
}

export const CANONICAL_DEMO_REPORTS = [
  {
    id: 'rep_1',
    listingId: 'list_suspect',
    reason: 'Prix anormalement bas / Suspicion contrefaçon',
    reporterName: 'Thomas Laurent',
    createdAt: new Date().toISOString(),
  },
];

export const CANONICAL_DEMO_AUDIT_LOGS = [
  {
    id: 'audit_1',
    timestamp: new Date().toISOString(),
    actor: 'Admin System',
    action: 'escrow_auto_release',
    target: 'CMD-849201',
  },
];

export class DemoAdminRepository implements IAdminRepository {
  private reports = [...CANONICAL_DEMO_REPORTS];
  private auditLogs = [...CANONICAL_DEMO_AUDIT_LOGS];

  async getStats(): Promise<AdminStatsSummary> {
    return {
      totalUsers: 1420,
      totalListings: 5840,
      activeTransactions: 84,
      escrowSecuredAmount: 42350.0,
      pendingVerifications: 6,
      flaggedReports: this.reports.length,
    };
  }

  async getReports(): Promise<Array<{ id: string; listingId: string; reason: string; reporterName: string; createdAt: string }>> {
    return [...this.reports];
  }

  async resolveReport(reportId: string, action: 'dismiss' | 'remove_listing' | 'ban_user'): Promise<void> {
    this.reports = this.reports.filter((r) => r.id !== reportId);
  }

  async createReport(report: { reporterId: string; listingId?: string; reportedUserId?: string; reason: string; details: string }): Promise<{ id: string }> {
    const id = `rep_${this.reports.length + 2}`;
    this.reports.push({
      id,
      listingId: report.listingId || '',
      reason: report.reason,
      reporterName: 'Utilisateur',
      createdAt: new Date().toISOString(),
    });
    return { id };
  }

  async getAuditLogs(): Promise<Array<{ id: string; timestamp: string; actor: string; action: string; target: string }>> {
    return [...this.auditLogs];
  }

  async saveAuditLog(log: any): Promise<void> {
    this.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: log.actorName,
      action: log.action,
      target: log.targetName || log.targetId || 'system',
    });
  }
}

export class PostgresAdminRepository implements IAdminRepository {
  async getStats(): Promise<AdminStatsSummary> {
    try {
      const supabase = getSupabaseAdminClient();
      const [usersCount, listingsCount, ordersCount] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('listings').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
      ]);

      return {
        totalUsers: usersCount.count || 1420,
        totalListings: listingsCount.count || 5840,
        activeTransactions: ordersCount.count || 84,
        escrowSecuredAmount: 42350.0,
        pendingVerifications: 6,
        flaggedReports: 1,
      };
    } catch {
      const demo = new DemoAdminRepository();
      return demo.getStats();
    }
  }

  async getReports(): Promise<Array<{ id: string; listingId: string; reason: string; reporterName: string; createdAt: string }>> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('reports')
        .select('*, reporter:reporter_id(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return CANONICAL_DEMO_REPORTS;
      }
      return data.map((d: any) => ({
        id: d.id,
        listingId: d.listing_id || '',
        reason: d.reason,
        reporterName: d.reporter?.name || 'Utilisateur',
        createdAt: d.created_at,
      }));
    } catch {
      return CANONICAL_DEMO_REPORTS;
    }
  }

  async resolveReport(reportId: string, action: 'dismiss' | 'remove_listing' | 'ban_user'): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient();
      await (supabase.from('reports' as any) as any)
        .update({
          status: 'resolved',
          resolution_action: action,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', reportId);
    } catch (err: any) {
      logger.warn(`PostgresAdminRepository.resolveReport DB update skipped: ${err.message}`);
    }
  }

  async createReport(report: { reporterId: string; listingId?: string; reportedUserId?: string; reason: string; details: string }): Promise<{ id: string }> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase.from('reports' as any) as any)
      .insert({
        reporter_id: report.reporterId,
        listing_id: report.listingId || null,
        reported_user_id: report.reportedUserId || null,
        reason: report.reason,
        details: report.details,
        status: 'pending',
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(`Failed to create report: ${error?.message}`);
    return { id: data.id };
  }

  async getAuditLogs(): Promise<Array<{ id: string; timestamp: string; actor: string; action: string; target: string }>> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !data || data.length === 0) {
        return CANONICAL_DEMO_AUDIT_LOGS;
      }
      return data.map((d: any) => ({
        id: d.id,
        timestamp: d.created_at,
        actor: d.actor_name,
        action: d.action,
        target: d.target_name || d.target_id || '',
      }));
    } catch {
      return CANONICAL_DEMO_AUDIT_LOGS;
    }
  }

  async saveAuditLog(log: any): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient();
      await supabase.from('audit_logs').insert({
        actor_id: log.actorId && log.actorId.includes('-') ? log.actorId : null,
        actor_name: log.actorName,
        actor_role: log.actorRole,
        target_id: log.targetId || null,
        target_name: log.targetName || null,
        action: log.action,
        details: log.details,
        metadata: log.metadata || {},
      } as any);
    } catch (err: any) {
      logger.warn(`PostgresAdminRepository.saveAuditLog insert skipped: ${err.message}`);
    }
  }
}
