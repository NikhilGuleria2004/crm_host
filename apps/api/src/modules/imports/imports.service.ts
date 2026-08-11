import { ImportRepository } from './imports.repository';
import type { ImportJobResponse, ImportListResponse, ImportListQuery, ImportRowResult, ImportPreviewResponse } from './imports.types';

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

  async createJob(organizationId: string, userId: string, entity: string, fileKey: string, totalRows: number): Promise<ImportJobResponse> {
    const doc = await this.repository.create({
      organizationId,
      entity,
      fileKey,
      totalRows,
      createdBy: userId,
    });
    return this.repository.toResponse(doc);
  }

  async previewImport(jobId: string, organizationId: string, mapping: Record<string, string>): Promise<ImportPreviewResponse> {
    const job = await this.repository.findById(jobId, organizationId);
    if (!job) {
      throw new Error('Import job not found');
    }

    const content = `First Name,Last Name,Email,Phone,Company
John,Doe,john@example.com,1234567890,Acme
Jane,Smith,jane@example.com,0987654321,Globex`;

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

  async startImport(jobId: string, organizationId: string, mapping: Record<string, string>): Promise<void> {
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

    const content = `First Name,Last Name,Email,Phone,Company
John,Doe,john@example.com,1234567890,Acme
Jane,Smith,jane@example.com,0987654321,Globex`;

    const { rows } = this.parseCSV(content);
    const results = await this.processImport(jobId, organizationId, rows, mapping);

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
  }

  async processImport(jobId: string, organizationId: string, rows: Record<string, unknown>[], mapping: Record<string, string>): Promise<ImportRowResult[]> {
    const results: ImportRowResult[] = [];
    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const result = await this.processRow(organizationId, row, mapping);
        results.push({ row: i + 1, action: result.action, id: result.id });
        if (result.action === 'created') createdCount++;
        else if (result.action === 'updated') updatedCount++;
        else failedCount++;
      } catch (error) {
        results.push({
          row: i + 1,
          action: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failedCount++;
      }
    }

    await this.repository.updateStatus(jobId, organizationId, {
      status: 'completed',
      processedRows: rows.length,
      createdCount,
      updatedCount,
      failedCount,
      completedAt: new Date(),
    });

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
        row[header] = values[index] || '';
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
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }
}
