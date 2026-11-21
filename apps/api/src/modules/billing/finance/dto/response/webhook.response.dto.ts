import { Expose } from 'class-transformer';

export class WebhookResponseDto {
  @Expose()
  received: boolean;
}
