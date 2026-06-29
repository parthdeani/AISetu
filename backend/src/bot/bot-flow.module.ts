import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotFlowController } from './bot-flow.controller';
import { BotFlowService } from './bot-flow.service';
import {
  ChatbotFlow,
  Customer,
  Conversation,
  Message,
  Product,
  ProductImage,
  SearchHistory,
} from '../database/entities';
import { SearchModule } from '../search/search.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatbotFlow,
      Customer,
      Conversation,
      Message,
      Product,
      ProductImage,
      SearchHistory,
    ]),
    SearchModule,
    forwardRef(() => WhatsAppModule),
  ],
  controllers: [BotFlowController],
  providers: [BotFlowService],
  exports: [BotFlowService],
})
export class BotFlowModule {}
