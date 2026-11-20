import { useTranslations } from "next-intl";

import { ROUTE } from "@/constants";
import { Link } from "@/i18n/navigation";
import { Logo } from "../logo";
import { Container } from "./landing-section";

const LINK_CLASS =
  // "!" beats the global `a { color: inherit }` rule in globals.css
  "flex min-h-8 items-center text-muted-foreground! transition-colors hover:text-foreground!";

export function LandingFooter() {
  const t = useTranslations("landing");

  return (
    <footer className="border-t">
      <Container className="flex flex-col gap-10 pb-8 pt-12">
        <div className="flex flex-wrap justify-between gap-10">
          <div className="flex max-w-[280px] flex-col gap-3">
            <Link href={ROUTE.HOME} aria-label={t("nav.home")}>
              <Logo />
            </Link>
            <p className="text-muted-foreground">{t("footer.tagline")}</p>
          </div>

          <div className="flex flex-wrap gap-16">
            <nav
              className="flex flex-col gap-1"
              aria-label={t("footer.product")}
            >
              <div className="mb-1 font-semibold">{t("footer.product")}</div>
              <a href="#features" className={LINK_CLASS}>
                {t("nav.features")}
              </a>
              <a href="#pricing" className={LINK_CLASS}>
                {t("nav.pricing")}
              </a>
              <a href="#faq" className={LINK_CLASS}>
                {t("nav.faq")}
              </a>
            </nav>

            <nav
              className="flex flex-col gap-1"
              aria-label={t("footer.account")}
            >
              <div className="mb-1 font-semibold">{t("footer.account")}</div>
              <Link href={ROUTE.LOGIN} className={LINK_CLASS}>
                {t("nav.login")}
              </Link>
              <Link href={ROUTE.CREATE_ACCOUNT} className={LINK_CLASS}>
                {t("footer.createAccount")}
              </Link>
              <Link href={ROUTE.FORGOT_PASSWORD} className={LINK_CLASS}>
                {t("footer.forgotPassword")}
              </Link>
            </nav>

            <nav
              className="flex flex-col gap-1"
              aria-label={t("footer.language")}
            >
              <div className="mb-1 font-semibold">{t("footer.language")}</div>
              <Link href={ROUTE.HOME} locale="en" className={LINK_CLASS}>
                English
              </Link>
              <Link href={ROUTE.HOME} locale="uk" className={LINK_CLASS}>
                Українська
              </Link>
            </nav>
          </div>
        </div>

        <div className="border-t pt-6 text-xs leading-4 text-muted-foreground">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </div>
      </Container>
    </footer>
  );
}
