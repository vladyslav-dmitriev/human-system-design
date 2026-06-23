export interface IFileStorage {
  upload(params: {
    file: any;
    fileName?: string;
    folder: string;
    contentType?: string;
  }): Promise<string>;
}
