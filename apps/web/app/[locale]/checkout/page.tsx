import { API_URL } from "@/api";
import { ROUTE } from "@/constants";
import { getPaymentMethods } from "@/utils";
import { CheckoutForm } from "@/widgets/checkout-form";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

  const data = await res.json();

  if (!res.ok) return;

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
    body: JSON.stringify({ type: "payment", priceId }),
  });

  const data = await res.json();

  if (!res.ok) return;

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
  const { priceId, email, type, billingOperation } = await searchParams;

  if (!priceId || !type || !billingOperation) {
    return null;
    // redirect(ROUTE.HOME);
  }

  const [paymentMethods, paymentData] = await Promise.all([
    getPaymentMethods(),
    billingOperation === "purchase"
      ? createProduct(priceId, type)
      : upgradeProduct(priceId),
  ]);

  if (!paymentData) {
    return null;
    // redirect(ROUTE.HOME);
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
