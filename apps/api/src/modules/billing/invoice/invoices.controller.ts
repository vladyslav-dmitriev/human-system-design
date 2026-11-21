import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Controller, UseGuards, Get, Inject } from '@nestjs/common';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { InvoiceService } from './invoice.service';
import { Serialize } from 'interceptors';
import { InvoiceGetListResponseDto } from './dto';

@ApiTags('Invoices')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'No valid session' })
@Controller('billing/invoices')
@UseGuards(AuthGuard)
export class InvoicesController {
  constructor(
    @Inject(InvoiceService) private readonly invoiceService: InvoiceService,
  ) {}

  @Get()
  @ApiOkResponse({ type: InvoiceGetListResponseDto, isArray: true })
  @Serialize(InvoiceGetListResponseDto)
  async getUserInvoiceList(@GetUser('id') userId: string) {
    return this.invoiceService.getUserInvoiceList(userId);
  }
}
