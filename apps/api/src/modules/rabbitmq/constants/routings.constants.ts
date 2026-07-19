export const ROUTING_KEYS = {
  EMAIL_SEND: 'email.send',
  EMAIL_WELCOME: 'email.welcome',
  EMAIL_RESET: 'email.reset.request',
  ORDER_CREATED: 'order.created',
  ORDER_PAID: 'order.paid',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_CANCELLED: 'order.cancelled',
  NOTIFICATION_PUSH: 'notification.push',
  NOTIFICATION_SMS: 'notification.sms',
  NOTIFICATION_IN_APP: 'notification.in_app',
  DEAD_LETTER: 'dead.letter',
} as const;
