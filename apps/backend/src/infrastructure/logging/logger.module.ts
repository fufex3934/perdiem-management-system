import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { AllConfig } from '../config/configuration';
import { createWinstonConfig } from './winston.config';

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfig, true>) => {
        const appConfig = configService.get('app', { infer: true });
        const loggingConfig = configService.get('logging', { infer: true });

        return createWinstonConfig(appConfig.name, loggingConfig.level);
      },
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
