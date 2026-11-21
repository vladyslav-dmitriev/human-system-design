"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { ROUTE } from "@/constants";
import { useTranslations } from "next-intl";
import { RoleBadge } from "@/widgets/role-badge";
import { Link, usePathname } from "@/i18n/navigation";
import { User } from "lucide-react";

export const AuthButtons = () => {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const t = useTranslations();

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
        <Button asChild>
          <Link href={ROUTE.LOGIN}>
            <User />
            {t("login")}
          </Link>
        </Button>
      )}

      {pathname !== ROUTE.CREATE_ACCOUNT && (
        <Button asChild>
          <Link href={ROUTE.CREATE_ACCOUNT}>
            <User />
            {t("createAccount")}
          </Link>
        </Button>
      )}
    </div>
  );
};
