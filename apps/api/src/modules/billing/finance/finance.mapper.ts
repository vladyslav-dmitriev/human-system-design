export class FinanceMapper {
  static toResponse(user: any) {
    return {
      billing: {
        stripeCustomerId: user.userBillingProfile?.stripeCustomerId,
        defaultPaymentMethodId: user.userBillingProfile?.defaultPaymentMethodId,
        currency: user.userBillingProfile?.currency,
      },
      subscription: {
        stripeSubscriptionId: user.subscription?.stripeSubscriptionId,
        status: user.subscription?.status,
        autoRenew: user.subscription?.autoRenew,
        currentPeriodEnd: user.subscription?.currentPeriodEnd,
        stripePriceId: user.subscription?.stripePriceId,
      },
      features: (user.features ?? []).map((feature) => ({
        id: feature.id,
        expiresAt: feature.expiresAt,
        name: feature.product.name,
        isActive: feature.product.isActive,
      })),
    };
  }
}
