import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private isCloudinaryConfigured = false;

  onModuleInit() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dr3vva4uq';
    const apiKey = process.env.CLOUDINARY_API_KEY || '745293373178977';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || 'U4nZMfJkCj1aF8pCvfHEuYGVr3I';

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.isCloudinaryConfigured = true;
      this.logger.log(`🚀 Connected to Cloudinary storage for cloud: ${cloudName}`);
    } else {
      this.logger.warn('⚠️ Cloudinary credentials missing. Falling back to local filesystem.');
    }
  }

  async uploadFile(fileBuffer: Buffer, fileName: string, contentType: string): Promise<string> {
    if (this.isCloudinaryConfigured) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'vwc_products',
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) {
              this.logger.error(`Cloudinary upload failed: ${error.message}`);
              return reject(error);
            }
            if (result) {
              this.logger.log(`Uploaded to Cloudinary CDN: ${result.secure_url}`);
              resolve(result.secure_url);
            }
          },
        );
        uploadStream.end(fileBuffer);
      });
    }

    // Fallback to local uploads directory if Cloudinary is not configured
    const localUploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(localUploadsDir)) {
      fs.mkdirSync(localUploadsDir, { recursive: true });
    }
    const uniqueFileName = `${Date.now()}_${fileName}`;
    const filePath = path.join(localUploadsDir, uniqueFileName);
    await fs.promises.writeFile(filePath, fileBuffer);
    const serverPort = process.env.PORT || 4000;
    return `http://localhost:${serverPort}/api/uploads/${uniqueFileName}`;
  }

  async getSignedUrl(key: string): Promise<string> {
    return key;
  }
}
