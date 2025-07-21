import { LocalStorage } from './LocalStorage';
import { StorageInterface } from './StorageInterface';
import { SupabaseStorage } from './SupabaseStorage';
import { S3Storage } from './S3Storage';
import { R2Storage } from './R2Storage';
import { getLogger } from '../logger';

const logger = getLogger('StorageFactory');

export class StorageFactory {
  private static instance: StorageInterface;

  static getStorage(): StorageInterface {
    if (!StorageFactory.instance) {
      const storageType = process.env.BLOB_STORAGE_TYPE;
      if (storageType === 'supabase') {
        StorageFactory.instance = new SupabaseStorage();
      } else if (storageType === 'local') {
        StorageFactory.instance = new LocalStorage();
      } else if (storageType === 's3') {
        StorageFactory.instance = new S3Storage();
      } else if (storageType === 'r2') {
        StorageFactory.instance = new R2Storage();
      } else {
        logger.error('Unsupported storage type', { storageType });
        throw new Error(
          `Unsupported storage type: ${storageType}. Supported types: supabase, local, s3, r2`,
        );
      }
    }
    return StorageFactory.instance;
  }
}
