"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Lock, Loader2, AlertCircle, ArrowRight } from "lucide-react";
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

interface PasswordFormInputs {
  currentPassword: string;
  newPassword: string;
}

export function ChangePasswordForm() {
  const [isLoading, setIsLoading] = useState(false);

  const t = useTranslations();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    reset,
  } = useForm<PasswordFormInputs>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  });

  // Следим за изменениями полей, чтобы активировать кнопку
  const watchCurrent = watch("currentPassword");
  const watchNew = watch("newPassword");
  const hasChanges =
    isDirty && watchCurrent && watchNew && watchCurrent !== watchNew;

  const onSubmit = async (data: PasswordFormInputs) => {
    setIsLoading(true);

    try {
      const response = await fetch(API_URL.users.password(), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Не удалось обновить пароль");
      }

      toast.success("Пароль успешно изменен", {
        description: "Используйте новый пароль при следующем входе.",
        duration: 4000,
      });

      // Полностью очищаем форму
      reset({ currentPassword: "", newPassword: "" });
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
            <Lock className="h-3.5 w-3.5 text-muted-foreground/80 stroke-[1.5]" />
          </div>
          {t("password_title")}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground/80 leading-relaxed max-w-[90%]">
          {t("password_description")}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-3 pb-6">
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            {/* Поле: Текущий пароль */}
            <div className="relative flex-1">
              <Input
                type="password"
                {...register("currentPassword", {
                  required: t("password_enter_current"),
                })}
                className={`text-[13px] h-9 bg-secondary/20 border px-3 rounded-lg transition-all duration-200 focus-visible:ring-0 ${
                  errors.currentPassword
                    ? "border-destructive/40 bg-destructive/[0.01] focus:border-destructive/80"
                    : "border-muted/60 focus:border-foreground/30"
                }`}
                placeholder={t("password_current_label")}
                disabled={isLoading}
              />
            </div>

            {/* Поле: Новый пароль */}
            <div className="relative flex-1">
              <Input
                type="password"
                {...register("newPassword", {
                  required: t("password_enter_new"),
                  minLength: {
                    value: 8,
                    message: t("password_min_length"),
                  },
                })}
                className={`text-[13px] h-9 bg-secondary/20 border px-3 rounded-lg transition-all duration-200 focus-visible:ring-0 ${
                  errors.newPassword
                    ? "border-destructive/40 bg-destructive/[0.01] focus:border-destructive/80"
                    : hasChanges
                      ? "border-primary/40 focus:border-primary"
                      : "border-muted/60 focus:border-foreground/30"
                }`}
                placeholder={t("password_new_label")}
                disabled={isLoading}
              />
            </div>

            {/* Компактная кнопка в одну линию */}
            <Button
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
                <span className="flex items-center gap-1 whitespace-nowrap">
                  {t("email_update_button")}
                  <ArrowRight
                    className={`h-3 w-3 transition-transform duration-200 ${hasChanges ? "translate-x-0.5" : ""}`}
                  />
                </span>
              )}
            </Button>
          </div>

          {/* Валидационные ошибки под инпутами */}
          {(errors.currentPassword || errors.newPassword) && (
            <div className="space-y-1 pt-1">
              {errors.currentPassword && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-destructive/90 pl-1 animate-[slide-down_0.15s_ease-out]">
                  <AlertCircle className="h-3 w-3 stroke-[2]" />
                  <span>{errors.currentPassword.message}</span>
                </div>
              )}
              {errors.newPassword && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-destructive/90 pl-1 animate-[slide-down_0.15s_ease-out]">
                  <AlertCircle className="h-3 w-3 stroke-[2]" />
                  <span>{errors.newPassword.message}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </form>
    </Card>
  );
}
