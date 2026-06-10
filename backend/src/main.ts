import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Enable CORS dynamically to support intranet/private server IPs (e.g. 192.168.x.x)
  app.enableCors({
    origin: (origin, callback) => {
      // Allow any requesting origin (reflects the origin in the response header)
      // to resolve CORS issues instantly across all client sites and portals
      callback(null, true);
    },
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });

  // Increase payload size limit for base64 images and large forms
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Enable validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
