type AuthFormProps = {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
};

export const AuthForm = ({ onSubmit, children }: AuthFormProps) => {
  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md bg-white p-8 rounded shadow-md space-y-4"
    >
      {children}
    </form>
  );
};
