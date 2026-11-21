/** Номер, введённый при включении 2FA, до подтверждения кодом. Хранится в Redis, TTL 10 минут. */
export const PENDING_PHONE_TTL_SECONDS = 600;

export const pendingPhoneKey = (userId: string) => `pending-phone:${userId}`;

/** Лимит отправки SMS на пользователя: не больше 5 за час. */
export const SMS_SEND_LIMIT = 5;
export const SMS_SEND_WINDOW_SECONDS = 3600;

export const smsSendCounterKey = (userId: string) => `sms-send:${userId}`;

/** Лимит на номер назначения: 5 в час (защита от SMS-бомбинга чужого номера с разных аккаунтов). */
export const SMS_PHONE_LIMIT = 5;

export const smsPhoneCounterKey = (phoneHash: string) =>
  `sms-send-phone:${phoneHash}`;

/** Глобальный суточный потолок отправок (расходы Twilio): `SMS_DAILY_LIMIT`, по умолчанию 1000. */
export const SMS_DAILY_LIMIT_DEFAULT = 1000;
export const SMS_DAILY_WINDOW_SECONDS = 24 * 3600;

export const smsDailyCounterKey = (day: string) => `sms-send-daily:${day}`;
