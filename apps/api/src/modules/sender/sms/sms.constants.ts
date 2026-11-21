/** Номер, введённый при включении 2FA, до подтверждения кодом. Хранится в Redis, TTL 10 минут. */
export const PENDING_PHONE_TTL_SECONDS = 600;
export const pendingPhoneKey = (userId: string) => `pending-phone:${userId}`;

/** Лимит отправки SMS на пользователя: не больше 5 за час. */
export const SMS_SEND_LIMIT = 5;
export const SMS_SEND_WINDOW_SECONDS = 3600;
export const smsSendCounterKey = (userId: string) => `sms-send:${userId}`;
