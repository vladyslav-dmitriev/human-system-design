import emailService from '../services/email.service';
// import logger from '../../../utils/logger';

export async function emailHandler(message, deliveryInfo) {
  // logger.info(`📧 Обработка email: ${deliveryInfo.routingKey}`, {
  //   messageId: deliveryInfo.messageId,
  // });

  try {
    switch (deliveryInfo.routingKey) {
      case 'email.send':
        await emailService.sendEmail(message);
        break;

      case 'email.welcome':
        await emailService.sendWelcomeEmail(message.userId);
        break;

      case 'email.reset_password':
        await emailService.sendPasswordResetEmail(message.email, message.token);
        break;

      default:
        // logger.warn(
        //   `Неизвестный тип email сообщения: ${deliveryInfo.routingKey}`,
        // );
        throw new Error(`Unknown email type: ${deliveryInfo.routingKey}`);
    }

    // logger.info(
    //   `✅ Email успешно обработан: ${message.email || message.userId}`,
    // );
  } catch (error) {
    // logger.error(`❌ Ошибка обработки email:`, error);
    throw error;
  }
}
