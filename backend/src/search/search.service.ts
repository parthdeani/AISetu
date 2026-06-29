import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductImage } from '../database/entities';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const { Jimp } = require('jimp');

@Injectable()
export class SearchService implements OnModuleInit {
  private qdrant: QdrantClient;
  private readonly logger = new Logger(SearchService.name);
  private collectionName = 'product_images';
  private isQdrantOffline = false;
  private clipProcessor: any = null;
  private clipModel: any = null;
  private imagesCache: ProductImage[] | null = null;

  clearCache() {
    this.imagesCache = null;
    this.logger.log('⚡ Vector search in-memory cache cleared');
  }

  constructor(
    @InjectRepository(ProductImage)
    private productImageRepository: Repository<ProductImage>,
  ) {}

  async onModuleInit() {
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    this.qdrant = new QdrantClient({ url: qdrantUrl });
    try {
      const collections = await this.qdrant.getCollections();
      const exists = collections.collections.some((c) => c.name === this.collectionName);
      if (!exists) {
        await this.qdrant.createCollection(this.collectionName, {
          vectors: {
            size: 768,
            distance: 'Cosine',
          },
        });
        this.logger.log(`Created Qdrant collection: ${this.collectionName}`);
      }
    } catch (err) {
      this.isQdrantOffline = true;
      this.logger.warn(`⚠️ Qdrant is offline. Falling back to local MongoDB Cosine Similarity search. details: ${err.message}`);
    }

    // Pre-load lightweight CLIP model weights for high-speed cloud execution
    try {
      const modelName = process.env.CLIP_MODEL || 'Xenova/clip-vit-base-patch32';
      this.logger.log(`Downloading/loading CLIP model (${modelName})...`);
      const { AutoProcessor, CLIPVisionModelWithProjection } = require('@xenova/transformers');
      this.clipProcessor = await AutoProcessor.from_pretrained(modelName);
      this.clipModel = await CLIPVisionModelWithProjection.from_pretrained(modelName);
      this.logger.log('🚀 CLIP model loaded successfully!');
    } catch (err) {
      this.logger.error(`Failed to load CLIP model. Falling back to mock: ${err.message}`);
    }
  }

  async cropToCenterTexture(inputPathOrBuffer: string | Buffer): Promise<Buffer> {
    try {
      const image = await Jimp.read(inputPathOrBuffer);
      const width = image.width;
      const height = image.height;

      // Crop coordinates to target the middle transparent window (typically 30% to 75% height)
      const top = Math.round(height * 0.30);
      const left = Math.round(width * 0.10);
      const w = Math.round(width * 0.80);
      const h = Math.round(height * 0.45);

      image.crop({ x: left, y: top, w, h });
      return await image.getBuffer('image/png');
    } catch (err) {
      this.logger.error(`Cropping failed: ${err.message}`);
      return Buffer.isBuffer(inputPathOrBuffer)
        ? inputPathOrBuffer
        : fs.readFileSync(inputPathOrBuffer);
    }
  }

