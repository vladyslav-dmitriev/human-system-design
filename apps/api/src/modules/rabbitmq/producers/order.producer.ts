import { RabbitMQConfig } from '../rabbitmq.config';
import { RabbitMQProducer } from '../rabbitmq.producers';
import { RabbitMQConnection } from '../connection/connection.manager';

import type { IRabbitMQSerializer } from '../types/rabbitmq.interfaces';

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface OrderMessage {
  orderId: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'created' | 'paid' | 'shipped' | 'cancelled';
  createdAt: string;
}

export class OrderProducer extends RabbitMQProducer {
  constructor(
    connection: RabbitMQConnection,
    config: RabbitMQConfig,
    serializer?: IRabbitMQSerializer,
  ) {
    super(connection, config, serializer);
  }

  async orderCreated(order: OrderMessage): Promise<boolean> {
    return this.publish('order.created', order, {
      type: 'order.created',
      headers: {
        'x-message-type': 'order',
        'x-priority': 'high',
        'x-order-id': order.orderId,
      },
    });
  }

  async orderPaid(orderId: string, userId: string): Promise<boolean> {
    return this.publish(
      'order.paid',
      {
        orderId,
        userId,
        status: 'paid',
        timestamp: new Date().toISOString(),
      },
      {
        type: 'order.paid',
        headers: {
          'x-message-type': 'order',
          'x-priority': 'high',
          'x-order-id': orderId,
        },
      },
    );
  }

  async orderShipped(
    orderId: string,
    trackingNumber: string,
  ): Promise<boolean> {
    return this.publish(
      'order.shipped',
      {
        orderId,
        trackingNumber,
        status: 'shipped',
        timestamp: new Date().toISOString(),
      },
      {
        type: 'order.shipped',
        headers: {
          'x-message-type': 'order',
          'x-priority': 'normal',
          'x-order-id': orderId,
        },
      },
    );
  }

  async orderCancelled(orderId: string, reason: string): Promise<boolean> {
    return this.publish(
      'order.cancelled',
      {
        orderId,
        reason,
        status: 'cancelled',
        timestamp: new Date().toISOString(),
      },
      {
        type: 'order.cancelled',
        headers: {
          'x-message-type': 'order',
          'x-priority': 'high',
          'x-order-id': orderId,
        },
      },
    );
  }
}
