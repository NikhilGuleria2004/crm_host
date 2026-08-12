import { env } from '../config/env';
import { FileStorage } from './file-storage';
import { MongoFileStorage } from './mongo-file-storage';
import { BlobStorage } from './blob';

let storage: FileStorage | null = null;

export function getFileStorage(): FileStorage {
  if (!storage) {
    if (env.BLOB_READ_WRITE_TOKEN) {
      storage = new BlobStorage();
    } else {
      storage = new MongoFileStorage();
    }
  }
  return storage;
}

export const fileStorage = getFileStorage();
