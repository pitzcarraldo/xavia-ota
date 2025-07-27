import { StorageInterface } from './StorageInterface';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export class R2Storage implements StorageInterface {
  private readonly r2: any; // Using any for now since R2 types are complex

  constructor() {
    const env = getCloudflareContext().env;
    if (typeof env === 'undefined' || !(env as any).R2) {
      throw new Error(
        'R2 binding not found. Make sure R2 is properly bound in wrangler.toml or wrangler.jsonc',
      );
    }
    this.r2 = (env as any).R2;
  }

  async uploadFile(path: string, file: Buffer): Promise<string> {
    await this.r2.put(path, file);
    return path;
  }

  async downloadFile(path: string): Promise<Buffer> {
    const object = await this.r2.get(path);
    if (!object) {
      throw new Error(`File not found: ${path}`);
    }

    const arrayBuffer = await object.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async fileExists(path: string): Promise<boolean> {
    const object = await this.r2.head(path);
    return object !== null;
  }

  async listFiles(directory: string): Promise<
    {
      name: string;
      updated_at: string;
      created_at: string;
      metadata: { size: number; mimetype: string };
    }[]
  > {
    const prefix = directory.endsWith('/') ? directory : `${directory}/`;
    const objects = await this.r2.list({ prefix });

    return objects.objects.map((object: any) => ({
      name: object.key.split('/').pop() || '',
      updated_at: object.uploaded.toISOString(),
      created_at: object.uploaded.toISOString(),
      metadata: {
        size: object.size,
        mimetype: object.httpMetadata?.contentType || 'application/octet-stream',
      },
    }));
  }

  async listDirectories(directory: string): Promise<string[]> {
    const prefix = directory.endsWith('/') ? directory : `${directory}/`;
    const objects = await this.r2.list({
      prefix,
      delimiter: '/',
    });

    if (!objects.delimitedPrefixes) {
      return [];
    }

    return objects.delimitedPrefixes
      .map((prefix: string) => {
        return prefix.replace(directory, '').replace(/^\/+|\/+$/g, '');
      })
      .filter(Boolean);
  }

  async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    const sourceObject = await this.r2.get(sourcePath);
    if (!sourceObject) {
      throw new Error(`Source file not found: ${sourcePath}`);
    }

    const data = await sourceObject.arrayBuffer();
    await this.r2.put(destinationPath, data);
  }
}
