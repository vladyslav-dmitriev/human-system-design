import { Controller, UseGuards, Get, Inject } from '@nestjs/common';
import { ApiCookieAuth } from '@nestjs/swagger';

import { Serialize } from 'interceptors';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SubscriptionGetListResponseDto } from './dto';
import { ProductService } from './product.service';

@Controller('billing/products')
@UseGuards(AuthGuard)
export class ProductController {
  constructor(
    @Inject(ProductService) private readonly productService: ProductService,
  ) {}

  @Get()
  @ApiCookieAuth()
  @Serialize(SubscriptionGetListResponseDto)
  async getProducts() {
    return this.productService.getProducts();
  }

  @Get('sync')
  @ApiCookieAuth()
  // @Serialize(SubscriptionGetListResponseDto)
  async syncProducts() {
    return this.productService.syncProducts();
  }
}
