export interface ISMSService {
  sendSmsCode(dto: { phoneNumber: string }): Promise<void>;
  verifySmsCode({
    phoneNumber,
    code,
  }: {
    phoneNumber: string;
    code: string;
  }): Promise<boolean>;
}
