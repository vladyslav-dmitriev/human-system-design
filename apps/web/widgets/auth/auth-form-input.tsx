import { Input } from "@/components/ui/input";

type AuthFormInputProps = {
  type: string;
  name: string;
  placeholder: string;
};

export const AuthFormInput = ({
  type,
  name,
  placeholder,
}: AuthFormInputProps) => {
  return (
    <Input
      type={type}
      name={name}
      placeholder={placeholder}
      required
      className="w-full border p-2 rounded-md"
    />
  );
};
