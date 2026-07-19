// src/modules/rabbitmq/queues/rabbitmq.queue.binder.ts
import { Channel } from 'amqplib';
import { RabbitMQConnection } from '../connection/connection.manager';
import { RabbitMQLogger } from '../utils/rabbitmq.logger';
import { BindingDefinition } from '../types/exchanges.types';

export class RabbitMQQueueBinder {
  private readonly logger: RabbitMQLogger;
  private bindingsApplied: Set<string> = new Set();

  constructor(private readonly connection: RabbitMQConnection) {
    this.logger = new RabbitMQLogger('QueueBinder');
  }

  /**
   * ✅ Получаем СВЕЖИЙ канал для каждой операции
   */
  private async getFreshChannel(): Promise<Channel> {
    return await this.connection.getChannel();
  }

  /**
   * Применение массива биндингов
   */
  async applyBindings(
    bindings: BindingDefinition[],
    defaultExchange: string,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const binding of bindings) {
      try {
        await this.applyBinding(binding, defaultExchange);
        success++;
      } catch (error) {
        failed++;
        this.logger.warn(
          `⚠️ Ошибка биндинга для "${binding.destinationQueue}":`,
          error,
        );
      }
    }

    this.logger.info(
      `✅ Биндинги применены: ${success} успешно, ${failed} с ошибками`,
    );
    return { success, failed };
  }

  /**
   * Применение одного биндинга
   */
  async applyBinding(
    binding: BindingDefinition,
    defaultExchange: string,
  ): Promise<void> {
    const exchange = binding.sourceExchange || defaultExchange;
    const key = this.getBindingKey(binding);

    if (this.bindingsApplied.has(key)) {
      this.logger.debug(`ℹ️ Биндинг уже применен: ${binding.destinationQueue}`);
      return;
    }

    try {
      // ✅ Создаем НОВЫЙ канал для этой операции
      const channel = await this.getFreshChannel();

      await channel.bindQueue(
        binding.destinationQueue,
        exchange,
        binding.routingKey,
        binding.arguments,
      );

      this.bindingsApplied.add(key);
      this.logger.debug(
        `✅ Биндинг применен: ${binding.destinationQueue} -> ${exchange} [${binding.routingKey}]`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Ошибка биндинга: ${binding.destinationQueue} -> ${exchange}`,
        error,
      );
      throw error;
    }
  }

  private getBindingKey(binding: BindingDefinition): string {
    return `${binding.sourceExchange}:${binding.destinationQueue}:${binding.routingKey}`;
  }

  reset(): void {
    this.bindingsApplied.clear();
    this.logger.info('Биндинги сброшены');
  }
}
