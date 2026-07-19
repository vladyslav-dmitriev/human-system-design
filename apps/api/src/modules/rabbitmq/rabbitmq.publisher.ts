import { client } from './client';
import { config } from './rabbitmq.config';
// import logger from './utils/logger';

class Publisher {
  /**
   * Публикация сообщения в очередь
   * @param {string} routingKey - Ключ маршрутизации (например, 'email.send')
   * @param {object} message - Данные сообщения
   * @param {object} options - Дополнительные опции
   */
  async publish(routingKey, message, options = {}) {
    try {
      const channel = await client.getChannel();

      // Преобразуем сообщение в Buffer
      const content = Buffer.from(JSON.stringify(message));

      // Опции по умолчанию
      const defaultOptions = {
        persistent: true, // Сохранять на диск
        contentType: 'application/json',
        timestamp: Date.now(),
      };

      const publishOptions = { ...defaultOptions, ...options };

      // Публикуем сообщение
      const result = channel.publish(
        config.exchange,
        routingKey,
        content,
        publishOptions,
      );

      if (result) {
        // logger.debug(`📤 Сообщение опубликовано: ${routingKey}`, {
        //   messageId: options.messageId || 'unknown',
        //   timestamp: new Date().toISOString(),
        // });
      } else {
        // logger.warn(
        //   `⚠️ Сообщение не опубликовано (буфер заполнен): ${routingKey}`,
        // );
      }

      return result;
    } catch (error) {
      //   logger.error(`❌ Ошибка публикации сообщения (${routingKey}):`, error);
      throw error;
    }
  }

  /**
   * Публикация с автоматической повторной попыткой
   */
  async publishWithRetry(routingKey, message, maxAttempts = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.publish(routingKey, message);
      } catch (error) {
        lastError = error;
        // logger.warn(`Попытка ${attempt}/${maxAttempts} публикации не удалась`);

        if (attempt < maxAttempts) {
          await this.delay(1000 * attempt); // Экспоненциальная задержка
        }
      }
    }

    throw new Error(
      `Не удалось опубликовать сообщение после ${maxAttempts} попыток: ${lastError.message}`,
    );
  }

  /**
   * Вспомогательный метод для задержки
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Публикация отложенного сообщения (с задержкой)
   */
  async publishDelayed(routingKey, message, delayMs = 5000) {
    // Создаем временную очередь с TTL
    const channel = await client.getChannel();
    const queueName = `delayed.${routingKey}`;

    await channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        // 'x-dead-letter-exchange': config.exchange,
        'x-dead-letter-routing-key': routingKey,
        'x-message-ttl': delayMs,
        'x-expires': delayMs + 10000, // Удалить очередь через 10 секунд после TTL
      },
    });

    // Публикуем в временную очередь
    const content = Buffer.from(JSON.stringify(message));
    return channel.sendToQueue(queueName, content, {
      persistent: true,
      contentType: 'application/json',
    });
  }
}

export const publisher = new Publisher();
