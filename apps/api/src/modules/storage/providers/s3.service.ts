import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

import { IFileStorage } from '../storage.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3StorageService implements IFileStorage {
  private readonly s3Client: S3Client;
  private readonly region: string;
  private readonly bucketName: string;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');

    if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error('AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
    }

    this.s3Client = new S3Client({
      region,
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
      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${uniqueFileName}`;
    } catch {
      throw new InternalServerErrorException('Error uploading file to S3');
    }
  }
}
