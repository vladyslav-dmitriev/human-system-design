// import { client } from './client';
// import { config } from './rabbitmq.config';
// // import logger from '../../utils/logger';
// import handlers from './handlers';

// class Consumer {
//   constructor() {
//     this.consumerTags = [];
//   }

//   /**
//    * Регистрация всех обработчиков
//    */
//   async registerAll() {
//     const queueConfigs = [
//       {
//         queue: 'email.queue',
//         routingKey: 'email.*',
//         handler: handlers.emailHandler,
//       },
//       {
//         queue: 'order.queue',
//         routingKey: 'order.*',
//         handler: handlers.orderHandler,
//       },
//       {
//         queue: 'notification.queue',
//         routingKey: 'notification.*',
//         handler: handlers.notificationHandler,
//       },
//     ];

//     for (const config of queueConfigs) {
//       await this.register(config);
//     }

//     // logger.info(`✅ Зарегистрировано ${queueConfigs.length} обработчиков`);
//   }

//   /**
//    * Регистрация одного обработчика
//    */
//   async register({ queue, routingKey, handler, options = {} }) {
//     try {
//       const channel = await client.getChannel();

//       // Создаем очередь
//       await channel.assertQueue(queue, {
//         durable: true, // Сохранять очередь после перезапуска
//         autoDelete: false,
//         arguments: {
//           'x-queue-type': 'quorum', // Используем quorum очередь для надежности
//         },
//       });

//       // Привязываем очередь к обменнику
//       await channel.bindQueue(queue, config.exchange, routingKey);

//       //   logger.info(`📌 Очередь "${queue}" привязана к ключу "${routingKey}"`);

//       // Запускаем потребление
//       const consumerTag = await channel.consume(
//         queue,
//         async (msg) => {
//           if (!msg) return;

//           try {
//             // Парсим сообщение
//             const content = JSON.parse(msg.content.toString());
//             const deliveryInfo = {
//               queue,
//               routingKey: msg.fields.routingKey,
//               messageId: msg.properties.messageId || 'unknown',
//               timestamp: msg.properties.timestamp,
//             };

//             // logger.debug(`📥 Получено сообщение из ${queue}`, deliveryInfo);

//             // Вызываем обработчик
//             await handler(content, deliveryInfo);

//             // Подтверждаем обработку
//             channel.ack(msg);

//             // logger.debug(`✅ Сообщение обработано (${queue})`);
//           } catch (error) {
//             // logger.error(`❌ Ошибка обработки сообщения (${queue}):`, error);

//             // Решение: отправить в DLQ или вернуть в очередь
//             await this.handleError(channel, msg, error, queue);
//           }
//         },
//         {
//           noAck: false, // Ручное подтверждение
//           ...options,
//         },
//       );

//       this.consumerTags.push({ queue, consumerTag });
//       //   logger.info(`👂 Consumer запущен для "${queue}" (${routingKey})`);
//     } catch (error) {
//       //   logger.error(`❌ Ошибка регистрации consumer (${queue}):`, error);
//       throw error;
//     }
//   }

//   /**
//    * Обработка ошибок при потреблении
//    */
//   async handleError(channel, msg, error, queue) {
//     try {
//       // Проверяем, сколько раз сообщение уже было обработано
//       const retryCount = this.getRetryCount(msg);

//       if (retryCount < config.maxRetries) {
//         // Увеличиваем счетчик попыток
//         const headers = msg.properties.headers || {};
//         headers['x-retry-count'] = retryCount + 1;

//         // Отклоняем и возвращаем в очередь с задержкой
//         channel.nack(msg, false, true);
//         // logger.warn(
//         //   `🔄 Сообщение будет повторно обработано (${retryCount + 1}/${config.maxRetries})`,
//         // );
//       } else {
//         // Превышено количество попыток - отправляем в DLQ или удаляем
//         // logger.error(`💀 Сообщение удалено после ${config.maxRetries} попыток`);

//         // Отправляем в Dead Letter Queue
//         await this.sendToDLQ(channel, msg, error);
//         channel.ack(msg); // Удаляем из основной очереди
//       }
//     } catch (err) {
//       //   logger.error('Ошибка в обработчике ошибок:', err);
//       channel.nack(msg, false, true); // Возвращаем в очередь
//     }
//   }

//   /**
//    * Получение количества попыток обработки
//    */
//   getRetryCount(msg) {
//     const headers = msg.properties.headers || {};
//     return headers['x-retry-count'] || 0;
//   }

//   /**
//    * Отправка сообщения в Dead Letter Queue
//    */
//   async sendToDLQ(channel, msg, error) {
//     const dlqQueue = 'dead.letter.queue';

//     await channel.assertQueue(dlqQueue, {
//       durable: true,
//       arguments: {
//         'x-queue-type': 'quorum',
//       },
//     });

//     const errorInfo = {
//       originalMessage: JSON.parse(msg.content.toString()),
//       error: error.message,
//       stack: error.stack,
//       routingKey: msg.fields.routingKey,
//       timestamp: new Date().toISOString(),
//     };

//     channel.sendToQueue(dlqQueue, Buffer.from(JSON.stringify(errorInfo)), {
//       persistent: true,
//     });

//     // logger.info(`💀 Сообщение отправлено в DLQ: ${dlqQueue}`);
//   }

//   /**
//    * Остановка всех consumer'ов
//    */
//   async stopAll() {
//     const channel = await client.getChannel();

//     for (const { queue, consumerTag } of this.consumerTags) {
//       await channel.cancel(consumerTag);
//       //   logger.info(`🛑 Consumer для "${queue}" остановлен`);
//     }

//     this.consumerTags = [];
//   }
// }

// export const consumer = new Consumer();
