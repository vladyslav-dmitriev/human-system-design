// import type {
//   MessageHandlerConfig,
//   MethodConfig,
//   ProducerConfig,
// } from '../types/decorators.types';

// /**
//  * Декоратор для класса-обработчика сообщений
//  */
// export function RabbitMQHandler(config: Omit<MessageHandlerConfig, 'method'>) {
//   return function (target: any) {
//     Reflect.defineMetadata('rabbitmq:handler:config', config, target);

//     return target;
//   };
// }

// /**
//  * Декоратор для метода-обработчика
//  */
// export function OnMessage(config: Omit<MessageHandlerConfig, 'method'>) {
//   return function (
//     target: any,
//     propertyKey: string,
//     descriptor: PropertyDescriptor,
//   ) {
//     const existingMetadata: MessageHandlerConfig[] =
//       Reflect.getMetadata('rabbitmq:message:handlers', target.constructor) ||
//       [];

//     const fullConfig: MessageHandlerConfig = {
//       ...config,
//       // @ts-ignore
//       method: propertyKey,
//     };

//     existingMetadata.push(fullConfig);
//     Reflect.defineMetadata(
//       'rabbitmq:message:handlers',
//       existingMetadata,
//       target.constructor,
//     );
//     return descriptor;
//   };
// }

// /**
//  * Декоратор для класса-продюсера
//  */
// export function RabbitMQProducer(config: ProducerConfig = {}) {
//   return function (target: any) {
//     Reflect.defineMetadata('rabbitmq:producer:config', config, target);

//     return target;
//   };
// }

// /**
//  * Декоратор для метода-продюсера
//  */
// export function Publish(config: MethodConfig) {
//   return function (
//     target: any,
//     propertyKey: string,
//     descriptor: PropertyDescriptor,
//   ) {
//     const existingMetadata: MethodConfig[] =
//       Reflect.getMetadata('rabbitmq:publish:methods', target.constructor) || [];

//     existingMetadata.push(config);
//     Reflect.defineMetadata(
//       'rabbitmq:publish:methods',
//       existingMetadata,
//       target.constructor,
//     );
//     return descriptor;
//   };
// }

// /**
//  * Декоратор для автоматического ретрая
//  */
// export function Retry(maxAttempts: number = 3, delay: number = 1000) {
//   return function (
//     target: any,
//     propertyKey: string,
//     descriptor: PropertyDescriptor,
//   ) {
//     const originalMethod = descriptor.value;

//     descriptor.value = async function (...args: any[]) {
//       let lastError: Error | null = null;

//       for (let attempt = 1; attempt <= maxAttempts; attempt++) {
//         try {
//           return await originalMethod.apply(this, args);
//         } catch (error) {
//           lastError = error as Error;
//           if (attempt < maxAttempts) {
//             await new Promise((resolve) =>
//               setTimeout(resolve, delay * attempt),
//             );
//           }
//         }
//       }

//       throw lastError;
//     };

//     return descriptor;
//   };
// }

// /**
//  * Декоратор для логирования
//  */
// export function LogMessage() {
//   return function (
//     target: any,
//     propertyKey: string,
//     descriptor: PropertyDescriptor,
//   ) {
//     const originalMethod = descriptor.value;

//     descriptor.value = async function (...args: any[]) {
//       const message = args[0];
//       console.log(`[${new Date().toISOString()}] Processing message:`, {
//         messageId: message?.id || 'unknown',
//         routingKey: message?.routingKey || 'unknown',
//         method: propertyKey,
//       });

//       try {
//         const result = await originalMethod.apply(this, args);
//         console.log(
//           `[${new Date().toISOString()}] Message processed successfully`,
//         );
//         return result;
//       } catch (error) {
//         console.error(
//           `[${new Date().toISOString()}] Message processing failed:`,
//           error,
//         );
//         throw error;
//       }
//     };

//     return descriptor;
//   };
// }

// /**
//  * Композитный декоратор для обработчика
//  */
// export function MessageHandler(config: MessageHandlerConfig) {
//   return function (target: any) {
//     RabbitMQHandler(config)(target);

//     return target;
//   };
// }
