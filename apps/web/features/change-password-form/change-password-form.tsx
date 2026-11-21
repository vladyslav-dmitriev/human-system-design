"use client";

import React, { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Lock, Loader2, ArrowRight } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { apiErrorKey, getApiErrorCode } from "@/shared/lib/api-error";
import { newPasswordSchema, validateWith } from "@/shared/lib/auth-schemas";
import { FieldError } from "@/shared/ui/field-error";

interface PasswordFormInputs {
  currentPassword: string;
  newPassword: string;
}

export function ChangePasswordForm() {
  const [isLoading, setIsLoading] = useState(false);

  const t = useTranslations();
  const currentId = useId();
  const newId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    reset,
    setError,
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

      if (!response.ok) {
        const code = await getApiErrorCode(response);

        if (code === "USER_INVALID_PASSWORD") {
          setError("currentPassword", { message: apiErrorKey(code) });
        } else {
          toast.error(t("update_error_title"), {
            description: t(apiErrorKey(code)),
          });
        }
        return;
      }

      toast.success(t("password_changed_title"), {
        description: t("password_changed_description"),
        duration: 4000,
      });

      // Полностью очищаем форму
      reset({ currentPassword: "", newPassword: "" });
    } catch (error) {
      console.error(error);
      toast.error(t("update_error_title"), {
        description: t(apiErrorKey("INTERNAL")),
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

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-3 pb-6">
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            {/* Поле: Текущий пароль */}
            <div className="relative flex-1">
              <Label htmlFor={currentId} className="sr-only">
                {t("password_current_label")}
              </Label>
              <Input
                id={currentId}
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.currentPassword}
                aria-describedby={
                  errors.currentPassword ? `${currentId}-error` : undefined
                }
                {...register("currentPassword", {
                  required: "password_enter_current",
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
              <Label htmlFor={newId} className="sr-only">
                {t("password_new_label")}
              </Label>
              <Input
                id={newId}
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.newPassword}
                aria-describedby={
                  errors.newPassword ? `${newId}-error` : undefined
                }
                {...register("newPassword", {
                  validate: validateWith(newPasswordSchema),
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

          <div className="space-y-1 pt-1">
            <FieldError
              id={`${currentId}-error`}
              message={
                errors.currentPassword?.message &&
                t(errors.currentPassword.message)
              }
            />
            <FieldError
              id={`${newId}-error`}
              message={
                errors.newPassword?.message && t(errors.newPassword.message)
              }
            />
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
