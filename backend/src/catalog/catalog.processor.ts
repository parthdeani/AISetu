import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductImage } from '../database/entities';
import { StorageService } from '../common/storage.service';
import { SearchService } from '../search/search.service';
import * as csv from 'csv-parser';
import { Readable } from 'stream';
import * as AdmZip from 'adm-zip';
import { Logger } from '@nestjs/common';

@Processor('bulk-import')
export class CatalogProcessor extends WorkerHost {
  private readonly logger = new Logger(CatalogProcessor.name);

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private productImageRepository: Repository<ProductImage>,
    private storageService: StorageService,
    private searchService: SearchService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { workspaceId, csvData, zipData } = job.data;
    this.logger.log(`Starting bulk import job for workspace: ${workspaceId}`);

    const productMap = new Map<string, Product>();

    // 1. Process CSV metadata
    if (csvData) {
      const csvBuffer = Buffer.from(csvData, 'base64');
      const results: any[] = [];
      const stream = Readable.from(csvBuffer);

      await new Promise<void>((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });

      for (const row of results) {
        const productCode = row['Product Code'] || row['product_code'];
        const name = row['Product Name'] || row['name'];
        if (!productCode || !name) continue;

        let product = await this.productRepository.findOne({
          where: { workspaceId, product_code: productCode },
        });

        if (!product) {
          product = this.productRepository.create({
            workspaceId,
            product_code: productCode,
            name,
            category: row['Category'] || row['category'] || 'General',
            description: row['Description'] || row['description'] || '',
            price: parseFloat(row['Price'] || row['price'] || '0.00'),
            unit: row['Unit'] || row['unit'] || 'pcs',
            stock: parseInt(row['Stock'] || row['stock'] || '0', 10),
            status: 'ACTIVE',
          });
        } else {
          product.name = name;
          product.category = row['Category'] || row['category'] || product.category;
          product.description = row['Description'] || row['description'] || product.description;
          product.price = parseFloat(row['Price'] || row['price'] || String(product.price));
          product.stock = parseInt(row['Stock'] || row['stock'] || String(product.stock), 10);
        }

        const saved = await this.productRepository.save(product);
        productMap.set(productCode, saved);
      }
      this.logger.log(`Parsed ${results.length} product metadata rows.`);
    }

    // 2. Process ZIP containing images
    if (zipData) {
      const zipBuffer = Buffer.from(zipData, 'base64');
      const zip = new AdmZip(zipBuffer);
      const zipEntries = zip.getEntries();

      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;

        // e.g. entry name matches product code like "PROD102.jpg" or "folder/PROD102.png"
        const filename = entry.name;
        const dotIndex = filename.lastIndexOf('.');
        if (dotIndex === -1) continue;

        const productCode = filename.substring(0, dotIndex);
        let product = productMap.get(productCode);

        if (!product) {
          // Check DB just in case it wasn't in the CSV of this batch
          product = await this.productRepository.findOne({
            where: { workspaceId, product_code: productCode },
          });
        }

        if (!product) {
          this.logger.warn(`No product found for code "${productCode}" from image file: ${filename}`);
          continue;
        }

        const imageBuffer = entry.getData();
        const mimeType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';

        // Upload to S3
        const imageUrl = await this.storageService.uploadFile(imageBuffer, filename, mimeType);

        // Store Product Image record
        const pImage = this.productImageRepository.create({
          productId: product.id,
          image_url: imageUrl,
        });
        const savedImage = await this.productImageRepository.save(pImage);

        // Compute Vector embedding & push to Qdrant
        const vectorId = savedImage.id;
        await this.searchService.upsertImageVector({
          id: vectorId,
          imageUrl,
          productId: product.id,
          productCode: product.product_code,
          workspaceId,
        });

        // Link vector to PG record
        savedImage.qdrant_vector_id = vectorId;
        await this.productImageRepository.save(savedImage);
      }
      this.logger.log(`Extracted and processed image files from ZIP archive.`);
    }

    return { status: 'COMPLETED' };
  }
}
