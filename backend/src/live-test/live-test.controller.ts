import { Controller, Post, UploadedFile, UseInterceptors, Req, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SearchService } from '../search/search.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductImage } from '../database/entities';
import { StorageService } from '../common/storage.service';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';

@ApiTags('Live Test Sandbox')
@Controller('live-test')
export class LiveTestController {
  constructor(
    private searchService: SearchService,
    private storageService: StorageService,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private productImageRepository: Repository<ProductImage>,
  ) {}

  @Post('search')
  @ApiOperation({ summary: 'Sandbox testing console: run visual search directly by uploading test image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  async testSearch(
    @Req() req: any,
    @UploadedFile() image: Express.Multer.File,
    @Query('threshold') threshold = 0.7,
  ) {
    const workspaceId = req.user?.workspaceId || '12345678-1234-1234-1234-1234567890ab';
    if (!image) {
      throw new Error('Image file is required');
    }

    // Upload sandbox file to S3 (or local uploads temp folder) with tmp_ sandbox prefix
    const fileName = `tmp_sandbox_${image.originalname}`;
    const imageUrl = await this.storageService.uploadFile(image.buffer, fileName, image.mimetype);

    // Search vectors using raw image buffer contents
    const matches = await this.searchService.searchSimilarImages(image.buffer, workspaceId, 10);

    const results: any[] = [];
    for (const match of matches) {
      const product = await this.productRepository.findOne({
        where: { id: match.productId },
      });
      if (product) {
        const images = await this.productImageRepository.find({
          where: { productId: product.id },
        });
        // Direct raw Cosine Similarity score percentage (e.g. 0.95 = 95%)
        const percentageScore = parseFloat((Math.min(100, Math.max(0, match.score * 100))).toFixed(2));
        results.push({
          productId: product.id,
          productCode: product.product_code,
          productName: product.name,
          price: product.price,
          similarityScore: percentageScore,
          imageUrl: images?.[0]?.image_url || '',
          passedThreshold: percentageScore >= Number(threshold) * 100,
        });
      }
    }

    return {
      uploadedImageUrl: imageUrl,
      thresholdUsed: Number(threshold),
      results,
    };
  }
}
