import { RabbitMQLogger } from './utils/rabbitmq.logger';
import { RabbitMQConnection } from './managers/connection.manager';

import type {
  IRabbitMQHealth,
  IRabbitMQQueueManager,
} from './types/rabbitmq.interfaces';

export class RabbitMQHealth implements IRabbitMQHealth {
  private readonly logger: RabbitMQLogger;
  private metrics = {
    totalProcessed: 0,
    errors: 0,
    lastError: null as Error | null,
  };

  constructor(
    private readonly connection: RabbitMQConnection,
    private readonly queueManager: IRabbitMQQueueManager,
  ) {
    this.logger = new RabbitMQLogger('RabbitMQHealth');
  }

  async check(): Promise<{ status: 'up' | 'down'; details: any }> {
    try {
      const isConnected = this.connection.getConnected();

      if (!isConnected) {
        return {
          status: 'down',
          details: {
            error: 'Connection is not established',
            timestamp: new Date().toISOString(),
          },
        };
      }

      await this.connection.getChannel();

      const queueStatus = await this.checkQueues();

      return {
        status: 'up',
        details: {
          connected: true,
          queueStatus,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: 'down',
        details: {
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  private async checkQueues(): Promise<Record<string, any>> {
    const queues = ['email.queue', 'order.queue', 'notification.queue'];
    const status: Record<string, any> = {};

    for (const queue of queues) {
      try {
        const info = await this.queueManager.getQueueInfo(queue);
        status[queue] = {
          exists: true,
          messageCount: info.messageCount,
          consumerCount: info.consumerCount,
        };
      } catch (error) {
        status[queue] = {
          exists: false,
          error: (error as Error).message,
        };
      }
    }

    return status;
  }

  async getMetrics(): Promise<{
    connectionStatus: boolean;
    activeConsumers: number;
    queuedMessages: number;
    totalProcessed: number;
    errors: number;
  }> {
    const isConnected = this.connection.getConnected();
    let totalMessages = 0;
    let activeConsumers = 0;

    if (isConnected) {
      try {
        const queues = ['email.queue', 'order.queue', 'notification.queue'];
        for (const queue of queues) {
          const info = await this.queueManager.getQueueInfo(queue);
          totalMessages += info.messageCount;
          activeConsumers += info.consumerCount;
        }
      } catch (error) {
        this.logger.warn('Ошибка получения метрик:', error);
      }
    }

    return {
      connectionStatus: isConnected,
      activeConsumers,
      queuedMessages: totalMessages,
      totalProcessed: this.metrics.totalProcessed,
      errors: this.metrics.errors,
    };
  }

  incrementProcessed(): void {
    this.metrics.totalProcessed++;
  }

  incrementErrors(error: Error): void {
    this.metrics.errors++;
    this.metrics.lastError = error;
  }
}
