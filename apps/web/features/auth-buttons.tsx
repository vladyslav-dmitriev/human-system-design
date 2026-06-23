"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { ROUTE } from "@/constants";
import { useFeatureFlag } from "@/shared/hooks/use-feature-flag";
import { useTranslations } from "next-intl";
import { RoleBadge } from "@/widgets/role-badge";
import { usePathname } from "@/i18n/navigation";
import { User } from "lucide-react";

export const AuthButtons = () => {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const t = useTranslations();

  const { isNewAuthDesign } = useFeatureFlag();

  if (status === "loading") {
    return null;
  }

  if (session) {
    return (
      <div className="flex gap-2 justify-end align-center">
        {session.user?.image && (
          <Image
            src={session.user.image}
            alt={session.user.name ?? ""}
            width={28}
            height={28}
            className="rounded-full self-center"
          />
        )}

        {session.user && (
          <span className="self-center">{session.user.name}</span>
        )}

        {session?.user?.role === "ADMIN" && <RoleBadge text="Admin" />}
      </div>
    );
  }

  return (
    <div className="flex gap-2 justify-end p-2">
      {pathname !== ROUTE.LOGIN && (
        <Link href={ROUTE.LOGIN}>
          <Button>
            <User />
            {t("login")}
          </Button>
        </Link>
      )}

      {pathname !== ROUTE.CREATE_ACCOUNT && (
        <Link href={ROUTE.CREATE_ACCOUNT}>
          <Button>
            <User />
            {isNewAuthDesign ? t("createAccount") : "New account"}
          </Button>
        </Link>
      )}
    </div>
  );
};
