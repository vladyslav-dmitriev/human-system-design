type Props = {
  children: React.ReactNode;
}

export const TypographyH3 = ({ children }: Props) => {
    return (
        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
        {children}
      </h3>
    )
}