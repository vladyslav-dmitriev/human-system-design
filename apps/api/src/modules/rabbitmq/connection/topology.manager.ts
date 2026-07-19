// import { EXCHANGES } from '../constants/exchanges.constants';
// import { RabbitMQLogger } from '../utils/rabbitmq.logger';
// import { retry } from '../utils/retry';
// import { BindingManager } from '../bindings/binding.manager';
// import { RabbitMQConnection } from './connection.manager';
// import type {
//   BindingDefinition,
//   ExchangeDefinition,
// } from '../types/exchanges.types';
// import type { IRabbitMQQueueManager } from '../types/rabbitmq.interfaces';

// export class TopologyManager {
//   private readonly logger: RabbitMQLogger;
//   private queueManager: IRabbitMQQueueManager;
//   private bindingManager: BindingManager;

//   constructor(
//     private readonly connection: RabbitMQConnection,
//     private readonly customExchanges?: ExchangeDefinition[],
//     private readonly customBindings?: BindingDefinition[],
//   ) {
//     this.logger = new RabbitMQLogger('TopologyManager');
//     this.queueManager = new RabbitMQQueueManager(connection);
//     this.bindingManager = new BindingManager(connection);
//   }

//   /**
//    * Установка топологии
//    */
//   async setup(): Promise<void> {
//     this.logger.info('🏗️ Настройка топологии RabbitMQ...');

//     try {
//       // 1. Создаем обменники
//       await this.setupExchanges();

//       // 2. Создаем очереди
//       // await this.setupQueues();

//       // 3. Настраиваем биндинги
//       await this.setupBindings();

//       // 4. Проверяем топологию
//       await this.verifyTopology();

//       this.logger.info('✅ Топология успешно настроена');
//     } catch (error) {
//       this.logger.error('❌ Ошибка настройки топологии:', error);
//       throw error;
//     }
//   }

//   /**
//    * Настройка обменников
//    */
//   private async setupExchanges(): Promise<void> {
//     // Сначала создаем дефолтные обменники
//     const exchanges = Object.values(EXCHANGES);

//     for (const exchange of exchanges) {
//       await retry(
//         async () => {
//           await this.queueManager.assertExchange({
//             name: exchange.name,
//             type: exchange.type,
//             durable: exchange.durable,
//             autoDelete: exchange.autoDelete,
//             internal: exchange.internal,
//             arguments: exchange.arguments,
//           });
//           this.logger.debug(`✅ Создан обменник: ${exchange.name}`);
//         },
//         {
//           maxAttempts: 3,
//           delay: 1000,
//           logger: this.logger,
//         },
//       );
//     }

//     // Если есть кастомные обменники
//     if (this.customExchanges) {
//       for (const exchange of this.customExchanges) {
//         await this.queueManager.assertExchange(exchange);
//         this.logger.debug(`✅ Создан кастомный обменник: ${exchange.name}`);
//       }
//     }

//     this.logger.info(
//       `Создано ${exchanges.length + (this.customExchanges?.length || 0)} обменников`,
//     );
//   }

//   /**
//    * Настройка очередей
//    */
//   private async setupQueues(): Promise<void> {
//     // Создаем основные очереди
//     const queueNames = [
//       'email.queue',
//       'email.welcome.queue',
//       'email.reset.queue',
//       'order.queue',
//       'order.priority.queue',
//       'notification.queue',
//       'notification.push.queue',
//       'dead.letter.queue',
//       'events.audit.queue',
//       'events.analytics.queue',
//     ];

//     for (const queueName of queueNames) {
//       await retry(
//         async () => {
//           await this.queueManager.assertQueue(queueName, {
//             durable: true,
//             arguments: {
//               'x-queue-type': 'quorum',
//               // 'x-max-priority': 10,
//             },
//           });
//           this.logger.debug(`✅ Создана очередь: ${queueName}`);
//         },
//         {
//           maxAttempts: 3,
//           delay: 1000,
//           logger: this.logger,
//         },
//       );
//     }

//     this.logger.info(`Создано ${queueNames.length} очередей`);
//   }

//   /**
//    * Настройка биндингов
//    */
//   private async setupBindings(): Promise<void> {
//     // Загружаем дефолтные биндинги
//     this.bindingManager.loadDefaultBindings();