  // Generates real visual embeddings using OpenAI CLIP model running locally!
  async generateEmbeddingFromJimp(image: any, shouldCrop = false): Promise<number[]> {
    try {
      if (this.clipProcessor && this.clipModel) {
        const { RawImage } = require('@xenova/transformers');
        
        let targetImg = image;
        if (targetImg.width > 224 || targetImg.height > 224) {
          targetImg = targetImg.clone();
          targetImg.resize({ w: 224, h: 224 });
        }

        const W = targetImg.bitmap.width;
        const H = targetImg.bitmap.height;
        const fullRawData = new Uint8Array(targetImg.bitmap.data);
        const fullRawImage = new RawImage(fullRawData, W, H, 4);

        // Fast zero-copy Uint8Array byte slice for center texture window (middle 45% height)
        const startY = Math.round(H * 0.25);
        const endY = Math.round(H * 0.70);
        const startX = Math.round(W * 0.10);
        const endX = Math.round(W * 0.90);
        const cropW = endX - startX;
        const cropH = endY - startY;

        const cropRawData = new Uint8Array(cropW * cropH * 4);
        let dstIdx = 0;
        for (let y = startY; y < endY; y++) {
          const srcIdx = (y * W + startX) * 4;
          const rowBytes = cropW * 4;
          cropRawData.set(fullRawData.subarray(srcIdx, srcIdx + rowBytes), dstIdx);
          dstIdx += rowBytes;
        }
        const cropRawImage = new RawImage(cropRawData, cropW, cropH, 4);

        // Run processors & model inference in parallel via Promise.all for fast speed
        const [fullInputs, cropInputs] = await Promise.all([
          this.clipProcessor(fullRawImage),
          this.clipProcessor(cropRawImage),
        ]);
        const [fullOutput, cropOutput] = await Promise.all([
          this.clipModel(fullInputs),
          this.clipModel(cropInputs),
        ]);

        const fullVector = Array.from(fullOutput.image_embeds.data) as number[];
        const cropVector = Array.from(cropOutput.image_embeds.data) as number[];

        // Hybrid blend (50% Full Pouch + 50% Inner Snack Window)
        const blendedVector: number[] = new Array(fullVector.length);
        let sumSq = 0;
        for (let i = 0; i < fullVector.length; i++) {
          const val = 0.5 * fullVector[i] + 0.5 * cropVector[i];
          blendedVector[i] = val;
          sumSq += val * val;
        }
        const norm = Math.sqrt(sumSq) || 1;
        for (let i = 0; i < blendedVector.length; i++) {
          blendedVector[i] /= norm;
        }
        return blendedVector;
      }
    } catch (err) {
      this.logger.error(`CLIP inference from Jimp failed, falling back to mock: ${err.message}`);
    }

    // Fallback Mock Hashing if CLIP fails to load
    const buffer = await image.getBuffer('image/png');
    const hash = crypto.createHash('sha256').update(buffer).digest();
    const vector: number[] = [];
    let sumSq = 0;

    for (let i = 0; i < 768; i++) {
      const byteVal = hash[i % 32];
      const val = Math.sin(i + byteVal) * Math.cos(i - byteVal);
      vector.push(val);
      sumSq += val * val;
    }

    const norm = Math.sqrt(sumSq);
    return vector.map((v) => v / norm);
  }

  async generateEmbedding(imageUrlOrBuffer: string | Buffer | any, shouldCrop = false): Promise<number[]> {
    if (imageUrlOrBuffer && typeof imageUrlOrBuffer === 'object' && imageUrlOrBuffer.bitmap) {
      return this.generateEmbeddingFromJimp(imageUrlOrBuffer, shouldCrop);
    }

    try {
      let imageBuffer: Buffer;
      if (Buffer.isBuffer(imageUrlOrBuffer)) {
        imageBuffer = imageUrlOrBuffer;
      } else if (typeof imageUrlOrBuffer === 'string' && imageUrlOrBuffer.startsWith('http')) {
        if (imageUrlOrBuffer.includes('/api/uploads/')) {
          const filename = imageUrlOrBuffer.split('/api/uploads/')[1];
          const localPath = path.join(process.cwd(), 'uploads', filename);
          if (fs.existsSync(localPath)) {
            imageBuffer = fs.readFileSync(localPath);
          } else {
            const axios = require('axios');
            const response = await axios.get(imageUrlOrBuffer, { responseType: 'arraybuffer' });
            imageBuffer = Buffer.from(response.data);
          }
        } else {
          const axios = require('axios');
          const response = await axios.get(imageUrlOrBuffer, { responseType: 'arraybuffer' });
          imageBuffer = Buffer.from(response.data);
        }
      } else if (typeof imageUrlOrBuffer === 'string') {
        imageBuffer = fs.readFileSync(imageUrlOrBuffer);
      } else {
        throw new Error('Unsupported image input type');
      }

      const image = await Jimp.read(imageBuffer);
      return this.generateEmbeddingFromJimp(image, shouldCrop);
    } catch (err) {
      this.logger.error(`Failed to read image with Jimp for embedding: ${err.message}`);
      const buffer = Buffer.isBuffer(imageUrlOrBuffer) ? imageUrlOrBuffer : Buffer.from(imageUrlOrBuffer);
      const hash = crypto.createHash('sha256').update(buffer).digest();
      const vector: number[] = [];
      let sumSq = 0;

      for (let i = 0; i < 768; i++) {
        const byteVal = hash[i % 32];
        const val = Math.sin(i + byteVal) * Math.cos(i - byteVal);
        vector.push(val);
        sumSq += val * val;
      }

      const norm = Math.sqrt(sumSq);
      return vector.map((v) => v / norm);
    }
  }

  cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async upsertImageVector(payload: {
    id: string; // ProductImage UUID
    imageUrl: string;
    productId: string;
    productCode: string;
    workspaceId: string;
  }) {
    let originalJimp;
    try {
      let originalBuffer: Buffer;
      if (payload.imageUrl.startsWith('http')) {
        if (payload.imageUrl.includes('/api/uploads/')) {
          const filename = payload.imageUrl.split('/api/uploads/')[1];
          const localPath = path.join(process.cwd(), 'uploads', filename);
          if (fs.existsSync(localPath)) {
            originalBuffer = fs.readFileSync(localPath);
          } else {
            const axios = require('axios');
            const response = await axios.get(payload.imageUrl, { responseType: 'arraybuffer' });
            originalBuffer = Buffer.from(response.data);
          }
        } else {
          const axios = require('axios');
          const response = await axios.get(payload.imageUrl, { responseType: 'arraybuffer' });
          originalBuffer = Buffer.from(response.data);
        }
      } else {
        originalBuffer = fs.readFileSync(payload.imageUrl);
      }

      originalJimp = await Jimp.read(originalBuffer);
      if (originalJimp.width > 448 || originalJimp.height > 448) {
        originalJimp.resize({ w: 448, h: 448 });
      }
    } catch (err) {
      this.logger.error(`Failed to read original image for augmentation: ${err.message}`);
      return;
    }

    // 1. Process original image
    const vector = await this.generateEmbeddingFromJimp(originalJimp, false);

    // Save vector to database directly for MongoDB fallback search using direct MongoDB updateOne
    await this.productImageRepository.manager.getMongoRepository(ProductImage).updateOne(
      { id: payload.id },
      { $set: { vector, is_primary: true } }
    );

    if (!this.isQdrantOffline) {
      try {
        await this.qdrant.upsert(this.collectionName, {
          wait: true,
          points: [
            {
              id: payload.id,
              vector,
              payload: {
                productId: payload.productId,
                productCode: payload.productCode,
                workspaceId: payload.workspaceId,
                imageUrl: payload.imageUrl,
              },
            },
          ],
        });
      } catch (err) {
        this.logger.warn(`Failed to push vector to Qdrant, using local MongoDB fallback: ${err.message}`);
      }
    }

    // 2. Generate and store rotated variations (Augmentation)
    try {
      const rotationAngles = [];
      for (let a = 35; a < 360; a += 35) {
        rotationAngles.push(a);
      }
      for (const angle of rotationAngles) {
        const rotatedJimp = originalJimp.clone();
        rotatedJimp.rotate(angle);

        // Generate embedding in-memory
        const rotatedVector = await this.generateEmbeddingFromJimp(rotatedJimp, false);

        // Create new ProductImage entry without manually specifying primary key ID
        const rotatedVectorId = crypto.randomUUID();
        const rotatedImageEntry = this.productImageRepository.create({
          id: rotatedVectorId,
          productId: payload.productId,
          image_url: payload.imageUrl,
          is_primary: false,
          vector: rotatedVector,
          qdrant_vector_id: rotatedVectorId,
        });
        await this.productImageRepository.manager.getMongoRepository(ProductImage).insertOne(rotatedImageEntry);

        // Push to Qdrant if online
        if (!this.isQdrantOffline) {
          try {
            await this.qdrant.upsert(this.collectionName, {
              wait: true,
              points: [
                {
                  id: rotatedVectorId,
                  vector: rotatedVector,
                  payload: {
                    productId: payload.productId,
                    productCode: `${payload.productCode}_rot${angle}`,
                    workspaceId: payload.workspaceId,
                    imageUrl: payload.imageUrl,
                  },
                },
              ],
            });
          } catch (qdrantErr) {
            this.logger.warn(`Failed to push rotated vector to Qdrant: ${qdrantErr.message}`);
          }
        }
        this.logger.log(`Created augmented product image at ${angle}° for ${payload.productCode}`);
      }
    } catch (augErr) {
      this.logger.error(`Augmentation failed for ${payload.productCode}: ${augErr.message}`);
    }
    this.clearCache();
  }

