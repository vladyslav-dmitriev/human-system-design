import { Module } from '@nestjs/common';

import { UserModule } from '../../user';
import { CacheModule } from '../../cache';
import { PaymentsModule } from '../payments';

import { ProductService } from './product.service';
import { ProductController } from './products.controller';
import { ProductRepository } from './product.repository';

@Module({
  imports: [UserModule, CacheModule, PaymentsModule],
  providers: [ProductService, ProductRepository],
  controllers: [ProductController],
})
export class ProductModule {}
