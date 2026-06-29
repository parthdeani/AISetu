import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Enable global prefix
  app.setGlobalPrefix('api');

  // Serve local uploads statically
  const express = require('express');
  const path = require('path');
  app.use('/api/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Enforce global request validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger OpenAPI documentation configuration
  const config = new DocumentBuilder()
    .setTitle('Visual WhatsApp Commerce API')
    .setDescription('Production-ready SaaS platform APIs for WhatsApp visual catalog search')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 NestJS Backend running on: http://localhost:${port}`);
  console.log(`📖 Swagger API documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
