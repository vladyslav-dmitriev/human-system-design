import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFormError } from "./auth-form-error";

type AuthFormInputProps = {
  type: string;
  name: string;
  label: string;
  autoComplete: string;
  testId?: string;
  error?: string | null;
  /** id общей ошибки формы, если она относится и к этому полю */
  formErrorId?: string;
  placeholder?: string;
  disabled?: boolean;
};

/** Поле с видимым label, aria-invalid и ошибкой, связанной через aria-describedby */
export const AuthFormInput = ({
  type,
  name,
  label,
  autoComplete,
  testId,
  error,
  formErrorId,
  placeholder,
  disabled,
}: AuthFormInputProps) => {
  const id = useId();
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : formErrorId;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        data-testid={testId}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!error || !!formErrorId}
        aria-describedby={describedBy}
        className="h-10 rounded-lg bg-secondary/20"
      />
      <AuthFormError id={errorId} error={error} />
    </div>
  );
};
