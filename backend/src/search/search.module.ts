import { Module } from '@nestjs/common';
import { SearchService } from './search.service';

import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductImage } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([ProductImage])],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
