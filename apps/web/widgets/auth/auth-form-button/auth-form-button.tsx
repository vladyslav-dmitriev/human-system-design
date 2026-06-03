import { Button } from "@/components/ui/button";

type AuthFormButtonProps = {
  buttonText: string;
};

export const AuthFormButton = ({ buttonText }: AuthFormButtonProps) => {
  return (
    <Button
      type="submit"
      className="w-full bg-blue-600 text-white p-4 h-10 rounded-md hover:bg-blue-700"
    >
      {buttonText}
    </Button>
  );
};
