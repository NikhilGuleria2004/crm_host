export interface FileStorage {
  put(key: string, content: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ content: Buffer; contentType: string } | null>;
  delete(key: string): Promise<void>;
}
