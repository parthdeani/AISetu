import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveTestController } from './live-test.controller';
import { Product, ProductImage } from '../database/entities';
import { SearchModule } from '../search/search.module';
import { StorageService } from '../common/storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage]),
    SearchModule,
  ],
  controllers: [LiveTestController],
  providers: [StorageService],
})
export class LiveTestModule {}
