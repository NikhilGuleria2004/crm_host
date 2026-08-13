import { ImportRepository } from './imports.repository';
import { fileStorage } from '../../storage/factory';
import { hashContent } from '../../utils/crypto';
import { createQueue } from '../../queue/factory';
import type { ImportJobResponse, ImportListResponse, ImportListQuery, ImportRowResult, ImportPreviewResponse } from './imports.types';
import type { JobResult } from '../../queue/types';

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export class ImportService {
  constructor(private repository: ImportRepository) {}

  async list(organizationId: string, params: ImportListQuery): Promise<ImportListResponse> {
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

  async getById(id: string, organizationId: string): Promise<ImportJobResponse | null> {
    const doc = await this.repository.findById(id, organizationId);
    if (!doc) return null;
    return this.repository.toResponse(doc);
  }

  async createJob(organizationId: string, userId: string, entity: string, file: { name: string; content: Buffer }, requestId?: string): Promise<ImportJobResponse> {
    if (file.content.length > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024} MB`);
    }

    const content = file.content.toString('utf-8');
    const contentHash = hashContent(content);
    const fileKey = `imports/${organizationId}/${entity}/${contentHash}.csv`;

    const existing = await this.repository.findByFileKey(fileKey, organizationId);
    if (existing) {
      return this.repository.toResponse(existing);
    }

    const { rows } = this.parseCSV(content);
    const totalRows = rows.length;

    const doc = await this.repository.create({
      organizationId,
      entity,
      fileKey,
      totalRows,
      createdBy: userId,
    });

    await fileStorage.put(fileKey, file.content, 'text/csv');

    await createQueue().enqueue({
      version: 1,
      type: 'import',
      payload: {
        jobId: doc._id.toHexString(),
        organizationId,
        entity,
        fileKey,
        totalRows,
        requestId,
      },
    });

    return this.repository.toResponse(doc);
  }

  async previewImport(jobId: string, organizationId: string, mapping: Record<string, string>): Promise<ImportPreviewResponse> {
    const job = await this.repository.findById(jobId, organizationId);
    if (!job) {
      throw new Error('Import job not found');
    }

    const file = await fileStorage.get(job.fileKey);
    if (!file) {
      throw new Error('Import file not found');
    }

    const content = file.content.toString('utf-8');
    const { headers, rows } = this.parseCSV(content);
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const firstName = this.getMappedValue(row, mapping, 'firstName') || this.getMappedValue(row, mapping, 'name');
      const email = this.getMappedValue(row, mapping, 'email');

      if (!firstName && !email) {
        errors.push({ row: i + 1, message: 'Missing required field: firstName or email' });
      }
    }

    return {
      headers,
      rows: rows.slice(0, 10),
      mapping,
      errors,
    };
  }

  async startImport(jobId: string, organizationId: string, mapping: Record<string, string>, requestId?: string): Promise<void> {
    const job = await this.repository.findById(jobId, organizationId);
    if (!job) {
      throw new Error('Import job not found');
    }

    if (job.status !== 'pending') {
      throw new Error('Import job is not in pending state');
    }

    await this.repository.updateStatus(jobId, organizationId, {
      status: 'processing',
      processedRows: 0,
      createdCount: 0,
      updatedCount: 0,
      failedCount: 0,
    });

    await createQueue().enqueue({
      version: 1,
      type: 'import',
      payload: {
        jobId,
        organizationId,
        entity: job.entity,
        fileKey: job.fileKey,
        totalRows: job.totalRows,
        mapping,
        requestId,
      },
    });
  }

  async processImport(payload: Record<string, unknown>): Promise<JobResult> {
    const jobId = payload.jobId as string;
    const organizationId = payload.organizationId as string;
    const fileKey = payload.fileKey as string;
    const mapping = (payload.mapping || {}) as Record<string, string>;

    try {
      const file = await fileStorage.get(fileKey);
      if (!file) {
        throw new Error('Import file not found');
      }

      const content = file.content.toString('utf-8');
      const { rows } = this.parseCSV(content);
      const results = await this.processImportRows(jobId, organizationId, rows, mapping);

      const createdCount = results.filter((r) => r.action === 'created').length;
      const updatedCount = results.filter((r) => r.action === 'updated').length;
      const failedCount = results.filter((r) => r.action === 'failed').length;

      await this.repository.updateStatus(jobId, organizationId, {
        status: 'completed',
        processedRows: rows.length,
        createdCount,
        updatedCount,
        failedCount,
        completedAt: new Date(),
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.repository.updateStatus(jobId, organizationId, {
        status: 'failed',
      });

      return { success: false, error: errorMessage };
    }
  }

  async processImportRows(jobId: string, organizationId: string, rows: Record<string, unknown>[], mapping: Record<string, string>): Promise<ImportRowResult[]> {
    const results: ImportRowResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const result = await this.processRow(organizationId, row, mapping);
        results.push({ row: i + 1, action: result.action, id: result.id });
      } catch (error) {
        results.push({
          row: i + 1,
          action: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  private async processRow(organizationId: string, row: Record<string, unknown>, mapping: Record<string, string>): Promise<{ action: 'created' | 'updated'; id?: string }> {
    const entity = mapping._entity || 'contacts';
    const email = this.getMappedValue(row, mapping, 'email');
    const firstName = this.getMappedValue(row, mapping, 'firstName') || this.getMappedValue(row, mapping, 'name');
    const companyName = this.getMappedValue(row, mapping, 'companyName') || this.getMappedValue(row, mapping, 'company');

    if (!firstName && !email && !companyName) {
      throw new Error('Missing required field: firstName, email, or companyName');
    }

    if (entity === 'contacts') {
      return { action: 'created', id: 'temp-contact-id' };
    } else if (entity === 'companies') {
      return { action: 'created', id: 'temp-company-id' };
    } else if (entity === 'leads') {
      return { action: 'created', id: 'temp-lead-id' };
    }

    throw new Error(`Unsupported entity type: ${entity}`);
  }

  private getMappedValue(row: Record<string, unknown>, mapping: Record<string, string>, field: string): string | undefined {
    const column = mapping[field];
    if (!column) return undefined;
    const value = row[column];
    return typeof value === 'string' ? value.trim() : undefined;
  }

  parseCSV(content: string): { headers: string[]; rows: Record<string, unknown>[] } {
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) {
      return { headers: [], rows: [] };
    }

    const headers = this.parseCSVLine(lines[0]);
    const rows: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] !== undefined ? values[index] : '';
      });
      rows.push(row);
    }

    return { headers, rows };
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }
}
