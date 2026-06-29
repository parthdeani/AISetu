import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService implements OnModuleInit {
  private s3: AWS.S3;
  private bucket: string;
  private readonly logger = new Logger(StorageService.name);
  private isS3Offline = false;
  private localUploadsDir = path.join(process.cwd(), 'uploads');

  onModuleInit() {
    this.bucket = process.env.S3_BUCKET || 'vwc-media';
    const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
    const accessKeyId = process.env.S3_ACCESS_KEY || 'minio_admin';
    const secretAccessKey = process.env.S3_SECRET_KEY || 'minio_password';

    // Ensure local uploads directory exists for fallback
    if (!fs.existsSync(this.localUploadsDir)) {
      fs.mkdirSync(this.localUploadsDir, { recursive: true });
    }

    this.s3 = new AWS.S3({
      endpoint,
      accessKeyId,
      secretAccessKey,
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
    });

    this.s3.createBucket({ Bucket: this.bucket }, (err) => {
      if (err) {
        this.isS3Offline = true;
        this.logger.warn(`⚠️ S3 Storage is offline. Falling back to local filesystem storage at backend/uploads/. Details: ${err.message}`);
      } else {
        this.logger.log(`Connected to S3 bucket: ${this.bucket}`);
      }
    });
  }

  async uploadFile(fileBuffer: Buffer, fileName: string, contentType: string): Promise<string> {
    const uniqueFileName = `${Date.now()}_${fileName}`;

    if (this.isS3Offline) {
      this.logger.log(`Writing file locally to backend/uploads/${uniqueFileName}...`);
      const filePath = path.join(this.localUploadsDir, uniqueFileName);
      await fs.promises.writeFile(filePath, fileBuffer);
      
      const serverPort = process.env.PORT || 4000;
      return `http://localhost:${serverPort}/api/uploads/${uniqueFileName}`;
    }

    try {
      const key = `uploads/${uniqueFileName}`;
      await this.s3
        .putObject({
          Bucket: this.bucket,
          Key: key,
          Body: fileBuffer,
          ContentType: contentType,
        })
        .promise();

      const endpointUrl = process.env.S3_PUBLIC_DOMAIN || process.env.S3_ENDPOINT || 'http://localhost:9000';
      return `${endpointUrl}/${this.bucket}/${key}`;
    } catch (err) {
      this.logger.warn(`S3 Upload failed, falling back to local filesystem: ${err.message}`);
      this.isS3Offline = true;
      return this.uploadFile(fileBuffer, fileName, contentType);
    }
  }

  async getSignedUrl(key: string): Promise<string> {
    if (this.isS3Offline) {
      return key; // Just return direct local HTTP path
    }
    try {
      return this.s3.getSignedUrlPromise('getObject', {
        Bucket: this.bucket,
        Key: key,
        Expires: 3600,
      });
    } catch {
      return key;
    }
  }
}
