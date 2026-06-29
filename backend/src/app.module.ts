import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/auth.guard';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { BotFlowModule } from './bot/bot-flow.module';
import { LiveTestModule } from './live-test/live-test.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import {
  Workspace,
  User,
  WhatsAppAccount,
  ChatbotFlow,
  Product,
  ProductImage,
  Customer,
  Conversation,
  Message,
  SearchHistory,
  Subscription,
} from './database/entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mongodb',
      url: process.env.MONGODB_URI || 'mongodb://localhost:27017/vwc_db',
      entities: [
        Workspace,
        User,
        WhatsAppAccount,
        ChatbotFlow,
        Product,
        ProductImage,
        Customer,
        Conversation,
        Message,
        SearchHistory,
        Subscription,
      ],
      synchronize: true, // Auto create/update collections schema in dev/production sandbox
      logging: false,
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: () => 1000000, // Delay reconnect retries to prevent console spam
      },
    }),
    AuthModule,
    CatalogModule,
    WhatsAppModule,
    BotFlowModule,
    LiveTestModule,
    WorkspacesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
