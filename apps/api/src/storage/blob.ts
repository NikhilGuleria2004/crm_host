import { put, getDownloadUrl, del, head } from '@vercel/blob';
import { FileStorage } from './file-storage';

export class BlobStorage implements FileStorage {
  async put(key: string, content: Buffer, contentType: string): Promise<void> {
    await put(key, content, {
      access: 'private',
      contentType,
    } as any);
  }

  async get(key: string): Promise<{ content: Buffer; contentType: string } | null> {
    try {
      const downloadUrl = await getDownloadUrl(key);
      const response = await fetch(downloadUrl);
      if (!response.ok) return null;

      const arrayBuffer = await response.arrayBuffer();
      return {
        content: Buffer.from(arrayBuffer),
        contentType: response.headers.get('content-type') || 'application/octet-stream',
      };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await del(key);
  }
}
