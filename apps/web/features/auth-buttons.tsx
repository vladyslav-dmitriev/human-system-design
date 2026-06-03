import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { ROUTE } from "@/constants.ts";
import { useFeatureFlag } from "@/shared/hooks/use-feature-flag";

export const AuthButtons = () => {
  const { data: session, status } = useSession();

  const { isNewAuthDesign } = useFeatureFlag();

  console.log("isNewAuthDesign", isNewAuthDesign);

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

        <Button onClick={() => signOut()}>Log out</Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 justify-end p-2">
      <Button>
        <Link href={ROUTE.LOGIN}>Log in</Link>
      </Button>
      <Button>
        <Link href={ROUTE.CREATE_ACCOUNT}>
          {isNewAuthDesign ? "Create account" : "New account"}
        </Link>
      </Button>
    </div>
  );
};
