import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type AuthFormButtonProps = {
  buttonText: string;
  /** Идёт отправка: кнопка блокируется, чтобы не отправить форму дважды */
  isLoading?: boolean;
  /** Подпись для скринридера, пока идёт загрузка (визуально остаётся buttonText) */
  loadingText?: string;
};

export const AuthFormButton = ({
  buttonText,
  isLoading = false,
  loadingText,
}: AuthFormButtonProps) => {
  return (
    <Button
      type="submit"
      disabled={isLoading}
      aria-busy={isLoading}
      className="w-full h-10"
    >
      {isLoading && <Loader2 className="animate-spin" aria-hidden="true" />}
      {buttonText}
      {isLoading && loadingText && (
        <span className="sr-only">{loadingText}</span>
      )}
    </Button>
  );
};
