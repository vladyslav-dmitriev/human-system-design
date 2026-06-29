export const API_URL = {
  auth: {
    createAccount: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/service-auth/register`,
    login: () => `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/service-auth/login`,
    validate: () =>
      `${process.env.NEXT_PUBLIC_API_SERVER_URL}/service-auth/validate`,
    twoFactor: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/service-auth/verify-otp`,
  },
  users: {
    profile: () => `${process.env.NEXT_PUBLIC_API_SERVER_URL}/user/profile`,
    password: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/user/profile/password`,
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
    paymentMethodsById: (paymentMethodId: string) =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/billing/payment-methods/${paymentMethodId}`,
    products: () =>
      `${process.env.NEXT_PUBLIC_API_SERVER_URL}/billing/products`,
    syncProducts: () =>
      `${process.env.NEXT_PUBLIC_API_SERVER_URL}/billing/products/sync`,
    subscriptionsUpgrade: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/billing/subscriptions/upgrade`,
    subscriptionsRenew: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/billing/subscriptions/renew`,
    checkout: () =>
      `${process.env.NEXT_PUBLIC_API_SERVER_URL}/billing/checkout`,
    paymentIntentCreate: (paymentIntentId: string) =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/billing/payment-intents/${paymentIntentId}`,
    createPortalSession: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/billing/create-portal-session`,
    invoices: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/billing/invoices`,
  },
  emails: {
    sendVerification: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/emails/send-verification`,
    verifyEmail: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/emails/verify-email`,
  },
  todos: {
    list: (sortBy: string, sortOrder: string) =>
      `${process.env.NEXT_PUBLIC_API_SERVER_URL}/todos?sortBy=${sortBy}&sortOrder=${sortOrder}`,
    create: () => `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/todos`,
    edit: (todoId: string) =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/todos/${todoId}`,
    delete: (todoId: string) =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/todos/${todoId}`,
    uploadImage: () =>
      `${process.env.NEXT_PUBLIC_API_CLIENT_URL}/todos/upload-image`,
  },
};
