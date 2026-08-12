import { FileStorage } from './file-storage';
import { collections } from '../db/collections';

export class MongoFileStorage implements FileStorage {
  async put(key: string, content: Buffer, contentType: string): Promise<void> {
    await collections.files().updateOne(
      { _id: key },
      { $set: { content, contentType, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  async get(key: string): Promise<{ content: Buffer; contentType: string } | null> {
    const doc = await collections.files().findOne({ _id: key });
    if (!doc) return null;
    return { content: doc.content as Buffer, contentType: doc.contentType as string };
  }

  async delete(key: string): Promise<void> {
    await collections.files().deleteOne({ _id: key });
  }
}
