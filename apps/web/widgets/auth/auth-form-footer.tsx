import Link from "next/link";

type AuthFormFooterProps = {
  text: React.ReactNode;
  buttonText: string;
  buttonLink: string;
};

export const AuthFormFooter = ({
  text,
  buttonText,
  buttonLink,
}: AuthFormFooterProps) => {
  return (
    <p className="text-sm text-center">
      <span className="text-gray-600 mr-1">{text}</span>
      <Link
        href={buttonLink}
        className="text-blue-500 hover:underline font-bold"
      >
        {buttonText}
      </Link>
    </p>
  );
};
