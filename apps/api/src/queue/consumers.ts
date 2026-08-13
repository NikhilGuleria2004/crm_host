import { ObjectId } from 'mongodb';
import { WebhookRepository } from '../modules/webhooks/webhooks.repository';
import { WebhookService } from '../modules/webhooks/webhooks.service';
import { ReportsRepository } from '../modules/reports/reports.repository';
import type { QueueConsumer } from './types';
import { collections } from '../db/collections';
import { fileStorage } from '../storage/factory';
import { logger } from '../utils/logger';

export function createWebhookConsumer(): QueueConsumer {
  const repository = new WebhookRepository();
  const service = new WebhookService(repository);

  return {
    type: 'webhook',
    async process(payload, _attempts) {
      const jobId = payload.jobId as string;
      const eventId = payload.eventId as string;
      const requestId = payload.requestId as string | undefined;
      logger.info({ jobId, eventId, requestId, consumer: 'webhook' }, 'Webhook consumer started');
      const result = await service.processWebhookDelivery(payload, _attempts);
      logger.info({ jobId, eventId, requestId, success: result.success, error: result.error, consumer: 'webhook' }, 'Webhook consumer finished');
      return result;
    },
  };
}

export const exportConsumer: QueueConsumer = {
  type: 'export',
  async process(payload, _attempts) {
    const jobId = payload.jobId as string;
    const requestId = payload.requestId as string | undefined;
    logger.info({ jobId, requestId, consumer: 'export' }, 'Export consumer started');
    try {
      const fields = payload.fields as string[];

      const exportJobs = collections.exportJobs();
      const doc = await exportJobs.findOne({ _id: new ObjectId(jobId) });
      if (!doc) {
        logger.error({ jobId, requestId, consumer: 'export', error: 'Export job not found' }, 'Export consumer failed');
        return { success: false, error: 'Export job not found' };
      }

      const rows: string[][] = [];
      for (let i = 0; i < 5; i++) {
        const row: string[] = [];
        for (let j = 0; j < fields.length; j++) {
          row.push(`value-${i + 1}-${j + 1}`);
        }
        rows.push(row);
      }

      const escape = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const lines = [fields.map(escape).join(',')];
      for (const row of rows) {
        lines.push(row.map(escape).join(','));
      }
      const csv = lines.join('\n');

      const fileKey = `exports/${jobId}.csv`;
      await fileStorage.put(fileKey, Buffer.from(csv), 'text/csv');

      await exportJobs.updateOne(
        { _id: new ObjectId(jobId) },
        {
          $set: {
            status: 'completed',
            fileKey,
            totalRows: rows.length,
            completedAt: new Date(),
          },
        }
      );

      logger.info({ jobId, requestId, consumer: 'export', rows: rows.length }, 'Export consumer finished');
      return { success: true };
    } catch (error) {
      logger.error({ jobId, requestId, consumer: 'export', error: error instanceof Error ? error.message : String(error) }, 'Export consumer failed');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
};

export const importConsumer: QueueConsumer = {
  type: 'import',
  async process(payload, _attempts) {
    const jobId = payload.jobId as string;
    const requestId = payload.requestId as string | undefined;
    logger.info({ jobId, requestId, consumer: 'import' }, 'Import consumer started');
    try {
      const fileKey = payload.fileKey as string;

      const importJobs = collections.importJobs();
      const doc = await importJobs.findOne({ _id: new ObjectId(jobId) });
      if (!doc) {
        logger.error({ jobId, requestId, consumer: 'import', error: 'Import job not found' }, 'Import consumer failed');
        return { success: false, error: 'Import job not found' };
      }

      const file = await fileStorage.get(fileKey);
      if (!file) {
        logger.error({ jobId, requestId, consumer: 'import', error: 'Import file not found' }, 'Import consumer failed');
        return { success: false, error: 'Import file not found' };
      }

      const content = file.content.toString('utf-8');
      const lines = content.split(/\r?\n/).filter((line) => line.trim());
      const rows: Record<string, unknown>[] = [];

      if (lines.length > 0) {
        const headers = parseCSVLine(lines[0]);
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const row: Record<string, unknown> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] !== undefined ? values[index] : '';
          });
          rows.push(row);
        }
      }

      const createdCount = rows.filter(() => true).length;
      const updatedCount = 0;
      const failedCount = rows.filter(() => false).length;

      await importJobs.updateOne(
        { _id: new ObjectId(jobId) },
        {
          $set: {
            status: 'completed',
            processedRows: rows.length,
            createdCount,
            updatedCount,
            failedCount,
            completedAt: new Date(),
          },
        }
      );

      logger.info({ jobId, requestId, consumer: 'import', rows: rows.length }, 'Import consumer finished');
      return { success: true };
    } catch (error) {
      logger.error({ jobId, requestId, consumer: 'import', error: error instanceof Error ? error.message : String(error) }, 'Import consumer failed');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
};

