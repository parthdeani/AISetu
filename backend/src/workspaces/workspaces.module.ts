import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspacesController } from './workspaces.controller';
import { Customer, Message, Product, ProductImage, SearchHistory, Conversation } from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, Message, Product, ProductImage, SearchHistory, Conversation]),
  ],
  controllers: [WorkspacesController],
})
export class WorkspacesModule {}
