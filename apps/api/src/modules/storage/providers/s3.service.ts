import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

import { IFileStorage } from '../storage.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3StorageService implements IFileStorage {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3Client: S3Client;
  private readonly region: string;
  private readonly bucketName: string;
  private readonly publicUrl: string | undefined;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    // Для S3-совместимых хранилищ (Cloudflare R2): адрес API и публичный адрес бакета.
    // Без них поведение прежнее (AWS S3 и ссылка вида https://<bucket>.s3.<region>.amazonaws.com/...)
    const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');
    const publicUrl = this.configService.get<string>('AWS_S3_PUBLIC_URL');

    if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error('AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
    }

    this.s3Client = new S3Client({
      region,
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle: true,
      requestHandler: {
        connectionTimeout: 5000,
        requestTimeout: 5000,
      },
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.region = region;
    this.bucketName = bucketName;
    this.publicUrl = publicUrl?.replace(/\/+$/, '') || undefined;
  }

  async upload(params: {
    file: Buffer;
    fileName?: string;
    folder: string;
    contentType?: string;
  }): Promise<string> {
    const { file, fileName, folder, contentType } = params;
    const uniqueFileName = `${folder}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: uniqueFileName,
      Body: file,
      ContentType: contentType,
      ContentLength: file.length,
    });

    try {
      await this.s3Client.send(command);

      return this.publicUrl
        ? `${this.publicUrl}/${uniqueFileName}`
        : `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${uniqueFileName}`;
    } catch (error) {
      // Причина только в лог: клиенту уходит общий 500
      const reason =
        error instanceof Error ? `${error.name}: ${error.message}` : 'unknown';
      this.logger.error(`Upload to ${folder}/ failed: ${reason}`);
      throw new InternalServerErrorException('Error uploading file to S3');
    }
  }
}
