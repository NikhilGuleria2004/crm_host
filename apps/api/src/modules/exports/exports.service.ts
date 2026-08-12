import { ExportRepository } from './exports.repository';
import { fileStorage } from '../../storage/factory';
import { createQueue } from '../../queue/factory';
import type { ExportJobResponse, ExportListResponse, ExportListQuery } from './exports.types';

export class ExportService {
  constructor(private repository: ExportRepository) {}

  async list(organizationId: string, params: ExportListQuery): Promise<ExportListResponse> {
    const limit = params.limit || 20;

    const result = await this.repository.list(organizationId, {
      limit,
      cursor: params.cursor,
      entity: params.entity,
      status: params.status,
    });

    const data = result.data.map((doc) => this.repository.toResponse(doc));

    return {
      data,
      meta: {
        limit,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    };
  }

  async getById(id: string, organizationId: string): Promise<ExportJobResponse | null> {
    const doc = await this.repository.findById(id, organizationId);
    if (!doc) return null;
    return this.repository.toResponse(doc);
  }

  async createJob(organizationId: string, userId: string, entity: string, fields: string[], filters?: Record<string, unknown>): Promise<ExportJobResponse> {
    const doc = await this.repository.create({
      organizationId,
      entity,
      filters: filters || {},
      fields,
      createdBy: userId,
    });

    await createQueue().enqueue({
      version: 1,
      type: 'export',
      payload: {
        jobId: doc._id.toHexString(),
        organizationId,
        entity,
        fields,
        filters,
      },
    });

    const updated = await this.repository.findById(doc._id.toHexString(), organizationId);
    if (!updated) throw new Error('Export job not found after processing');
    return this.repository.toResponse(updated);
  }

  async processExport(payload: Record<string, unknown>): Promise<void> {
    const jobId = payload.jobId as string;
    const organizationId = payload.organizationId as string;
    const fields = payload.fields as string[];

    const doc = await this.repository.findById(jobId, organizationId);
    if (!doc) throw new Error('Export job not found');

    const rows = this.generateMockRows(fields.length);
    const csv = this.generateCSV(fields, rows);

    const fileKey = `exports/${jobId}.csv`;
    await fileStorage.put(fileKey, Buffer.from(csv), 'text/csv');

    await this.repository.updateStatus(jobId, organizationId, {
      status: 'completed',
      fileKey,
      totalRows: rows.length,
      completedAt: new Date(),
    });
  }

  async getFile(key: string, organizationId?: string): Promise<{ content: Buffer; contentType: string } | null> {
    if (organizationId) {
      const jobId = key.replace(/^exports\//, '').replace(/\.csv$/, '');
      const job = await this.repository.findById(jobId, organizationId);
      if (!job || job.fileKey !== key) {
        return null;
      }
    }
    return fileStorage.get(key);
  }

  private generateMockRows(fieldCount: number): string[][] {
    const rows: string[][] = [];
    for (let i = 0; i < 5; i++) {
      const row: string[] = [];
      for (let j = 0; j < fieldCount; j++) {
        row.push(`value-${i + 1}-${j + 1}`);
      }
      rows.push(row);
    }
    return rows;
  }

  private generateCSV(headers: string[], rows: string[][]): string {
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
