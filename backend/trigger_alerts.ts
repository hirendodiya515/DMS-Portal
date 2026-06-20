import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { CalibrationAlertService } from './src/calibration-alert/calibration-alert.service';

async function bootstrap() {
  console.log('----------------------------------------------------');
  console.log('Starting NestJS standalone context for Alert Runner...');
  console.log('----------------------------------------------------');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const alertService = app.get(CalibrationAlertService);
  
  console.log('Triggering calibration alert check...');
  await alertService.checkAndSendAlerts();
  
  console.log('Daily calibration alert check run completed successfully.');
  await app.close();
  process.exit(0);
}

bootstrap().catch(err => {
  console.error('Error executing calibration alert runner:', err);
  process.exit(1);
});
