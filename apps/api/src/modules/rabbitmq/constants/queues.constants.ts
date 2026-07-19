export const QUEUES = {
  EMAIL: {
    name: 'email.queue',
    routingKey: 'email.*',
    durable: true,
    type: 'quorum',
    description: 'Очередь для обработки email сообщений',
  },
  ORDER: {
    name: 'order.queue',
    routingKey: 'order.*',
    durable: true,
    type: 'quorum',
    description: 'Очередь для обработки заказов',
  },
  NOTIFICATION: {
    name: 'notification.queue',
    routingKey: 'notification.*',
    durable: true,
    type: 'quorum',
    description: 'Очередь для отправки уведомлений',
  },
  DEAD_LETTER: {
    name: 'dead.letter.queue',
    durable: true,
    type: 'quorum',
    description: 'Очередь для сообщений, которые не удалось обработать',
  },
};
