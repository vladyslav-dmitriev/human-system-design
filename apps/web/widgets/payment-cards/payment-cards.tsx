"use client";

import { useState } from "react";
import { CreditCard, Loader2, Trash2, ShieldCheck, Plus } from "lucide-react";
import { Elements } from "@stripe/react-stripe-js";
import { AddCardForm } from "@/features/add-card-form";
import { stripePromise } from "@/shared/lib/stripe";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { PaymentMethod } from "@/shared/types/billing";
import { API_URL } from "@/api";
import { getPaymentMethods } from "@/utils";

type PaymentCardsProps = {
  autoRenew: boolean;
  paymentMethods: PaymentMethod[];
};

export const PaymentCards = ({
  autoRenew,
  paymentMethods,
}: PaymentCardsProps) => {
  const [cards, setCards] = useState<PaymentMethod[]>(paymentMethods);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const t = useTranslations();

  const handleDeleteCard = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту карту?")) return;

    setDeletingId(id);

    try {
      const res = await fetch(API_URL.billing.paymentMethodsById(id), {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        setCards((prev) => prev.filter((card) => card.id !== id));
        toast.success("Карта успешно удалена");
      } else {
        toast.error("Не удалось удалить карту");
      }
    } catch (error) {
      console.error(error);
      toast.error("Ошибка при удалении карты");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="border border-muted/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-background/60 backdrop-blur-md rounded-xl overflow-hidden transition-all duration-300">
      <CardHeader className="space-y-1.5 pb-5">
        <CardTitle className="text-md font-semibold tracking-tight text-foreground/90 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-secondary/50 rounded-md border border-muted/40">
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground/80 stroke-[1.5]" />
            </div>
            {t("payment_methods_title")}
          </div>

          {/* Кнопка "Добавить" сверху в шапке, чтобы не загромождать интерфейс */}
          {!showAddForm && (
            <Button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="h-9 px-4 rounded-md font-medium text-[13px] bg-secondary text-foreground border border-muted/40 hover:bg-foreground hover:text-background hover:border-foreground transition-all duration-200"
            >
              <span className="flex items-center gap-1">
                <Plus className="h-3 w-3 opacity-80" />{" "}
                {t("payment_methods_add_button")}
              </span>
            </Button>
          )}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground/80 leading-relaxed max-w-[80%] pl-1">
          {t("payment_methods_description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/60" />
          </div>
        ) : cards.length === 0 ? (
          <div className="p-3 border border-dashed border-muted/40 rounded-lg text-center text-[11px] text-muted-foreground/70">
            {t("payment_methods_empty")}
          </div>
        ) : (
          <div className="space-y-2.5">
            {cards.map((card) => (
              <div
                key={card.id}
                className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-secondary/10 border border-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-2.5 self-start sm:self-center">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-foreground/80 leading-none capitalize flex items-center gap-2">
                      {card.brand} •••• {card.last4}
                      {card.isDefault && (
                        <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-1 rounded flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="h-2.5 w-2.5 stroke-[2.5]" />
                          {t("payment_methods_card_primary")}
                        </span>
                      )}
                    </span>
                    <span className="text-[13px] text-muted-foreground/70 mt-1">
                      {t("payment_methods_card_expiry", {
                        date: `${card.expMonth?.toString().padStart(2, "0")}/${card.expYear}`,
                      })}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  disabled={
                    deletingId !== null || (cards.length === 1 && autoRenew)
                  }
                  onClick={() => handleDeleteCard(card.id)}
                  className="h-8 w-8 rounded-lg bg-secondary text-foreground border border-muted/40 hover:bg-destructive hover:text-white hover:border-destructive flex items-center justify-center transition-all duration-200 disabled:opacity-40 group/btn shrink-0"
                  title={t("payment_methods_card_delete")}
                >
                  {deletingId === card.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 opacity-70 transition-all duration-200 group-hover/btn:scale-105 group-hover/btn:opacity-100 group-hover/btn:text-white" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {showAddForm && (
          <div className="pt-2 border-t border-muted/30 animate-in fade-in-50 duration-200">
            <Elements stripe={stripePromise}>
              <AddCardForm
                stripe={stripePromise}
                onSuccess={async () => {
                  // setIsLoading(true);

                  // const data = await getPaymentMethods();
                  // setCards(data);

                  // setIsLoading(false);
                  setShowAddForm(false);
                  toast.success(t("payment_methods_message_attached"));
                }}
              />
            </Elements>

            <div className="flex justify-end mt-2">
              <Button
                type="button"
                variant="link"
                onClick={() => setShowAddForm(false)}
                className="text-[11px] text-muted-foreground/70 hover:text-foreground transition-colors mr-1"
              >
                {t("payment_methods_cancel")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
