type AuthFormErrorProps = {
  error: string | null;
};

export const AuthFormError = ({ error }: AuthFormErrorProps) => {
  return <p className="text-red-500 text-sm text-center">{error}</p>;
};
