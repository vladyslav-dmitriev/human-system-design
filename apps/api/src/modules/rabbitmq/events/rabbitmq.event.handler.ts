import { EventEmitter } from 'events';
import { RabbitMQEvent, ErrorEvent, MetricEvent } from './rabbitmq.events';
import { RabbitMQLogger } from '../utils/rabbitmq.logger';

type EventHandler<T extends RabbitMQEvent = RabbitMQEvent> = (
  event: T,
) => Promise<void> | void;

export class RabbitMQEventHandler extends EventEmitter {
  private readonly logger: RabbitMQLogger;
  private handlers: Map<string, EventHandler[]> = new Map();

  constructor() {
    super();
    this.logger = new RabbitMQLogger('EventHandler');
  }

  /**
   * Регистрация обработчика события
   */
  onEvent<T extends RabbitMQEvent>(
    eventType: string,
    handler: EventHandler<T>,
  ): this {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler as EventHandler);
    this.logger.debug(`Зарегистрирован обработчик для ${eventType}`);
    return this;
  }

  /**
   * Регистрация обработчика для всех событий
   */
  onAllEvents(handler: EventHandler<RabbitMQEvent>): this {
    return this.onEvent('*', handler);
  }

  /**
   * Отправка события
   */
  async emitEvent<T extends RabbitMQEvent>(event: T): Promise<void> {
    // Логируем событие
    this.logger.debug(`Событие: ${event.type}`, event);

    // Отправляем через EventEmitter
    this.emit(event.type, event);
    this.emit('*', event);

    // Вызываем зарегистрированные обработчики
    const handlers = this.handlers.get(event.type) || [];
    const allHandlers = this.handlers.get('*') || [];

    const all = [...handlers, ...allHandlers];

    for (const handler of all) {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(`Ошибка в обработчике ${event.type}:`, error);
      }
    }
  }

  /**
   * Удаление обработчика
   */
  removeEventHandler(eventType: string, handler: EventHandler): this {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  /**
   * Очистка всех обработчиков
   */
  clearHandlers(): this {
    this.handlers.clear();
    this.removeAllListeners();
    return this;
  }

  /**
   * Создание обработчика для логирования
   */
  static createLoggingHandler(): RabbitMQEventHandler {
    const handler = new RabbitMQEventHandler();

    handler.onAllEvents(async (event) => {
      console.log(`[Event] ${event.type} at ${event.timestamp.toISOString()}`);
    });

    handler.onEvent<ErrorEvent>('error', async (event) => {
      console.error(`[Error] ${event.context}: ${event.error.message}`);
    });

    handler.onEvent<MetricEvent>('metric', async (event) => {
      console.log(`[Metric] ${event.metricName} = ${event.value}`);
    });

    return handler;
  }
}
