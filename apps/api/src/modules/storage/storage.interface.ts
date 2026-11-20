export interface IFileStorage {
  upload(params: {
    file: Buffer;
    fileName?: string;
    folder: string;
    contentType?: string;
  }): Promise<string>;
}
