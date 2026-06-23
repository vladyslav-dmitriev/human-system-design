import { Get } from '@nestjs/common';

export class AppController {
  @Get('/health')
  healthCheck() {
    return { status: 'ok' };
  }
}
