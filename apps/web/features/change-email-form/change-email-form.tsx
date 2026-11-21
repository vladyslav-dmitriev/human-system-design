"use client";

import React, { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Mail, Loader2, ArrowRight } from "lucide-react";
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
import { emailSchema, validateWith } from "@/shared/lib/auth-schemas";
import { FieldError } from "@/shared/ui/field-error";

interface EmailFormInputs {
  email: string;
  currentPassword: string;
}

interface EmailFormProps {
  currentEmail: string;
}

export function ChangeEmailForm({ currentEmail }: EmailFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const t = useTranslations();
  const emailId = useId();
  const passwordId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setError,
  } = useForm<EmailFormInputs>({
    defaultValues: {
      email: currentEmail,
      currentPassword: "",
    },
  });

  // Следим за значением, чтобы плавно подсвечивать интерфейс при изменениях
  const watchedEmail = watch("email");
  const hasChanges = isDirty && watchedEmail !== currentEmail;

  const onSubmit = async (data: EmailFormInputs) => {
    setIsLoading(true);

    const email = data.email.trim().toLowerCase();

    try {
      const response = await fetch(API_URL.users.email(), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          currentPassword: data.currentPassword,
        }),
      });

      if (!response.ok) {
        const code = await getApiErrorCode(response);

        if (code === "USER_INVALID_PASSWORD") {
          setError("currentPassword", { message: apiErrorKey(code) });
        } else if (code === "USER_EMAIL_TAKEN") {
          setError("email", { message: apiErrorKey(code) });
        } else {
          toast.error(t("update_error_title"), {
            description: t(apiErrorKey(code)),
          });
        }
        return;
      }

      // письмо подтверждения после смены не уходит само; сбой отправки не отменяет смену
      fetch(API_URL.emails.sendVerification(), {
        method: "POST",
        credentials: "include",
      }).catch((cause) => console.error(cause));

      // Элегантный Sonner тост вместо статичных блоков на пол-экрана
      toast.success(t("email_changed_title"), {
        description: t("email_changed_description", { email }),
        duration: 4000,
      });

      reset({ email, currentPassword: "" });
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
            <Mail className="h-3.5 w-3.5 text-muted-foreground/80 stroke-[1.5]" />
          </div>
          {t("email_title")}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground/80 leading-relaxed max-w-[90%]">
          {t("email_description")}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4 pb-6">
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            {/* Инпут контейнер */}
            <div className="relative flex-1 group">
              <Label htmlFor={emailId} className="sr-only">
                {t("email_label")}
              </Label>
              <Input
                id={emailId}
                data-testid="email-change-input"
                type="email"
                autoComplete="email"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? `${emailId}-error` : undefined}
                {...register("email", {
                  validate: validateWith(emailSchema),
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

            <div className="relative flex-1">
              <Label htmlFor={passwordId} className="sr-only">
                {t("password_current_label")}
              </Label>
              <Input
                id={passwordId}
                data-testid="email-change-password-input"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.currentPassword}
                aria-describedby={
                  errors.currentPassword ? `${passwordId}-error` : undefined
                }
                {...register("currentPassword", {
                  required: "password_enter_current",
                })}
                className={`text-[13px] h-9 bg-secondary/20 border px-3 rounded-lg transition-all duration-200 focus-visible:ring-0 ${
                  errors.currentPassword
                    ? "border-destructive/40 focus:border-destructive/80"
                    : "border-muted/60 focus:border-foreground/30"
                }`}
                placeholder={t("password_current_label")}
                disabled={isLoading}
              />
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

          <FieldError
            id={`${emailId}-error`}
            message={errors.email?.message && t(errors.email.message)}
          />
          <FieldError
            id={`${passwordId}-error`}
            message={
              errors.currentPassword?.message &&
              t(errors.currentPassword.message)
            }
          />
        </CardContent>
      </form>
    </Card>
  );
}
