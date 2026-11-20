import { useTranslations } from "next-intl";

import { Todos } from "./todos";

export default function TodosPage() {
  const t = useTranslations();

  return (
    <div>
      <h1 className="text-3xl font-bold p-4">{t("todos")}</h1>

      <Todos />
    </div>
  );
}
