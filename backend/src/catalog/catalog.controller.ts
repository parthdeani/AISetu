import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFiles,
  Req,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CatalogService } from './catalog.service';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';

@ApiTags('Catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'List all products in workspace' })
  async getProducts(@Req() req: any, @Query('page') page = 1, @Query('limit') limit = 20) {
    const workspaceId = req.user.workspaceId;
    return this.catalogService.getProducts(workspaceId, Number(page), Number(limit));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single product detail' })
  async getProduct(@Req() req: any, @Param('id') id: string) {
    const workspaceId = req.user.workspaceId;
    return this.catalogService.getProduct(workspaceId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new catalog product' })
  async createProduct(@Req() req: any, @Body() data: any) {
    const workspaceId = req.user.workspaceId;
    return this.catalogService.createProduct(workspaceId, data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update catalog product' })
  async updateProduct(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    const workspaceId = req.user.workspaceId;
    return this.catalogService.updateProduct(workspaceId, id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete catalog product' })
  async deleteProduct(@Req() req: any, @Param('id') id: string) {
    const workspaceId = req.user.workspaceId;
    return this.catalogService.deleteProduct(workspaceId, id);
  }

  @Post('bulk-upload')
  @ApiOperation({ summary: 'Bulk upload products metadata via CSV and image bundle via ZIP' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'csv', maxCount: 1 },
      { name: 'zip', maxCount: 1 },
    ]),
  )
  async bulkUpload(
    @Req() req: any,
    @UploadedFiles()
    files: {
      csv?: Express.Multer.File[];
      zip?: Express.Multer.File[];
    },
  ) {
    const workspaceId = req.user.workspaceId;
    const csvFile = files.csv?.[0];
    const zipFile = files.zip?.[0];

    return this.catalogService.triggerBulkImport(
      workspaceId,
      csvFile?.buffer,
      zipFile?.buffer,
    );
  }

  @Post('sync-local')
  @ApiOperation({ summary: 'Scan backend/uploads folder and sync any new images as products' })
  async syncLocal(@Req() req: any) {
    const workspaceId = req.user.workspaceId;
    return this.catalogService.syncLocalUploads(workspaceId);
  }
}
