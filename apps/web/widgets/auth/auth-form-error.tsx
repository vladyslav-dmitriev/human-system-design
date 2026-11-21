type AuthFormErrorProps = {
  id: string;
  error: string | null | undefined;
  className?: string;
};

/** Ошибка формы или поля: озвучивается скринридером, текст от 12px */
export const AuthFormError = ({ id, error, className }: AuthFormErrorProps) => {
  if (!error) return null;

  return (
    <p
      id={id}
      role="alert"
      className={`text-xs text-destructive font-medium ${className ?? ""}`}
    >
      {error}
    </p>
  );
};
