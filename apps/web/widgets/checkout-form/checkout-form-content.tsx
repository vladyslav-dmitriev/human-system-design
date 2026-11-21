"use client";

import React, { useRef, useState } from "react";
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { CreditCard, Mail, Plus, Loader2 } from "lucide-react";
import { ROUTE } from "@/constants";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { getFormattedPrice } from "@/shared/lib/price";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";
import type { PaymentIntentResult } from "@stripe/stripe-js";
import { API_URL } from "@/api";
import { apiFetch } from "@/shared/lib/api-client";
import { apiErrorKey, getApiErrorCode } from "@/shared/lib/api-error";
import type {
  CheckoutPaymentData,
  CheckoutRequest,
  CheckoutSummary,
  PaymentMethod,
} from "@/shared/types/billing";

type CheckoutFormContentProps = {
  userEmail?: string;
  paymentMethods: PaymentMethod[];
  summary: CheckoutSummary;
  request: CheckoutRequest;
};

export function CheckoutFormContent({
  userEmail,
  paymentMethods,
  summary,
  request,
}: CheckoutFormContentProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [email, setEmail] = useState(userEmail || "");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isCardComplete, setIsCardComplete] = useState({
    cardNumber: false,
    cardExpiry: false,
    cardCvc: false,
  });

  const elements = useElements();
  const stripe = useStripe();
  const router = useRouter();

  const [paymentOption, setPaymentOption] = useState<"new" | "saved">("saved");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    paymentMethods?.[0]?.id || null,
  );

  const handleCardChange = (event: { complete: boolean }, field: string) => {
    setIsCardComplete((prev) => ({ ...prev, [field]: event.complete }));
  };

  const isNewCardValid =
    isCardComplete.cardNumber &&
    isCardComplete.cardExpiry &&
    isCardComplete.cardCvc;
  const isEmailValid = email.includes("@") && email.length > 5;
  const isDisabled =
    loading ||
    !isEmailValid ||
    (paymentOption === "saved" ? !selectedCardId : !isNewCardValid);

  // PaymentIntent создаётся по нажатию кнопки; повторная попытка после
  // отказа карты использует тот же intent, а не создаёт новый
  const clientSecretRef = useRef<string | null>(null);

  /** POST создаёт PaymentIntent/подписку; null и errorMessage при ошибке */
  const getClientSecret = async () => {
    if (clientSecretRef.current) return clientSecretRef.current;

    const url =
      request.operation === "purchase"
        ? API_URL.billing.checkout()
        : API_URL.billing.subscriptionsUpgrade();
    const body =
      request.operation === "purchase"
        ? { priceId: request.priceId, type: request.type }
        : { priceId: request.priceId, type: "subscription" };

    const response = await apiFetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      setErrorMessage(t(apiErrorKey(await getApiErrorCode(response))));
      return null;
    }

    const data: Partial<CheckoutPaymentData> = await response
      .json()
      .catch(() => ({}));

    if (!data.clientSecret) {
      setErrorMessage(t("checkout_load_failed"));
      return null;
    }

    clientSecretRef.current = data.clientSecret;
    return data.clientSecret;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const clientSecret = await getClientSecret();
      if (!clientSecret) {
        setLoading(false);
        return;
      }

      if (paymentOption === "saved" && selectedCardId) {
        const result = await stripe!.confirmCardPayment(clientSecret, {
          payment_method: selectedCardId,
          setup_future_usage: "off_session",
        });
        handleResult(result);
      } else {
        const cardElement = elements!.getElement(CardNumberElement);
        const result = await stripe!.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement!,
            billing_details: { email },
          },
          setup_future_usage: "off_session",
        });
        handleResult(result);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setErrorMessage(t("checkout_payment_failed", { error: "Unknown error" }));
    }
  };

  const handleResult = (result: PaymentIntentResult) => {
    setLoading(false);
    if (result.error) {
      setErrorMessage(
        t("checkout_payment_failed", { error: result.error.message ?? "" }),
      );
      return;
    }

    if (result.paymentIntent.status === "succeeded") {
      router.push(
        `${ROUTE.THANK_YOU_PAYMENT}?payment_intent_id=${result.paymentIntent.id}`,
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto p-6 bg-background border border-border rounded-xl shadow-sm space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 text-primary rounded-lg">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{t("checkout_title")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("checkout_subtitle")}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="checkout-email"
          className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
        >
          {t("checkout_email_label")}
        </label>
        <div className="mt-1 flex items-center gap-2 h-10 w-full rounded-md border px-3 bg-background">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <input
            id="checkout-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            required
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {t("checkout_payment_method_label")}
        </legend>
        {paymentMethods.map((pm) => {
          const checked = paymentOption === "saved" && selectedCardId === pm.id;
          return (
            <label
              key={pm.id}
              className={cn(
                "mt-1 flex min-h-10 cursor-pointer items-center justify-between rounded-lg border p-3 transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                checked
                  ? "border-primary/50 bg-primary/[0.03]"
                  : "border-input",
              )}
            >
              <input
                type="radio"
                name="payment-method"
                value={pm.id}
                checked={checked}
                onChange={() => {
                  setPaymentOption("saved");
                  setSelectedCardId(pm.id);
                }}
                className="sr-only"
              />
              <span className="text-sm font-medium">
                •••• •••• •••• {pm.last4}
              </span>
            </label>
          );
        })}
        <label
          className={cn(
            "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
            paymentOption === "new"
              ? "border-primary/50 bg-primary/[0.03]"
              : "border-input",
          )}
        >
          <input
            type="radio"
            name="payment-method"
            value="new"
            checked={paymentOption === "new"}
            onChange={() => {
              setSelectedCardId("new");
              setPaymentOption("new");
            }}
            className="sr-only"
          />
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-medium">
            {t("checkout_add_new_card")}
          </span>
        </label>
      </fieldset>

      {paymentOption === "new" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("checkout_card_number_label")}
            </label>
            <div className="p-3 border rounded-md">
              <CardNumberElement
                onChange={(e) => handleCardChange(e, "cardNumber")}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {t("checkout_expiry_label")}
              </label>
              <div className="p-3 border rounded-md">
                <CardExpiryElement
                  onChange={(e) => handleCardChange(e, "cardExpiry")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {t("checkout_cvc_label")}
              </label>
              <div className="p-3 border rounded-md">
                <CardCvcElement
                  onChange={(e) => handleCardChange(e, "cardCvc")}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="my-8">
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {t("checkout_payment_details_label")}
        </label>
        <div className="space-y-1">
          <div className="flex justify-between items-baseline text-sm text-foreground">
            <span className="text-muted-foreground">
              {t("checkout_plan_label")}
            </span>
            <span className="font-bold">{summary.productName}</span>
          </div>
          <div className="flex justify-between items-baseline text-sm text-foreground">
            <div className="text-muted-foreground">
              {t("checkout_duration_label")}
            </div>
            <div>{t("checkout_duration_value")}</div>
          </div>
          <div className="flex justify-between items-baseline text-sm text-foreground">
            <div className="text-muted-foreground">
              {t("checkout_monthly_price_label")}
            </div>
            <div className="font-bold">
              {getFormattedPrice(summary.amount, summary.currency, locale)}
            </div>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div
          className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        disabled={isDisabled}
        aria-busy={loading}
        className="w-full h-10 text-sm font-medium"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            <span className="sr-only">{t("loading")}</span>
          </>
        ) : (
          t("checkout_pay_button")
        )}
      </Button>
    </form>
  );
}
