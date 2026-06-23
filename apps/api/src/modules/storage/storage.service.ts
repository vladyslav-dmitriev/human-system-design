import { Injectable, Inject } from '@nestjs/common';

import type { IFileStorage } from './storage.interface';

@Injectable()
export class StorageService {
  constructor(
    @Inject('STORAGE_PROVIDER') private readonly storage: IFileStorage,
  ) {}

  async upload(params: Parameters<IFileStorage['upload']>[0]): Promise<string> {
    return this.storage.upload(params);
  }
}
