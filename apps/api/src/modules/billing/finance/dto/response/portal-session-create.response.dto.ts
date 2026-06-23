import { Expose } from 'class-transformer';

export class PortalSessionCreateResponseDto {
  @Expose()
  url: string;
}
