import { AlertCircle } from "lucide-react";

type FieldErrorProps = {
  id: string;
  message?: string;
};

/** Ошибка поля: иконка + текст (не только цвет), озвучивается через role="alert" */
export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;

  return (
    <p
      id={id}
      role="alert"
      className="flex items-center gap-1.5 pl-1 text-xs font-medium text-destructive"
    >
      <AlertCircle className="h-3 w-3 shrink-0 stroke-[2]" aria-hidden />
      <span>{message}</span>
    </p>
  );
}
