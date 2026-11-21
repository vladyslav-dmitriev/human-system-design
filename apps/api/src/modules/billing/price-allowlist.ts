import { BadRequestException } from '@nestjs/common';

import { ErrorCode } from '../../common/errors';
import type { PaymentsService, StripeTypes } from './payments';

export type PriceKind = 'recurring' | 'one_time';

const invalidPrice = () =>
  new BadRequestException({
    code: ErrorCode.VALIDATION_FAILED,
    message: 'Unknown or unavailable price',
  });

/**
 * Проверяет priceId от клиента: он должен быть в таблице Product (isActive),
 * активен в Stripe и иметь нужный тип. Возвращает цену с expand: ['product'].
 */
export async function resolveAllowedPrice(
  repository: { isPriceAllowed(stripePriceId: string): Promise<boolean> },
  paymentsService: Pick<PaymentsService, 'getPrice'>,
  priceId: string,
  kind: PriceKind,
) {
  if (!(await repository.isPriceAllowed(priceId))) {
    throw invalidPrice();
  }

  let price: Awaited<ReturnType<PaymentsService['getPrice']>>;

  try {
    price = await paymentsService.getPrice(priceId);
  } catch {
    throw invalidPrice();
  }

  if (!price.active || price.type !== kind || price.unit_amount == null) {
    throw invalidPrice();
  }

  return {
    price,
    // getPrice запрашивает price с expand: ['product']
    product: price.product as StripeTypes.Product,
  };
}
