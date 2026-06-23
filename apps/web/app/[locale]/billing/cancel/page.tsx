"use client";

import React from "react";
import Link from "next/link";
import { X, ArrowRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTE } from "@/constants";

export default function BillingCanceledPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 antialiased selection:bg-muted">
      {/* Контейнер карточки: идентичен success-странице по структуре, но с нейтральными акцентами */}
      <Card className="max-w-md w-full border border-border/40 shadow-xl shadow-foreground/[0.02] bg-card/60 backdrop-blur-xl relative overflow-hidden rounded-xl">
        <CardHeader className="text-center pt-10 pb-4">
          {/* Нейтральный круг с иконкой отмены (мягкий серый/muted оттенок вместо кричащего красного) */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4 shadow-sm animate-in zoom-in-50 duration-500">
            <X className="h-5 w-5 stroke-[2.5]" />
          </div>

          <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
            Оплата отменена
          </CardTitle>

          <p className="text-muted-foreground text-[13px] mt-1.5 max-w-[280px] mx-auto leading-relaxed">
            Процесс оформления подписки был прерван. Никакие средства не были
            списаны с вашей карты.
          </p>
        </CardHeader>

        <CardContent className="px-6 py-3 space-y-4">
          {/* Информационный блок с подсказками, почему это могло произойти */}
          <div className="rounded-lg border border-border/30 bg-muted/20 p-4 space-y-3 text-[13px]">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-4 w-4 text-muted-foreground/80 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-foreground">
                  Возникли проблемы с оплатой?
                </p>
                <p className="text-xs text-muted-foreground">
                  Если Stripe отклонил карту, проверьте лимиты на
                  интернет-покупки или обратитесь в поддержку.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[11px] text-muted-foreground/80 leading-normal max-w-[280px] mx-auto">
              Ваш текущий тариф остается в силе. Вы по-прежнему имеете доступ ко
              всем вашим текущим данным.
            </p>
          </div>
        </CardContent>

        <div className="h-[1px] bg-gradient-to-r from-transparent via-border/40 to-transparent w-full my-1" />

        <CardFooter className="pb-8 pt-4 px-6 flex flex-col gap-2">
          <Button className="w-full bg-foreground text-background hover:bg-foreground/90 font-medium text-[13px] h-9 shadow-sm group rounded-md">
            <Link
              href={ROUTE.PRICING}
              className="flex items-center justify-center gap-1.5"
            >
              <span>Перейти к тарифам</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground text-[13px] h-9 rounded-md transition-colors"
          >
            <Link href="/dashboard/todos">Продолжить работу в TaskFlow</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
