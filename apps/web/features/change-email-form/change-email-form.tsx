"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Mail, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { API_URL } from "@/api";

interface EmailFormInputs {
  email: string;
}

interface EmailFormProps {
  currentEmail: string;
}

export function ChangeEmailForm({ currentEmail }: EmailFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const t = useTranslations();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm<EmailFormInputs>({
    defaultValues: {
      email: currentEmail,
    },
  });

  // Следим за значением, чтобы плавно подсвечивать интерфейс при изменениях
  const watchedEmail = watch("email");
  const hasChanges = isDirty && watchedEmail !== currentEmail;

  const onSubmit = async (data: EmailFormInputs) => {
    setIsLoading(true);

    try {
      const response = await fetch(API_URL.users.email(), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Не удалось обновить email");
      }

      // Элегантный Sonner тост вместо статичных блоков на пол-экрана
      toast.success("Email успешно изменен", {
        description: `Новый адрес: ${data.email.toLowerCase()}`,
        duration: 4000,
      });

      reset({ email: data.email });
    } catch (error: any) {
      toast.error("Ошибка обновления", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border border-muted/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-background/60 backdrop-blur-md rounded-xl overflow-hidden transition-all duration-300">
      <CardHeader className="space-y-1.5 pb-5">
        <CardTitle className="text-md font-semibold tracking-tight text-foreground/90 flex items-center gap-2">
          <div className="p-1.5 bg-secondary/50 rounded-md border border-muted/40">
            <Mail className="h-3.5 w-3.5 text-muted-foreground/80 stroke-[1.5]" />
          </div>
          {t("email_title")}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground/80 leading-relaxed max-w-[90%]">
          {t("email_description")}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 pb-6">
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            {/* Инпут контейнер */}
            <div className="relative flex-1 group">
              <Input
                data-testid="email-change-input"
                type="text"
                {...register("email", {
                  required: t("email_error_empty"),
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: t("email_error_invalid"),
                  },
                })}
                className={`text-[13px] h-9 bg-secondary/20 border px-3 rounded-lg transition-all duration-200 focus-visible:ring-0 ${
                  errors.email
                    ? "border-destructive/40 bg-destructive/[0.01] focus:border-destructive/80"
                    : hasChanges
                      ? "border-primary/40 focus:border-primary"
                      : "border-muted/60 focus:border-foreground/30"
                }`}
                placeholder="name@domain.com"
                disabled={isLoading}
              />

              {/* Мягкий индикатор изменений справа внутри инпута */}
              {hasChanges && !errors.email && (
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none animate-fade-in">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                </div>
              )}
            </div>

            {/* Компактная кнопка в одну линию */}
            <Button
              data-testid="email-change-button"
              type="submit"
              disabled={isLoading || !hasChanges}
              className={`h-9 px-4 rounded-lg font-medium text-xs transition-all duration-200 ${
                hasChanges
                  ? "bg-foreground text-background hover:bg-foreground/90 shadow-sm translate-x-0"
                  : "bg-secondary text-muted-foreground/60 border border-muted/20 opacity-80 cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <span className="flex items-center gap-1">
                  {t("email_update_button")}
                  <ArrowRight
                    className={`h-3 w-3 transition-transform duration-200 ${hasChanges ? "translate-x-0.5" : ""}`}
                  />
                </span>
              )}
            </Button>
          </div>

          {/* Анимация плавного появления текста ошибки валидации */}
          {errors.email && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-destructive/90 pl-1 animate-[slide-down_0.15s_ease-out]">
              <AlertCircle className="h-3 w-3 stroke-[2]" />
              <span>{errors.email.message}</span>
            </div>
          )}
        </CardContent>
      </form>
    </Card>
  );
}
