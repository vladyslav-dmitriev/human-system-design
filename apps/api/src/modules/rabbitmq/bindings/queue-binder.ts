// src/modules/rabbitmq/queues/rabbitmq.queue.binder.ts
import { Channel } from 'amqplib';
import { RabbitMQConnection } from '../managers/connection.manager';
import { RabbitMQLogger } from '../utils/rabbitmq.logger';
import { Queue } from '../types/exchanges.types';

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
    bindings: Queue[],
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
        this.logger.warn(`⚠️ Ошибка биндинга для "${binding.name}":`, error);
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
  async applyBinding(binding: Queue, defaultExchange: string): Promise<void> {
    const exchange = binding.exchange || defaultExchange;
    const key = this.getBindingKey(binding);

    if (this.bindingsApplied.has(key)) {
      this.logger.debug(`ℹ️ Биндинг уже применен: ${binding.name}`);
      return;
    }

    try {
      // ✅ Создаем НОВЫЙ канал для этой операции
      const channel = await this.getFreshChannel();

      await channel.bindQueue(
        binding.name,
        exchange,
        binding.routingKey,
        binding.arguments,
      );

      this.bindingsApplied.add(key);
      this.logger.debug(
        `✅ Биндинг применен: ${binding.name} -> ${exchange} [${binding.routingKey}]`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Ошибка биндинга: ${binding.name} -> ${exchange}`,
        error,
      );
      throw error;
    }
  }

  private getBindingKey(binding: Queue): string {
    return `${binding.exchange}:${binding.name}:${binding.routingKey}`;
  }

  reset(): void {
    this.bindingsApplied.clear();
    this.logger.info('Биндинги сброшены');
  }
}
