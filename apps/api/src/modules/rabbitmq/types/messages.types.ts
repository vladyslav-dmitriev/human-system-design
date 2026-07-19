export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  userId?: string;
}

export interface WelcomeEmailMessage {
  userId: string;
  email: string;
  username: string;
}

export interface ResetPasswordEmailMessage {
  email: string;
  token: string;
}

export interface OrderMessage {
  orderId: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  total: number;
}

export interface NotificationMessage {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface SMSMessage {
  phone: string;
  text: string;
}

// Типы для deliveryInfo
export interface DeliveryInfo {
  queue: string;
  routingKey: string;
  messageId: string;
  timestamp: number;
}
