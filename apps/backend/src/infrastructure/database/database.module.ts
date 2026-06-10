import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AllConfig } from '../config/configuration';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfig, true>) => ({
        uri: configService.get('database.uri', { infer: true }),
        autoIndex: configService.get('app.nodeEnv', { infer: true }) !== 'production',
      }),
    }),
  ],
})
export class DatabaseModule {}
