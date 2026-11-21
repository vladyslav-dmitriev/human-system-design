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
      <span className="text-muted-foreground mr-1">{text}</span>
      <Link
        href={buttonLink}
        className="inline-flex min-h-6 items-center text-primary underline-offset-4 hover:underline font-bold"
      >
        {buttonText}
      </Link>
    </p>
  );
};