//     // Если есть кастомные биндинги
//     if (this.customBindings) {
//       this.bindingManager.loadDefinitions(this.customBindings);
//     }

//     // Применяем биндинги
//     await this.bindingManager.applyAll();

//     const stats = this.bindingManager.getStats();
//     this.logger.info(`Применено ${stats.applied} биндингов`);
//   }

//   /**
//    * Проверка топологии
//    */
//   private async verifyTopology(): Promise<void> {
//     try {
//       const channel = await this.connection.getChannel();

//       // Проверяем, что обменники существуют
//       const exchanges = Object.values(EXCHANGES);
//       for (const exchange of exchanges) {
//         try {
//           await channel.checkExchange(exchange.name);
//           this.logger.debug(`✅ Обменник проверен: ${exchange.name}`);
//         } catch (error) {
//           this.logger.warn(`⚠️ Обменник не найден: ${exchange.name}`);
//         }
//       }

//       // Проверяем очередь DLX
//       try {
//         await channel.checkQueue('dead.letter.queue');
//         this.logger.debug('✅ DLX очередь существует');
//       } catch {
//         this.logger.warn('⚠️ DLX очередь не найдена, создаем...');
//         await this.queueManager.assertQueue('dead.letter.queue', {
//           durable: true,
//           arguments: {
//             'x-queue-type': 'quorum',
//           },
//         });
//       }

//       this.logger.info('✅ Верификация топологии завершена');
//     } catch (error) {
//       this.logger.warn('⚠️ Ошибка верификации топологии:', error);
//     }
//   }

//   /**
//    * Очистка топологии
//    */
//   async cleanup(): Promise<void> {
//     this.logger.info('🧹 Очистка топологии...');

//     try {
//       // Удаляем биндинги
//       await this.bindingManager.removeAll();

//       // Удаляем очереди
//       const queueNames = [
//         'email.queue',
//         'order.queue',
//         'notification.queue',
//         'dead.letter.queue',
//       ];

//       for (const queueName of queueNames) {
//         try {
//           await this.queueManager.deleteQueue(queueName);
//           this.logger.debug(`🗑️ Удалена очередь: ${queueName}`);
//         } catch (error) {
//           this.logger.warn(`Ошибка удаления очереди ${queueName}:`, error);
//         }
//       }

//       // Удаляем обменники
//       const exchanges = Object.values(EXCHANGES);
//       for (const exchange of exchanges) {
//         try {
//           const channel = await this.connection.getChannel();
//           await channel.deleteExchange(exchange.name);
//           this.logger.debug(`🗑️ Удален обменник: ${exchange.name}`);
//         } catch (error) {
//           this.logger.warn(
//             `Ошибка удаления обменника ${exchange.name}:`,
//             error,
//           );
//         }
//       }

//       this.logger.info('✅ Топология очищена');
//     } catch (error) {
//       this.logger.error('❌ Ошибка очистки топологии:', error);
//       throw error;
//     }
//   }

//   /**
//    * Получение статуса топологии
//    */
//   async getStatus(): Promise<{
//     exchanges: number;
//     queues: number;
//     bindings: number;
//   }> {
//     try {
//       const channel = await this.connection.getChannel();

//       let exchangeCount = 0;
//       let queueCount = 0;
//       let bindingCount = 0;

//       // Подсчет обменников
//       const exchanges = Object.values(EXCHANGES);
//       for (const exchange of exchanges) {
//         try {
//           await channel.checkExchange(exchange.name);
//           exchangeCount++;
//         } catch {
//           // Обменник не существует
//         }
//       }

//       // Подсчет очередей
//       const queueNames = [
//         'email.queue',
//         'order.queue',
//         'notification.queue',
//         'dead.letter.queue',
//       ];

//       for (const queueName of queueNames) {
//         try {
//           const info = await this.queueManager.getQueueInfo(queueName);
//           if (info) {
//             queueCount++;
//           }
//         } catch {
//           // Очередь не существует
//         }
//       }

//       const stats = this.bindingManager.getStats();
//       bindingCount = stats.applied;

//       return {
//         exchanges: exchangeCount,
//         queues: queueCount,
//         bindings: bindingCount,
//       };
//     } catch (error) {
//       this.logger.error('Ошибка получения статуса:', error);
//       return {
//         exchanges: 0,
//         queues: 0,
//         bindings: 0,
//       };
//     }
//   }
// }
