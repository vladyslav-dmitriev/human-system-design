import orderService from '../services/order.service';
// import logger from '../../../utils/logger';

export async function orderHandler(message, deliveryInfo) {
  //   logger.info(`📦 Обработка заказа: ${deliveryInfo.routingKey}`, {
  //     orderId: message.orderId,
  //     messageId: deliveryInfo.messageId,
  //   });

  try {
    switch (deliveryInfo.routingKey) {
      case 'order.created':
        await orderService.processNewOrder(message);
        break;

      case 'order.paid':
        await orderService.processPaidOrder(message.orderId);
        break;

      case 'order.shipped':
        await orderService.processShippedOrder(message.orderId);
        break;

      case 'order.cancelled':
        await orderService.processCancelledOrder(message.orderId);
        break;

      default:
        // logger.warn(`Неизвестный тип заказа: ${deliveryInfo.routingKey}`);
        throw new Error(`Unknown order type: ${deliveryInfo.routingKey}`);
    }

    // logger.info(`✅ Заказ успешно обработан: ${message.orderId}`);
  } catch (error) {
    // logger.error(`❌ Ошибка обработки заказа:`, error);
    throw error;
  }
}
