import { MongoClient, Db, Collection, Document } from 'mongodb';
import { env } from '../config/env';

let client: MongoClient | null = null;
let db: Db | null = null;
let connecting: Promise<Db> | null = null;

export async function connectDatabase(): Promise<Db> {
  if (db) return db;
  if (connecting) return connecting;

  connecting = (async () => {
    client = new MongoClient(env.MONGODB_URI);
    await client.connect();
    db = client.db(env.MONGODB_DATABASE);
    return db;
  })();

  try {
    return await connecting;
  } catch (error) {
    connecting = null;
    throw error;
  }
}

export function getDatabase(): Db {
  if (!db) throw new Error('Database not initialized. Call connectDatabase() first.');
  return db;
}

export function getCollection<T extends Document>(name: string): Collection<T> {
  return getDatabase().collection<T>(name);
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    connecting = null;
  }
}

export async function checkDatabaseHealth(): Promise<{ status: 'healthy' | 'unhealthy'; detail?: string }> {
  try {
    const database = await connectDatabase();
    await database.command({ ping: 1 });
    return { status: 'healthy' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const sanitized = message.replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, 'mongodb://***');
    return { status: 'unhealthy', detail: sanitized };
  }
}
