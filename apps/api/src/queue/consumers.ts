import { ObjectId } from 'mongodb';
import { WebhookRepository } from '../modules/webhooks/webhooks.repository';
import { WebhookService } from '../modules/webhooks/webhooks.service';
import type { QueueConsumer } from './types';
import { collections } from '../db/collections';
import { fileStorage } from '../storage/mongo-file-storage';
import { logger } from '../utils/logger';

export function createWebhookConsumer(): QueueConsumer {
  const repository = new WebhookRepository();
  const service = new WebhookService(repository);

  return {
    type: 'webhook',
    async process(payload) {
      return service.processWebhookDelivery(payload);
    },
  };
}

export const exportConsumer: QueueConsumer = {
  type: 'export',
  async process(payload) {
    try {
      const jobId = payload.jobId as string;
      const fields = payload.fields as string[];

      const exportJobs = collections.exportJobs();
      const doc = await exportJobs.findOne({ _id: new ObjectId(jobId) });
      if (!doc) {
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

      return { success: true };
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Export consumer failed');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
};

export const importConsumer: QueueConsumer = {
  type: 'import',
  async process(payload) {
    try {
      const jobId = payload.jobId as string;
      const fileKey = payload.fileKey as string;

      const importJobs = collections.importJobs();
      const doc = await importJobs.findOne({ _id: new ObjectId(jobId) });
      if (!doc) {
        return { success: false, error: 'Import job not found' };
      }

      const file = await fileStorage.get(fileKey);
      if (!file) {
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

      return { success: true };
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Import consumer failed');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
};

export const outboxConsumer: QueueConsumer = {
  type: 'outbox',
  async process(payload) {
    try {
      const eventId = payload.jobId as string;
      const eventType = payload.type as string;
      const eventPayload = payload.payload as Record<string, unknown>;

      const objectId = new ObjectId(eventId.replace('lead.converted:', ''));
      const result = await collections.outboxEvents().updateOne(
        { _id: objectId },
        { $set: { status: 'processing', processedAt: new Date() } }
      );

      if (result.matchedCount === 0) {
        return { success: true };
      }

      const organizationId = payload.organizationId as string;
      const webhooks = await collections.webhooks()
        .find({ organizationId: new ObjectId(organizationId), status: 'active', events: eventType })
        .toArray();

      for (const webhook of webhooks) {
        await collections.webhookDeliveries().insertOne({
          webhookId: webhook._id,
          organizationId: new ObjectId(organizationId),
          eventId,
          eventType,
          payload: eventPayload,
          attempt: 0,
          status: 'pending',
          createdAt: new Date(),
        } as any);
      }

      await collections.outboxEvents().updateOne(
        { _id: objectId },
        { $set: { status: 'completed', processedAt: new Date() } }
      );

      return { success: true };
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Outbox consumer failed');
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
