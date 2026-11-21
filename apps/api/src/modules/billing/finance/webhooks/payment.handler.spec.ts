import { PaymentHandler } from './payment.handler';

describe('PaymentHandler', () => {
  const handler = new PaymentHandler();
  const event = { id: 'evt_1', type: 'invoice.paid', data: { object: {} } };

  // BUG: см. FIX.md «Вебхуки Stripe ничего не делают»
  it.todo(
    'handleSubscriptionPurchase / handleOneTimePurchase actually process the event',
  );

  it('handlers resolve without throwing (current stub behaviour)', async () => {
    await expect(
      handler.handleSubscriptionPurchase(event as never),
    ).resolves.toBeUndefined();
    await expect(
      handler.handleSubscriptionUpgrade(event as never),
    ).resolves.toBeUndefined();
    await expect(
      handler.handleOneTimePurchase(event as never),
    ).resolves.toBeUndefined();
  });
});
