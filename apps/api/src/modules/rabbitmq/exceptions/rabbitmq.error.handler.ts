import { Channel, Message } from 'amqplib';

import { RabbitMQLogger } from '../utils/rabbitmq.logger';
import { RabbitMQConfig } from '../rabbitmq.config';

export class RabbitMQErrorHandler {
  constructor(
    private readonly config: RabbitMQConfig,
    private readonly logger: RabbitMQLogger,
  ) {}

  async handleConsumerError(
    message: Message,
    error: Error,
    channel: Channel,
  ): Promise<void> {
    try {
      // Получаем количество попыток
      const retryCount = this.getRetryCount(message);

      if (retryCount < this.config.maxRetries) {
        // Увеличиваем счетчик и возвращаем в очередь
        const headers = message.properties.headers || {};
        headers['x-retry-count'] = retryCount + 1;
        headers['x-last-error'] = error.message;
        headers['x-last-error-time'] = new Date().toISOString();

        channel.nack(message, false, true);
        this.logger.warn(
          `🔄 Повторная попытка ${retryCount + 1}/${this.config.maxRetries}`,
        );
      } else {
        // Превышено количество попыток - отправляем в DLQ
        this.logger.error(
          `💀 Сообщение отправлено в DLQ после ${this.config.maxRetries} попыток`,
        );

        await this.sendToDeadLetterQueue(channel, message, error);
        channel.ack(message);
      }
    } catch (err) {
      this.logger.error('Ошибка в обработчике ошибок:', err);
      // В случае ошибки в обработчике, просто отклоняем сообщение
      channel.nack(message, false, false);
    }
  }

  private getRetryCount(message: Message): number {
    const headers = message.properties.headers || {};
    return headers['x-retry-count'] || 0;
  }

  private async sendToDeadLetterQueue(
    channel: Channel,
    message: Message,
    error: Error,
  ): Promise<void> {
    try {
      const dlqExchange = this.config.deadLetterExchange || 'dlx_exchange';
      const dlqRoutingKey = this.config.deadLetterRoutingKey || 'dead.letter';

      // Парсим оригинальное сообщение
      let originalContent: any;
      try {
        originalContent = JSON.parse(message.content.toString());
      } catch {
        originalContent = message.content.toString();
      }

      const errorMessage = {
        originalMessage: originalContent,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        metadata: {
          routingKey: message.fields.routingKey,
          exchange: message.fields.exchange,
          retryCount: this.getRetryCount(message),
          timestamp: new Date().toISOString(),
          originalMessageId: message.properties.messageId,
        },
      };

      channel.publish(
        dlqExchange,
        dlqRoutingKey,
        Buffer.from(JSON.stringify(errorMessage)),
        {
          persistent: true,
          contentType: 'application/json',
          timestamp: Date.now(),
          headers: {
            'x-error-type': error.name,
            'x-error-time': new Date().toISOString(),
          },
        },
      );

      this.logger.info(`💀 Сообщение отправлено в DLQ: ${dlqExchange}`);
    } catch (err) {
      this.logger.error('Ошибка отправки в DLQ:', err);
      throw err;
    }
  }

  handleProducerError(error: Error): void {
    this.logger.error('Ошибка продюсера:', error);
    // Можно добавить логику отправки ошибок в систему мониторинга
  }
}
