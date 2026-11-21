export const API_URL = {
  auth: {
    createAccount: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/service-auth/register`,
    login: () => `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/service-auth/login`,
    validate: () =>
      `${process.env.NEXT_PUBLIC_API_SERVER_URL}/service-auth/validate`,
    /** POST, под AuthGuard; инкрементирует версию сессии, вызывается перед signOut */
    logout: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/service-auth/logout`,
    twoFactor: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/service-auth/verify-otp`,
  },
  users: {
    profile: () => `${process.env.NEXT_PUBLIC_API_SERVER_URL}/user/profile`,
    email: () => `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/user/profile`,
    password: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/user/profile/password`,
    /** PUT {phone} -> {success: true}; номер для 2FA */
    phone: () => `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/user/profile/phone`,
    setTwoFactor: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/user/profile/2fa`,
  },
  sms: {
    sendSmsCode: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/sender/sms/send`,
  },
  billing: {
    userBilling: () => `${process.env.NEXT_PUBLIC_API_SERVER_URL}/billing/user`,
    paymentMethods: () =>
      `${process.env.NEXT_PUBLIC_API_SERVER_URL}/billing/payment-methods`,
    /** Список карт из браузера (SSR использует paymentMethods) */
    paymentMethodsClient: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/billing/payment-methods`,
    paymentMethodsById: (paymentMethodId: string) =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/billing/payment-methods/${encodeURIComponent(paymentMethodId)}`,
    products: () =>
      `${process.env.NEXT_PUBLIC_API_SERVER_URL}/billing/products`,
    /** POST, только ADMIN; из web не вызывается при рендере страниц */
    syncProducts: () =>
      `${process.env.NEXT_PUBLIC_API_SERVER_URL}/billing/products/sync`,
    subscriptionsUpgrade: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/billing/subscriptions/upgrade`,
    subscriptionsRenew: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/billing/subscriptions/renew`,
    /** POST {priceId, type} -> {clientSecret, amount, currency, productName}; по действию пользователя из браузера */
    checkout: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/billing/checkout`,
    paymentIntentCreate: (paymentIntentId: string) =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/billing/payment-intents/${encodeURIComponent(paymentIntentId)}`,
    createPortalSession: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/billing/create-portal-session`,
    invoices: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/billing/invoices`,
  },
  emails: {
    sendVerification: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/sender/emails/send-verification`,
    verifyEmail: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/sender/emails/verify-email`,
    /** GET ?token=...; для серверной страницы подтверждения (внутренний адрес api) */
    verifyEmailServer: (token: string) =>
      `${process.env.NEXT_PUBLIC_API_SERVER_URL}/sender/emails/verify-email?token=${encodeURIComponent(token)}`,
  },
  todos: {
    /** Список грузит браузер (client component), поэтому публичный URL */
    list: (sortBy: string, sortOrder: string) =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/todos?sortBy=${encodeURIComponent(sortBy)}&sortOrder=${encodeURIComponent(sortOrder)}`,
    create: () => `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/todos`,
    edit: (todoId: string) =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/todos/${encodeURIComponent(todoId)}`,
    delete: (todoId: string) =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/todos/${encodeURIComponent(todoId)}`,
    uploadImage: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/todos/upload-image`,
  },
};
