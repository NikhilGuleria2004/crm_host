import { connectDatabase, getDatabase } from '../db/client';
import { collections } from '../db/collections';
import { ObjectId } from 'mongodb';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { readFileSync } from 'fs';

interface BackupFile {
  metadata: {
    database: string;
    exportedAt: string;
    collections: string[];
  };
  collections: {
    name: string;
    count: number;
    documents: Record<string, unknown>[];
  }[];
}

function deserializeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    if (/^[0-9a-fA-F]{24}$/.test(value)) {
      try {
        return new ObjectId(value);
      } catch {
        return value;
      }
    }
    const isoMatch = value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    if (isoMatch) {
      try {
        return new Date(value);
      } catch {
        return value;
      }
    }
  }
  if (Array.isArray(value)) {
    return value.map(deserializeValue);
  }
  if (value && typeof value === 'object') {
    const deserialized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      deserialized[key] = deserializeValue(val);
    }
    return deserialized;
  }
  return value;
}

async function restore(backupPath: string, clearExisting = false): Promise<void> {
  try {
    const backupContent = readFileSync(backupPath, 'utf-8');
    const backup: BackupFile = JSON.parse(backupContent);

    await connectDatabase();
    const database = getDatabase();
    const dbName = database.databaseName || env.MONGODB_DATABASE;

    if (backup.metadata.database !== dbName) {
      console.warn(`Backup was created from database "${backup.metadata.database}" but restoring into "${dbName}"`);
    }

    console.log(`Restoring ${backup.collections.length} collections from backup created at ${backup.metadata.exportedAt}`);

    for (const collection of backup.collections) {
      const collectionRef = collections[collection.name as keyof typeof collections]?.();
      if (!collectionRef) {
        console.warn(`Collection ${collection.name} not found in codebase, skipping`);
        continue;
      }

      if (clearExisting) {
        await collectionRef.deleteMany({});
        console.log(`Cleared ${collection.name}`);
      }

      if (collection.count === 0) {
        console.log(`Skipped ${collection.name} (empty)`);
        continue;
      }

      const documents = collection.documents.map((doc) => deserializeValue(doc));
      const result = await collectionRef.insertMany(documents as any[]);
      const insertedCount = Object.keys(result.insertedIds).length;

      if (insertedCount !== collection.count) {
        console.warn(`Collection ${collection.name}: expected ${collection.count} documents, inserted ${insertedCount}`);
      } else {
        console.log(`Restored ${collection.name} (${insertedCount} documents)`);
      }
    }

    console.log('Restore completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Restore failed');
    console.error('Restore failed:', error);
    process.exit(1);
  }
}

const backupPath = process.argv[2];
if (!backupPath) {
  console.error('Usage: pnpm db:restore <backup-file-path> [--clear]');
  process.exit(1);
}
const clearExisting = process.argv[3] === '--clear';
restore(backupPath, clearExisting);