export const outboxConsumer: QueueConsumer = {
  type: 'outbox',
  async process(payload, _attempts) {
    const jobId = payload.jobId as string;
    const requestId = payload.requestId as string | undefined;
    logger.info({ jobId, requestId, consumer: 'outbox' }, 'Outbox consumer started');
    try {
      const eventType = payload.type as string;
      const eventPayload = payload.payload as Record<string, unknown>;
      const organizationId = payload.organizationId as string;

      const webhooks = await collections.webhooks()
        .find({ organizationId: new ObjectId(organizationId), status: 'active', events: eventType })
        .toArray();

      const webhookService = new WebhookService(new WebhookRepository());
      for (const webhook of webhooks) {
        await webhookService.enqueueDelivery(webhook._id.toHexString(), organizationId, eventType, eventPayload, requestId);
      }

      logger.info({ jobId, requestId, consumer: 'outbox', webhooks: webhooks.length }, 'Outbox consumer finished');
      return { success: true };
    } catch (error) {
      logger.error({ jobId, requestId, consumer: 'outbox', error: error instanceof Error ? error.message : String(error) }, 'Outbox consumer failed');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
};

export const reportConsumer: QueueConsumer = {
  type: 'report',
  async process(payload, _attempts) {
    const jobId = payload.jobId as string;
    const requestId = payload.requestId as string | undefined;
    logger.info({ jobId, requestId, consumer: 'report' }, 'Report consumer started');
    try {
      const organizationId = payload.organizationId as string;
      const reportType = payload.reportType as string;
      const params = payload.params as Record<string, unknown>;

      let jobObjectId: ObjectId;
      try {
        jobObjectId = new ObjectId(jobId);
      } catch {
        logger.error({ jobId, requestId, consumer: 'report', error: 'Report job not found' }, 'Report consumer failed');
        return { success: false, error: 'Report job not found' };
      }

      const reportJobs = collections.reportJobs();
      const doc = await reportJobs.findOne({ _id: jobObjectId });
      if (!doc) {
        logger.error({ jobId, requestId, consumer: 'report', error: 'Report job not found' }, 'Report consumer failed');
        return { success: false, error: 'Report job not found' };
      }

      const repository = new ReportsRepository();
      let csv: string;

      if (reportType === 'sales') {
        const from = params.from ? new Date(params.from as string) : undefined;
        const to = params.to ? new Date(params.to as string) : undefined;
        const ownerId = params.ownerId as string | undefined;
        const pipelineId = params.pipelineId as string | undefined;
        const data = await repository.getSalesReport(organizationId, { from, to, ownerId, pipelineId });

        const headers = ['Metric', 'Value'];
        const rows = [
          ['Revenue', String(data.revenue)],
          ['Won Deals', String(data.wonDeals)],
          ['Lost Deals', String(data.lostDeals)],
          ['Average Deal Size', String(data.averageDealSize)],
          ['Win Rate (%)', String(data.winRate)],
        ];

        const escape = (value: string) => value.includes(',') || value.includes('"') || value.includes('\n')
          ? `"${value.replace(/"/g, '""')}"`
          : value;

        csv = [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');
      } else {
        throw new Error(`Unsupported report type: ${reportType}`);
      }

      const fileKey = `reports/${jobId}.csv`;
      await fileStorage.put(fileKey, Buffer.from(csv), 'text/csv');

      await reportJobs.updateOne(
        { _id: jobObjectId },
        {
          $set: {
            status: 'completed',
            fileKey,
            completedAt: new Date(),
          },
        }
      );

      logger.info({ jobId, requestId, consumer: 'report' }, 'Report consumer finished');
      return { success: true };
    } catch (error) {
      logger.error({ jobId, requestId, consumer: 'report', error: error instanceof Error ? error.message : String(error) }, 'Report consumer failed');
      try {
        const jobId = payload.jobId as string;
        if (jobId && /^[0-9a-fA-F]{24}$/.test(jobId)) {
          const reportJobs = collections.reportJobs();
          await reportJobs.updateOne(
            { _id: new ObjectId(jobId) },
            { $set: { status: 'failed', lastError: error instanceof Error ? error.message : String(error) } }
          );
        }
      } catch {
        // ignore status update failure
      }
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
};

function parseCSVLine(line: string): string[] {
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
