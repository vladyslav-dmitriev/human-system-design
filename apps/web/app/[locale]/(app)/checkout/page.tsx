import { API_URL } from "@/api";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { ROUTE } from "@/constants";
import { Link, redirect } from "@/i18n/navigation";
import { getPaymentMethods } from "@/utils";
import { CheckoutForm } from "@/widgets/checkout-form";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";

type CheckoutPageProps = {
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

const createProduct = async (priceId: string, type: string) => {
  const cookieStore = await cookies();
  const cookieString = cookieStore.toString();

  const res = await fetch(API_URL.billing.checkout(), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieString,
    },
    cache: "no-store",
    body: JSON.stringify({ priceId, type }),
  });

  if (!res.ok) return;

  const data = await res.json();

  return {
    clientSecret: data.clientSecret,
    amount: data.amount,
    currency: data.currency,
    productName: data.productName,
  };
};

const upgradeProduct = async (priceId: string) => {
  const cookieStore = await cookies();
  const cookieString = cookieStore.toString();

  const res = await fetch(API_URL.billing.subscriptionsUpgrade(), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieString,
    },
    cache: "no-store",
    body: JSON.stringify({ type: "subscription", priceId }),
  });

  if (!res.ok) return;

  const data = await res.json();

  return {
    clientSecret: data.clientSecret,
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

  const [paymentMethods, paymentData, t] = await Promise.all([
    getPaymentMethods(),
    billingOperation === "purchase"
      ? createProduct(priceId!, type!)
      : upgradeProduct(priceId!),
    getTranslations(),
  ]);

  if (!paymentData) {
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
        paymentData={paymentData}
      />
    </div>
  );
}
