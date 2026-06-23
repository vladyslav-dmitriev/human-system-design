import { Controller, UseGuards, Get, Inject } from '@nestjs/common';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { InvoiceService } from './invoice.service';
import { Serialize } from 'interceptors';
import { InvoiceGetListResponseDto } from './dto';

@Controller('billing/invoices')
@UseGuards(AuthGuard)
export class InvoicesController {
  constructor(
    @Inject(InvoiceService) private readonly invoiceService: InvoiceService,
  ) {}

  @Get()
  @Serialize(InvoiceGetListResponseDto)
  async getUserInvoiceList(@GetUser('id') userId: string) {
    return this.invoiceService.getUserInvoiceList(userId);
  }
}
