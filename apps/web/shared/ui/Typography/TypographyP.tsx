type Props = {
  className?: string;
  children: React.ReactNode;
};

export function TypographyP({ className, children }: Props) {
    return (
      <p className={className}>
        {children}
      </p>
    )
  }