import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';

import { StorageInterface } from './StorageInterface';

export class S3Storage implements StorageInterface {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor() {
    if (!process.env.AWS_S3_BUCKET_NAME) {
      throw new Error('S3 bucket name not configured');
    }

    this.bucketName = process.env.AWS_S3_BUCKET_NAME;
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async uploadFile(path: string, file: Buffer): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: path,
      Body: file,
    });

    await this.s3Client.send(command);
    console.log(`s3://${this.bucketName}/${path} uploaded`);
    return path;
  }

  async downloadFile(path: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: path,
    });

    const response = await this.s3Client.send(command);
    const chunks: Buffer[] = [];

    if (response.Body) {
      const stream = response.Body as any;
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
    }

    return Buffer.concat(chunks);
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async listFiles(directory: string): Promise<
    {
      name: string;
      updated_at: string;
      created_at: string;
      metadata: { size: number; mimetype: string };
    }[]
  > {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: directory,
      Delimiter: '/',
    });

    const response = await this.s3Client.send(command);

    if (!response.Contents) {
      return [];
    }

    return response.Contents.map((object) => ({
      name: object.Key?.split('/').pop() || '',
      updated_at: object.LastModified?.toISOString() || '',
      created_at: object.LastModified?.toISOString() || '',
      metadata: {
        size: object.Size || 0,
        mimetype: this.getMimeType(object.Key || ''),
      },
    }));
  }

  async listDirectories(directory: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: directory,
      Delimiter: '/',
    });

    const response = await this.s3Client.send(command);

    if (!response.CommonPrefixes) {
      return [];
    }

    return response.CommonPrefixes.map((prefix) => {
      const prefixKey = prefix.Prefix || '';
      return prefixKey.replace(directory, '').replace(/^\/+|\/+$/g, '');
    }).filter(Boolean);
  }

  async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    const command = new CopyObjectCommand({
      Bucket: this.bucketName,
      CopySource: `${this.bucketName}/${sourcePath}`,
      Key: destinationPath,
    });

    await this.s3Client.send(command);
    console.log(
      `s3://${this.bucketName}/${sourcePath} copied to s3://${this.bucketName}/${destinationPath}`,
    );
  }

  private getMimeType(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: { [key: string]: string } = {
      js: 'application/javascript',
      json: 'application/json',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      zip: 'application/zip',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}
