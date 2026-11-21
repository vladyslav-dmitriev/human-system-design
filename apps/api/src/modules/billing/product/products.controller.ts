import { Controller, UseGuards, Get, Post, Inject } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Serialize } from 'interceptors';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ProductSyncResponseDto, SubscriptionGetListResponseDto } from './dto';
import { ProductService } from './product.service';

@ApiTags('Products')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'No valid session' })
@Controller('billing/products')
@UseGuards(AuthGuard)
export class ProductController {
  constructor(
    @Inject(ProductService) private readonly productService: ProductService,
  ) {}

  @Get()
  @ApiOkResponse({ type: SubscriptionGetListResponseDto })
  @Serialize(SubscriptionGetListResponseDto)
  async getProducts() {
    return this.productService.getProducts();
  }

  /** Меняет состояние (БД, кэш, запросы в Stripe), поэтому POST и только ADMIN. */
  @Post('sync')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOkResponse({ type: ProductSyncResponseDto })
  @ApiForbiddenResponse({ description: 'ADMIN role required' })
  @Serialize(ProductSyncResponseDto)
  async syncProducts() {
    return this.productService.syncProducts();
  }
}
