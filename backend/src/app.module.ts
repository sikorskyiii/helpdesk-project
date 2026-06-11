import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  emailConfig,
  storageConfig,
  throttleConfig,
} from './config';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, emailConfig, storageConfig, throttleConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => [
        {
          ttl: parseInt(process.env.THROTTLE_TTL || '60', 10) * 1000,
          limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
        },
      ],
    }),
    DatabaseModule,
    // Feature modules will be added here in subsequent stages
  ],
})
export class AppModule {}
