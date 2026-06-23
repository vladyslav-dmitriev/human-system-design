// import { BillingPlans } from "@/features/billing-plans";
import { useTranslations } from "next-intl";

export default function DashboardPage() {
  const t = useTranslations();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">{t("dashboard")}</h1>
    </div>
  );
}