  async getImagesForSearch(): Promise<ProductImage[]> {
    if (this.imagesCache) {
      return this.imagesCache;
    }
    this.imagesCache = await this.productImageRepository.find({
      select: ['id', 'productId', 'image_url', 'vector'],
    });
    this.logger.log(`⚡ Loaded ${this.imagesCache.length} images into vector search cache`);
    return this.imagesCache;
  }

  async searchSimilarImages(
    imageUrlOrBuffer: string | Buffer,
    workspaceId: string,
    limit = 10,
  ): Promise<Array<{ imageId: string; productId: string; score: number; payload: any }>> {
    const vector = await this.generateEmbedding(imageUrlOrBuffer);

    if (this.isQdrantOffline) {
      this.logger.log(`Executing local database Cosine Similarity search...`);
      const images = await this.getImagesForSearch();
      const bestMatches: Record<string, { imageId: string; productId: string; score: number; payload: any }> = {};

      for (const img of images) {
        if (img.vector && img.vector.length === vector.length) {
          const score = this.cosineSimilarity(vector, img.vector);
          const currentBest = bestMatches[img.productId];
          if (!currentBest || score > currentBest.score) {
            bestMatches[img.productId] = {
              imageId: img.id,
              productId: img.productId,
              score,
              payload: {
                productId: img.productId,
                imageUrl: img.image_url,
                workspaceId,
              },
            };
          }
        }
      }

      return Object.values(bestMatches).sort((a, b) => b.score - a.score).slice(0, limit);
    }

    try {
      // Fetch more than limit to allow room for deduplication
      const results = await this.qdrant.search(this.collectionName, {
        vector,
        limit: limit * 5,
        filter: {
          must: [
            {
              key: 'workspaceId',
              match: {
                value: workspaceId,
              },
            },
          ],
        },
      });

      const bestMatches: Record<string, { imageId: string; productId: string; score: number; payload: any }> = {};
      for (const r of results) {
        const prodId = r.payload?.productId as string;
        if (!prodId) continue;
        const score = r.score;
        const currentBest = bestMatches[prodId];
        if (!currentBest || score > currentBest.score) {
          bestMatches[prodId] = {
            imageId: r.id as string,
            productId: prodId,
            score,
            payload: r.payload,
          };
        }
      }

      return Object.values(bestMatches).sort((a, b) => b.score - a.score).slice(0, limit);
    } catch (err) {
      this.logger.warn(`Qdrant search failed, falling back to local MongoDB lookup: ${err.message}`);
      this.isQdrantOffline = true;
      return this.searchSimilarImages(imageUrlOrBuffer, workspaceId, limit);
    }
  }

  async deleteImageVector(id: string) {
    if (!this.isQdrantOffline) {
      try {
        await this.qdrant.delete(this.collectionName, {
          points: [id],
        });
      } catch {}
    }
    this.clearCache();
  }
}
