export interface IEmailService {
  sendEmail({ from, to, subject, html }): Promise<void>;
}
