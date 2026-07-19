import { Channel } from 'amqplib';

import { Binding, BindingCollection } from './binding';
import { RabbitMQLogger } from '../utils/rabbitmq.logger';
import { retry } from '../utils/retry';
import { DEFAULT_BINDINGS } from '../constants/bindings.constants';
import { RabbitMQConnection } from '../connection/connection.manager';
import type { BindingDefinition } from '../types/exchanges.types';

export class BindingManager {
  private readonly logger: RabbitMQLogger;
  private bindings: BindingCollection;
  private appliedBindings: Set<string> = new Set();

  constructor(
    private readonly connection: RabbitMQConnection,
    private readonly customBindings?: Binding[],
  ) {
    this.logger = new RabbitMQLogger('BindingManager');
    this.bindings = new BindingCollection(customBindings || []);
  }

  /**
   * Загрузка биндингов из определений
   */
  loadDefinitions(definitions: BindingDefinition[]): void {
    const bindings = definitions.map((def) => Binding.fromDefinition(def));
    this.bindings.addMany(bindings);
    this.logger.info(`Загружено ${bindings.length} биндингов из определений`);
  }

  /**
   * Загрузка дефолтных биндингов
   */
  loadDefaultBindings(): void {
    this.loadDefinitions(DEFAULT_BINDINGS);
  }

  /**
   * Добавление биндинга
   */
  addBinding(binding: Binding): void {
    this.bindings.add(binding);
  }

  /**
   * Добавление множества биндингов
   */
  addBindings(bindings: Binding[]): void {
    this.bindings.addMany(bindings);
  }

  /**
   * Применение всех биндингов
   */
  async applyAll(): Promise<void> {
    const channel = await this.connection.getChannel();

    for (const binding of this.bindings.toArray()) {
      await this.applyBinding(channel, binding);
    }

    this.logger.info(`✅ Применено ${this.bindings.size} биндингов`);
  }

  /**
   * Применение конкретного биндинга
   */
  private async applyBinding(
    channel: Channel,
    binding: Binding,
  ): Promise<void> {
    const key = this.getBindingKey(binding);

    if (this.appliedBindings.has(key)) {
      return;
    }

    try {
      await retry(
        async () => {
          await channel.bindQueue(
            binding.destinationQueue,
            binding.sourceExchange,
            binding.routingKey,
            binding.arguments,
          );
        },
        {
          maxAttempts: 3,
          delay: 1000,
          shouldRetry: (error) => {
            this.logger.warn(`Ошибка биндинга ${binding.toString()}:`, error);
            return true;
          },
        },
      );

      this.appliedBindings.add(key);
      this.logger.debug(`✅ Применен биндинг: ${binding.toString()}`);
    } catch (error) {
      this.logger.error(
        `❌ Ошибка применения биндинга: ${binding.toString()}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Удаление всех биндингов
   */
  async removeAll(): Promise<void> {
    const channel = await this.connection.getChannel();

    for (const binding of this.bindings.toArray()) {
      const key = this.getBindingKey(binding);

      if (this.appliedBindings.has(key)) {
        try {
          await channel.unbindQueue(
            binding.destinationQueue,
            binding.sourceExchange,
            binding.routingKey,
            binding.arguments,
          );
          this.appliedBindings.delete(key);
          this.logger.debug(`🗑️ Удален биндинг: ${binding.toString()}`);
        } catch (error) {
          this.logger.warn(
            `Ошибка удаления биндинга: ${binding.toString()}`,
            error,
          );
        }
      }
    }
  }

  /**
   * Получение ключа для кеширования
   */
  private getBindingKey(binding: Binding): string {
    return `${binding.sourceExchange}:${binding.destinationQueue}:${binding.routingKey}`;
  }

  /**
   * Получение статистики биндингов
   */
  getStats(): {
    total: number;
    applied: number;
    pending: number;
  } {
    return {
      total: this.bindings.size,
      applied: this.appliedBindings.size,
      pending: this.bindings.size - this.appliedBindings.size,
    };
  }

  /**
   * Очистка всех биндингов
   */
  clear(): void {
    this.bindings = new BindingCollection();
    this.appliedBindings.clear();
    this.logger.info('Биндинги очищены');
  }
}
