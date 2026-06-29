import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogProcessor } from './catalog.processor';
import { Product, ProductImage } from '../database/entities';
import { BullModule } from '@nestjs/bullmq';
import { SearchModule } from '../search/search.module';
import { StorageService } from '../common/storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage]),
    BullModule.registerQueue({
      name: 'bulk-import',
    }),
    SearchModule,
  ],
  controllers: [CatalogController],
  providers: [CatalogService, CatalogProcessor, StorageService],
  exports: [CatalogService],
})
export class CatalogModule {}
