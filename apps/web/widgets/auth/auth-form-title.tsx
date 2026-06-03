type AuthFormTitleProps = {
  title: string;
};

export const AuthFormTitle = ({ title }: AuthFormTitleProps) => {
  return <h2 className="text-2xl font-bold text-center">{title}</h2>;
};
