import { Module } from '@nestjs/common';

import { StorageService } from './storage.service';
import { S3StorageService } from './providers/s3.service';

@Module({
  providers: [
    {
      provide: 'STORAGE_PROVIDER',
      useClass: S3StorageService,
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
