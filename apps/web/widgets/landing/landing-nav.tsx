import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ROUTE } from "@/constants";
import { ThemeToggle } from "@/features/theme-toggle";
import { SelectLanguage } from "@/features/select-language";
import { Link } from "@/i18n/navigation";
import { Logo } from "../logo";
import { Container } from "./landing-section";

const SECTIONS = [
  { id: "ai", key: "ai" },
  { id: "features", key: "features" },
  { id: "security", key: "security" },
  { id: "pricing", key: "pricing" },
  { id: "faq", key: "faq" },
] as const;

export function LandingNav() {
  const t = useTranslations("landing.nav");

  return (
    <header className="border-b">
      <Container className="flex min-h-16 flex-wrap items-center justify-between gap-4">
        <Link href={ROUTE.HOME} aria-label={t("home")}>
          <Logo />
        </Link>

        <nav
          aria-label={t("sections")}
          className="hidden items-center gap-1 md:flex"
        >
          {SECTIONS.map((section) => (
            <Button key={section.id} asChild variant="ghost" className="h-11">
              <a href={`#${section.id}`}>{t(section.key)}</a>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SelectLanguage />
          <Button asChild variant="ghost" className="h-11">
            <Link href={ROUTE.LOGIN}>{t("login")}</Link>
          </Button>
          {/* "!" beats the global `a { color: inherit }` rule in globals.css */}
          <Button asChild className="h-11 text-primary-foreground!">
            <Link href={ROUTE.CREATE_ACCOUNT}>{t("getStarted")}</Link>
          </Button>
        </div>
      </Container>
    </header>
  );
}
