import notificationService from '../services/notification.service';
// import logger from './utils/logger';

export async function notificationHandler(message, deliveryInfo) {
  //   logger.info(`🔔 Обработка уведомления: ${deliveryInfo.routingKey}`, {
  //     userId: message.userId,
  //     messageId: deliveryInfo.messageId,
  //   });

  try {
    switch (deliveryInfo.routingKey) {
      case 'notification.push':
        await notificationService.sendPushNotification(message.userId, message);
        break;

      case 'notification.sms':
        await notificationService.sendSms(message.phone, message.text);
        break;

      case 'notification.in_app':
        await notificationService.sendInAppNotification(
          message.userId,
          message,
        );
        break;

      default:
        // logger.warn(`Неизвестный тип уведомления: ${deliveryInfo.routingKey}`);
        throw new Error(
          `Unknown notification type: ${deliveryInfo.routingKey}`,
        );
    }

    // logger.info(`✅ Уведомление успешно отправлено: ${message.userId}`);
  } catch (error) {
    // logger.error(`❌ Ошибка отправки уведомления:`, error);
    throw error;
  }
}
