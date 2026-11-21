// features/add-card-form/AddCardForm.tsx
"use client";

import { apiFetch } from "@/shared/lib/api-client";
import React, { useState } from "react";
import {
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from "@stripe/react-stripe-js";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StripeCardElementOptions } from "@stripe/stripe-js";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { API_URL } from "@/api";
import { apiErrorKey, getApiErrorCode } from "@/shared/lib/api-error";
interface AddCardFormProps {
  onSuccess: () => Promise<void>;
}

// Stripe Elements рисуются в iframe и токенов CSS не видят: цвета передаём по теме
const getElementOptions = (isDark: boolean): StripeCardElementOptions => ({
  style: {
    base: {
      fontSize: "14px",
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: isDark ? "#fafafa" : "#09090b",
      backgroundColor: "transparent",
      "::placeholder": {
        color: isDark ? "#a1a1aa" : "#52525b",
      },
    },
    invalid: {
      color: isDark ? "#f87171" : "#dc2626",
    },
  },
});

export const AddCardForm: React.FC<AddCardFormProps> = ({ onSuccess }) => {
  const { resolvedTheme } = useTheme();
  const ELEMENT_OPTIONS = getElementOptions(resolvedTheme === "dark");
  const stripe = useStripe();
  const elements = useElements();

  const t = useTranslations();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Защита: если Stripe еще не загрузился, ничего не делаем
    if (!stripe || !elements) return;

    setError(null);

    // Находим инпут номера карты (Stripe сам свяжет его со сроком и CVC внутри своего контекста)
    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) {
      // Кнопка не должна оставаться заблокированной: показываем ошибку и выходим
      setError(t("payment_new_error_not_ready"));
      return;
    }

    setIsProcessing(true);

    const { error: stripeError, paymentMethod } =
      await stripe.createPaymentMethod({
        type: "card",
        card: cardNumberElement,
      });

    if (stripeError) {
      setError(stripeError.message || t("payment_new_error_validation"));
      setIsProcessing(false);
      return;
    }

    try {
      const response = await apiFetch(
        API_URL.billing.paymentMethodsById(paymentMethod.id),
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!response.ok) {
        // Текст сервера не показываем: только перевод по коду ошибки
        const code = await getApiErrorCode(response);
        setError(t(apiErrorKey(code)));
        return;
      }

      onSuccess();
    } catch {
      setError(t("payment_new_error_submit"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl w-full">
      {/* Заголовок блока */}
      <div className="flex items-center gap-2 px-3.5 text-muted-foreground/80">
        <span className="text-xs font-medium tracking-wider uppercase">
          {t("payment_new_title")}
        </span>
        <div className="h-px flex-1 bg-muted/20" />
      </div>

      {/* Основной контейнер-подложка */}
      <div className="flex flex-col sm:flex-row items-end gap-4 p-3 bg-secondary/10 border border-muted/20 rounded-lg w-full">
        {/* 1. Номер карты */}
        <div className="w-full sm:flex-[2] space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide block px-0.5">
            {t("payment_new_card_number")}
          </label>
          {/* Фокус настраивается через `focus-within:...`. 
            border-muted/30 — цвет рамки по умолчанию.
            focus-within:border-foreground/40 — цвет при клике в этот инпут.
          */}
          <div className="h-9 px-3 border border-input rounded-md bg-background/50 flex items-center transition-colors duration-150 focus-within:border-foreground/40 focus-within:ring-1 focus-within:ring-foreground/5">
            <CardNumberElement options={ELEMENT_OPTIONS} className="w-full" />
          </div>
        </div>

        {/* 2. Срок действия */}
        <div className="w-full sm:flex-[1] space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide block px-0.5">
            {t("payment_new_expiry")}
          </label>
          <div className="h-9 px-3 border border-input rounded-md bg-background/50 flex items-center transition-colors duration-150 focus-within:border-foreground/40 focus-within:ring-1 focus-within:ring-foreground/5">
            <CardExpiryElement options={ELEMENT_OPTIONS} className="w-full" />
          </div>
        </div>

        {/* 3. CVC код */}
        <div className="w-15 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide block px-0.5">
            CVC
          </label>
          <div className="h-9 px-3 border border-input rounded-md bg-background/50 flex items-center transition-colors duration-150 focus-within:border-foreground/40 focus-within:ring-1 focus-within:ring-foreground/5">
            <CardCvcElement options={ELEMENT_OPTIONS} className="w-full" />
          </div>
        </div>

        {/* Кнопка отправки */}
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-full sm:w-auto h-9 px-4 rounded-lg font-medium text-xs transition-all duration-200 bg-secondary text-foreground border border-muted/40 hover:bg-foreground hover:text-background hover:border-foreground group shrink-0"
        >
          {isProcessing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <span className="flex items-center gap-1.5">
              {t("payment_new_attach_button")}
            </span>
          )}
        </Button>
      </div>

      {/* Ошибка под инпутами */}
      {error && (
        <p
          role="alert"
          className="text-xs text-destructive/90 pl-1 animate-in fade-in-50"
        >
          {error}
        </p>
      )}
    </form>
  );
};
