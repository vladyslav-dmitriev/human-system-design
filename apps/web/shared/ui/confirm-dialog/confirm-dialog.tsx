"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description: string;
  /** Подпись кнопки подтверждения; по умолчанию «Подтвердить» */
  confirmLabel?: string;
  /** Необратимое действие: кнопка подтверждения красная */
  destructive?: boolean;
  isLoading?: boolean;
  onConfirm(): void | Promise<void>;
};

/**
 * Диалог подтверждения вместо window.confirm.
 * В UI-ките нет AlertDialog (нет @radix-ui/react-alert-dialog), поэтому
 * собран на Radix Dialog с role="alertdialog": фокус в диалоге, Esc закрывает.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  isLoading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const t = useTranslations();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          role="alertdialog"
          className="fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-background p-6 shadow-lg"
        >
          <div className="space-y-2">
            <DialogPrimitive.Title className="text-lg font-semibold">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
              {description}
            </DialogPrimitive.Description>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="outline" disabled={isLoading}>
                {t("dialog_cancel")}
              </Button>
            </DialogPrimitive.Close>
            <Button
              type="button"
              variant={destructive ? "destructive" : "default"}
              disabled={isLoading}
              onClick={() => void onConfirm()}
            >
              {isLoading && <Loader2 className="animate-spin" />}
              {confirmLabel ?? t("dialog_confirm")}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
