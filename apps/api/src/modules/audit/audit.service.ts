import { AuditRepository } from './audit.repository';
import type { CreateAuditLogInput, AuditLogResponse } from './audit.types';

export interface AuditLogFilters {
  limit?: number;
  cursor?: string;
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  search?: string;
}

export class AuditService {
  constructor(private repository: AuditRepository) {}

  async log(organizationId: string, input: CreateAuditLogInput, actorId?: string, ipAddress?: string, userAgent?: string): Promise<AuditLogResponse> {
    const log = await this.repository.create({
      ...input,
      organizationId,
      actorId,
      ipAddress,
      userAgent,
    });
    return this.repository.toResponse(log) as AuditLogResponse;
  }

  async getLogs(organizationId: string, limit = 50, cursor?: string): Promise<{ logs: AuditLogResponse[]; nextCursor?: string }> {
    const result = await this.repository.findByOrganization(organizationId, limit, cursor);
    return {
      logs: result.logs.map((log) => this.repository.toResponse(log) as AuditLogResponse),
      nextCursor: result.nextCursor,
    };
  }

  async getLogById(id: string): Promise<AuditLogResponse | null> {
    const log = await this.repository.findById(id);
    return this.repository.toResponse(log) as AuditLogResponse | null;
  }

  async getLogsWithFilters(organizationId: string, filters: AuditLogFilters): Promise<{ logs: AuditLogResponse[]; nextCursor?: string }> {
    const result = await this.repository.findByOrganizationWithFilters(organizationId, filters);
    return {
      logs: result.logs.map((log) => this.repository.toResponse(log) as AuditLogResponse),
      nextCursor: result.nextCursor,
    };
  }

  generateCsv(logs: AuditLogResponse[]): string {
    const headers = ['Timestamp', 'Actor ID', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'User Agent'];
    const rows = logs.map((log) => [
      log.createdAt,
      log.actorId || '',
      log.action,
      log.entityType || '',
      log.entityId || '',
      log.ipAddress || '',
      log.userAgent || '',
    ]);
    const escape = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };
    const lines = [headers.map(escape).join(',')];
    for (const row of rows) {
      lines.push(row.map(escape).join(','));
    }
    return lines.join('\n');
  }
}
