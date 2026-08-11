import { connectDatabase, getDatabase } from '../db/client';
import { collections } from '../db/collections';
import { ObjectId } from 'mongodb';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface BackupMetadata {
  database: string;
  exportedAt: string;
  collections: string[];
}

interface BackupDocument {
  _id: string;
  [key: string]: unknown;
}

interface BackupCollection {
  name: string;
  count: number;
  documents: BackupDocument[];
}

interface BackupFile {
  metadata: BackupMetadata;
  collections: BackupCollection[];
}

function serializeValue(value: unknown): unknown {
  if (value instanceof ObjectId) {
    return value.toHexString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }
  if (value && typeof value === 'object') {
    const serialized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      serialized[key] = serializeValue(val);
    }
    return serialized;
  }
  return value;
}

async function backup(outputPath?: string): Promise<void> {
  try {
    await connectDatabase();
    const database = getDatabase();
    const dbName = database.databaseName || env.MONGODB_DATABASE;

    const collectionNames = Object.keys(collections);
    const backupCollections: BackupCollection[] = [];

    for (const name of collectionNames) {
      const collection = collections[name as keyof typeof collections]();
      const documents = await collection.find({}).toArray();
      const serialized = documents.map((doc) => serializeValue(doc) as BackupDocument);
      backupCollections.push({
        name,
        count: serialized.length,
        documents: serialized,
      });
    }

    const backup: BackupFile = {
      metadata: {
        database: dbName,
        exportedAt: new Date().toISOString(),
        collections: collectionNames,
      },
      collections: backupCollections,
    };

    const backupDir = outputPath ? join(outputPath, '..') : join(process.cwd(), 'backups');
    mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = outputPath || join(backupDir, `backup-${dbName}-${timestamp}.json`);
    writeFileSync(fileName, JSON.stringify(backup, null, 2));

    logger.info({ database: dbName, collections: collectionNames.length, path: fileName }, 'Backup completed');
    console.log(`Backup completed: ${fileName}`);
    process.exit(0);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Backup failed');
    console.error('Backup failed:', error);
    process.exit(1);
  }
}

const outputPath = process.argv[2];
backup(outputPath);
