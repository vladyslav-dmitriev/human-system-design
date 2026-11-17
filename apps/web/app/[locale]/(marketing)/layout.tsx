import { LandingFooter, LandingNav } from "@/widgets/landing";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background font-[family-name:var(--font-geist-sans)] text-foreground antialiased">
      <LandingNav />
      <main className="flex-1">{children}</main>
      <LandingFooter />
    </div>
  );
}
