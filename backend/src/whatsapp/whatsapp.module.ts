import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppAccount, Customer, Conversation, Message } from '../database/entities';
import { StorageService } from '../common/storage.service';
import { BotFlowModule } from '../bot/bot-flow.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WhatsAppAccount, Customer, Conversation, Message]),
    forwardRef(() => BotFlowModule),
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, StorageService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
