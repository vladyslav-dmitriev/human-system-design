"use client";

import React, { useState } from "react";
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  PaymentRequestButtonElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { CreditCard, Mail, Plus, Loader2 } from "lucide-react";
import { ROUTE } from "@/constants";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getFormattedPrice } from "@/shared/lib/price";
import { Button } from "@/components/ui/button";

type CheckoutFormContentProps = {
  userEmail?: string;
  paymentMethods: any[];
  paymentData: any;
};

export function CheckoutFormContent({
  userEmail,
  paymentMethods,
  paymentData,
}: CheckoutFormContentProps) {
  const t = useTranslations();
  const [email, setEmail] = useState(userEmail || "");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentRequest, setPaymentRequest] = useState<any>(null); // Тип зависит от Stripe SDK

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

  const handleCardChange = (event: any, field: string) => {
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (paymentOption === "saved" && selectedCardId) {
        const result = await stripe!.confirmCardPayment(
          paymentData.clientSecret,
          {
            payment_method: selectedCardId,
            setup_future_usage: "off_session",
          },
        );
        handleResult(result);
      } else {
        const cardElement = elements!.getElement(CardNumberElement);
        const result = await stripe!.confirmCardPayment(
          paymentData.clientSecret,
          {
            payment_method: {
              card: cardElement!,
              billing_details: { email },
            },
            setup_future_usage: "off_session",
          },
        );
        handleResult(result);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setErrorMessage(t("checkout_payment_failed", { error: "Unknown error" }));
    }
  };

  const handleResult = (result: any) => {
    setLoading(false);
    if (result.error) {
      setErrorMessage(
        t("checkout_payment_failed", { error: result.error.message }),
      );
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
        <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {t("checkout_email_label")}
        </label>
        <div className="mt-1 flex items-center gap-2 h-10 w-full rounded-md border px-3 bg-background">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {t("checkout_payment_method_label")}
        </label>
        {paymentMethods.map((pm) => (
          <div
            key={pm.id}
            onClick={() => {
              setPaymentOption("saved");
              setSelectedCardId(pm.id);
            }}
            className={`h-10 mt-1 p-3 border rounded-lg flex items-center justify-between transition-all ${
              paymentOption === "saved" && selectedCardId === pm.id
                ? "border-primary/50 bg-primary/[0.03]"
                : "border-input"
            }`}
          >
            <span className="text-sm font-medium">
              •••• •••• •••• {pm.last4}
            </span>
          </div>
        ))}
        <div
          onClick={() => {
            setSelectedCardId("new");
            setPaymentOption("new");
          }}
          className={`h-10 p-3 border rounded-lg flex items-center gap-2 ${
            paymentOption === "new"
              ? "border-primary/50 bg-primary/[0.03]"
              : "border-input"
          }`}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">
            {t("checkout_add_new_card")}
          </span>
        </div>
      </div>

      {paymentOption === "new" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
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
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {t("checkout_expiry_label")}
              </label>
              <div className="p-3 border rounded-md">
                <CardExpiryElement
                  onChange={(e) => handleCardChange(e, "cardExpiry")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
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
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {t("checkout_payment_details_label")}
        </label>
        <div className="space-y-1">
          <div className="flex justify-between items-baseline text-sm text-foreground">
            <span className="text-muted-foreground">
              {t("checkout_plan_label")}
            </span>
            <span className="font-bold">{paymentData.productName}</span>
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
              {getFormattedPrice(paymentData.amount, paymentData.currency)}
            </div>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 text-sm rounded">
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        disabled={isDisabled}
        className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="animate-spin" />
        ) : (
          t("checkout_pay_button")
        )}
      </Button>

      {paymentRequest && (
        <PaymentRequestButtonElement options={{ paymentRequest }} />
      )}
    </form>
  );
}
