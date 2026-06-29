import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductImage } from '../database/entities';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SearchService } from '../search/search.service';
import { ModuleRef } from '@nestjs/core';
import { CatalogProcessor } from './catalog.processor';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private productImageRepository: Repository<ProductImage>,
    @InjectQueue('bulk-import')
    private bulkImportQueue: Queue,
    private searchService: SearchService,
    private moduleRef: ModuleRef,
  ) {}

  async createProduct(workspaceId: string, data: any) {
    const product = this.productRepository.create({
      ...data,
      workspaceId,
    });
    return this.productRepository.save(product);
  }

  async getProducts(workspaceId: string, page = 1, limit = 20) {
    const [items, total] = await this.productRepository.findAndCount({
      where: { workspaceId },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    for (const item of items) {
      item.images = await this.productImageRepository.find({
        where: { productId: item.id },
      });
    }

    return { items, total, page, limit };
  }

  async getProduct(workspaceId: string, id: string) {
    const product = await this.productRepository.findOne({
      where: { id, workspaceId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    product.images = await this.productImageRepository.find({
      where: { productId: product.id },
    });
    return product;
  }

  async updateProduct(workspaceId: string, id: string, data: any) {
    const { images, id: _, workspaceId: __, ...updateData } = data;
    await this.productRepository.update({ id, workspaceId }, updateData);
    return this.getProduct(workspaceId, id);
  }

  async deleteProduct(workspaceId: string, id: string) {
    const product = await this.getProduct(workspaceId, id);
    if (product.images) {
      for (const img of product.images) {
        if (img.qdrant_vector_id) {
          await this.searchService.deleteImageVector(img.qdrant_vector_id);
        }
      }
    }
    await this.productRepository.remove(product);
    return { success: true };
  }

  async addProductImage(productId: string, imageUrl: string, workspaceId: string) {
    const imageId = crypto.randomUUID();
    const image = this.productImageRepository.create({
      id: imageId,
      productId,
      image_url: imageUrl,
      qdrant_vector_id: imageId,
    });
    await this.productImageRepository.manager.getMongoRepository(ProductImage).insertOne(image);

    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (product) {
      await this.searchService.upsertImageVector({
        id: imageId,
        imageUrl,
        productId,
        productCode: product.product_code,
        workspaceId,
      });
    }

    return image;
  }

  async triggerBulkImport(workspaceId: string, csvBuffer?: Buffer, zipBuffer?: Buffer) {
    try {
      const job = await this.bulkImportQueue.add('process-bulk', {
        workspaceId,
        csvData: csvBuffer ? csvBuffer.toString('base64') : null,
        zipData: zipBuffer ? zipBuffer.toString('base64') : null,
      });
      return { jobId: job.id, message: 'Bulk import job queued successfully (BullMQ)' };
    } catch (err) {
      // Redis is offline! Run processing synchronously in background microtask
      setTimeout(async () => {
        try {
          const processor = this.moduleRef.get(CatalogProcessor, { strict: false });
          await processor.process({
            data: {
              workspaceId,
              csvData: csvBuffer ? csvBuffer.toString('base64') : null,
              zipData: zipBuffer ? zipBuffer.toString('base64') : null,
            },
          } as any);
        } catch (procErr) {
          console.error('Failed to run fallback synchronous bulk import:', procErr.message);
        }
      }, 100);

      return { jobId: 'in-memory-job', message: 'Bulk import started synchronously (Redis was offline)' };
    }
  }

  async syncLocalUploads(workspaceId: string) {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      return { success: false, message: 'Uploads directory does not exist' };
    }

    const files = fs.readdirSync(uploadsDir);
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const syncedProducts = [];

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!imageExtensions.includes(ext)) continue;

      // Skip temp files, sandbox testing files, and augmented files
      if (file.startsWith('temp_clip_') || file.startsWith('tmp_') || file.includes('sandbox') || file.includes('_rot')) {
        continue;
      }

      // E.g. "posteek_chavanu.png" -> code = "posteek_chavanu", name = "posteek_chavanu"
      const productCode = path.basename(file, ext);
      
      // Check if product exists
      let product = await this.productRepository.findOne({
        where: { workspaceId, product_code: productCode },
      });

      if (!product) {
        product = this.productRepository.create({
          id: crypto.randomUUID(),
          workspaceId,
          product_code: productCode,
          name: productCode.replace(/[-_]/g, ' '), // Prettify name
          category: 'Farsan',
          price: 0.00,
          stock: 100,
          status: 'ACTIVE',
        });
        await this.productRepository.manager.getMongoRepository(Product).insertOne(product);
      }

      // Check if this image is already in product_images
      const imageUrl = `http://localhost:4000/api/uploads/${file}`;
      let pImage = await this.productImageRepository.findOne({
        where: { productId: product.id, image_url: imageUrl, is_primary: true },
      });

      if (!pImage) {
        // Create new primary image
        const imageId = crypto.randomUUID();
        pImage = this.productImageRepository.create({
          id: imageId,
          productId: product.id,
          image_url: imageUrl,
          is_primary: true,
          qdrant_vector_id: imageId,
        });
        await this.productImageRepository.manager.getMongoRepository(ProductImage).insertOne(pImage);
      }

      // Generate/update vector embeddings & all rotations for full accuracy
      await this.searchService.upsertImageVector({
        id: pImage.id,
        imageUrl,
        productId: product.id,
        productCode,
        workspaceId,
      });

      syncedProducts.push(productCode);
    }

    return {
      success: true,
      message: `Scanned uploads folder. Synced ${syncedProducts.length} new products.`,
      synced: syncedProducts,
    };
  }
}
