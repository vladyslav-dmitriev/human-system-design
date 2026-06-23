"use client";

import React, { useEffect, useState } from "react";
import { FileText, Download, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { getFormattedPrice } from "@/shared/lib/price";
import { API_URL } from "@/api";

interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: "paid" | "open" | "uncollectible" | "void";
  createdAt: string;
  pdfUrl: string | null;
}

export function BillingInvoicesHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const t = useTranslations();

  useEffect(() => {
    async function loadInvoices() {
      try {
        const response = await fetch(API_URL.billing.invoices(), {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setInvoices(data);
        }
      } catch (error) {
        console.error("Не удалось загрузить инвойсы", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadInvoices();
  }, []);

  if (isLoading) {
    return (
      <Card className="max-w-xl border border-muted/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-background/60 backdrop-blur-md rounded-xl overflow-hidden">
        <div className="p-6 space-y-3 animate-pulse">
          <div className="h-4 w-32 bg-muted/40 rounded" />
          <div className="h-3 w-48 bg-muted/20 rounded" />
          <div className="h-12 bg-muted/10 rounded-lg mt-4" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-muted/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-background/60 backdrop-blur-md rounded-xl overflow-hidden transition-all duration-300">
      <CardHeader className="space-y-1.5 pb-4">
        <CardTitle className="text-md font-semibold tracking-tight text-foreground/90 flex items-center gap-2">
          <div className="p-1.5 bg-secondary/50 rounded-md border border-muted/40">
            <FileText className="h-3.5 w-3.5 text-muted-foreground/80 stroke-[1.5]" />
          </div>
          {t("payment_history_title")}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground/80 leading-relaxed pl-1">
          {t("payment_history_description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-2 max-h-[400px] overflow-y-auto">
        {invoices.length === 0 ? (
          <div className="text-xs text-muted-foreground/60 py-6 border border-dashed border-muted/40 rounded-lg text-center mb-4 bg-background/30">
            {t("payment_history_empty")}
          </div>
        ) : (
          <div className="border border-muted/30 rounded-lg bg-background/30 overflow-hidden mb-4 divide-y divide-muted/30">
            {invoices.map((invoice) => {
              const dateFormatted = new Date(
                invoice.createdAt,
              ).toLocaleDateString("ru-RU", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
              const currencySign = invoice.currency === "USD" ? "$" : "₴";
              const isPaid = invoice.status === "paid";

              return (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3.5 gap-4 hover:bg-secondary/10 transition-colors group"
                >
                  {/* Левая часть: Номер инвойса и дата */}
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold tracking-tight text-foreground/90">
                        {invoice.number || "Разовый платеж"}
                      </span>

                      {/* Ультра-минималистичный статус */}
                      <span
                        className={`text-[10px] font-bold tracking-wider uppercase px-1.5 py-1 rounded flex items-center gap-1 ${
                          isPaid
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {isPaid ? (
                          <CheckCircle2 className="h-2.5 w-2.5 stroke-[2.5]" />
                        ) : (
                          <AlertCircle className="h-2.5 w-2.5 stroke-[2.5]" />
                        )}
                        {isPaid
                          ? t("payment_history_status_paid")
                          : t("payment_history_status_pending")}
                      </span>
                    </div>

                    <p className="text-[13px] text-muted-foreground/80">
                      {dateFormatted}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-sm font-bold text-foreground/90 tracking-tight">
                      {getFormattedPrice(invoice.amount, invoice.currency)}
                    </div>

                    {invoice.pdfUrl && (
                      <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 w-8 rounded-lg bg-secondary text-foreground border border-muted/40 hover:bg-foreground hover:text-background hover:border-foreground flex items-center justify-center transition-all duration-200 group/btn"
                        title={t("payment_history_open_pdf")}
                      >
                        <Download className="h-3.5 w-3.5 opacity-70 transition-all duration-200 group-hover/btn:scale-105 group-hover/btn:opacity-100 group-hover/btn:text-background" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
