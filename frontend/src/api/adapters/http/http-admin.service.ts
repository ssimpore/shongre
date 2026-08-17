import { AdminServiceContract, AdminStatsSummary } from '../../contracts/admin.contract';
import { httpClient } from './http-client';
import { UserProfile } from '../../../types';

export class HttpAdminService implements AdminServiceContract {
  async getPlatformStats(): Promise<AdminStatsSummary> {
    return httpClient.get<AdminStatsSummary>('/admin/stats');
  }

  async getAllUsers(): Promise<UserProfile[]> {
    return httpClient.get<UserProfile[]>('/admin/users');
  }

  async updateUserStatus(userId: string, status: 'active' | 'suspended' | 'banned'): Promise<UserProfile> {
    return httpClient.put<UserProfile>(`/admin/users/${userId}/status`, { status });
  }

  async getPendingReports(): Promise<Array<{ id: string; listingId: string; reason: string; reporterName: string; createdAt: string }>> {
    return httpClient.get<Array<{ id: string; listingId: string; reason: string; reporterName: string; createdAt: string }>>('/admin/reports');
  }

  async resolveReport(reportId: string, action: 'dismiss' | 'remove_listing' | 'ban_user'): Promise<void> {
    return httpClient.post<void>(`/admin/reports/${reportId}/resolve`, { action });
  }

  async getAuditLogs(): Promise<Array<{ id: string; timestamp: string; actor: string; action: string; target: string }>> {
    return httpClient.get<Array<{ id: string; timestamp: string; actor: string; action: string; target: string }>>('/admin/audit-logs');
  }
}

export const httpAdminService = new HttpAdminService();
