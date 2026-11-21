import { API_URL } from "@/api";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { ROUTE } from "@/constants";
import { Link, redirect } from "@/i18n/navigation";
import { getBillingProducts, getPaymentMethods } from "@/utils";
import type { CheckoutSummary } from "@/shared/types/billing";
import { CheckoutForm } from "@/widgets/checkout-form";
import { serverApiFetch } from "@/shared/lib/api-server";
import { getLocale, getTranslations } from "next-intl/server";

type CheckoutPageProps = {
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

/**
 * GET только показывает заказ. PaymentIntent и подписка создаются позже,
 * по нажатию «Оплатить» (POST из браузера), поэтому обновление страницы,
 * prefetch и ссылки ничего не создают.
 */
const getPurchaseSummary = async (
  priceId: string,
): Promise<CheckoutSummary | undefined> => {
  const products = await getBillingProducts();
  const product = [...products.recurring, ...products.oneTime].find(
    (p) => p.priceId === priceId,
  );

  if (!product || product.amount === null) return;

  return {
    amount: product.amount,
    currency: product.currency,
    productName: product.name,
  };
};

/** `type: "check"` только считает сумму апгрейда, клиентского секрета нет */
const getUpgradeSummary = async (
  priceId: string,
): Promise<CheckoutSummary | undefined> => {
  const res = await serverApiFetch(API_URL.billing.subscriptionsUpgrade(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "check", priceId }),
  });

  if (!res.ok) return;

  const data = await res.json();

  return {
    amount: data.amount,
    currency: data.currency,
    productName: data.productName,
  };
};

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const params = await searchParams;
  const { priceId, email, type, billingOperation } = params;
  const locale = await getLocale();

  // Гостю нечего оплачивать: ведём на вход и возвращаем на checkout после логина
  const session = await auth();
  if (!session) {
    const query = new URLSearchParams(
      Object.entries(params).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ).toString();
    const callbackUrl = `${ROUTE.CHECKOUT}${query ? `?${query}` : ""}`;

    redirect({
      href: `${ROUTE.LOGIN}?callbackUrl=${encodeURIComponent(callbackUrl)}`,
      locale,
    });
  }

  if (!priceId || !type || !billingOperation) {
    redirect({ href: ROUTE.PRICING, locale });
  }

  const operation = billingOperation === "purchase" ? "purchase" : "upgrade";

  const [paymentMethods, summary, t] = await Promise.all([
    getPaymentMethods(),
    operation === "purchase"
      ? getPurchaseSummary(priceId!)
      : getUpgradeSummary(priceId!),
    getTranslations(),
  ]);

  if (!summary) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-md space-y-4 text-center">
        <p role="alert" className="text-sm text-destructive">
          {t("checkout_load_failed")}
        </p>
        <Button asChild variant="outline">
          <Link href={ROUTE.PRICING}>{t("checkout_back_to_pricing")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <CheckoutForm
        userEmail={email}
        paymentMethods={paymentMethods}
        summary={summary}
        request={{ priceId: priceId!, type: type!, operation }}
      />
    </div>
  );
}
