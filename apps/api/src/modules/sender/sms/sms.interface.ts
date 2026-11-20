export interface ISMSService {
  sendSmsCode(dto: { phoneNumber: string }): Promise<boolean>;
  verifySmsCode({
    phoneNumber,
    code,
  }: {
    phoneNumber: string;
    code: string;
  }): Promise<boolean>;
}
