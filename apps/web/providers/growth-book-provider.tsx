"use client";

import { GrowthBook, GrowthBookProvider } from "@growthbook/growthbook-react";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

const growthbook = new GrowthBook({
  apiHost: process.env.NEXT_PUBLIC_GROWTHBOOK_API_HOST,
  clientKey: process.env.NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY,
  enableDevMode: process.env.NODE_ENV === "development",

  trackingCallback: (experiment, result) => {
    console.log("Experiment Viewed", {
      experimentId: experiment.key,
      variationId: result.key,
    });
  },
});

// Без ключа (образ собран без NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY) init() отклоняется с «Missing clientKey»
// и роняет unhandledRejection при каждом старте. Тогда флаги просто остаются значениями по умолчанию.
if (process.env.NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY) {
  growthbook.init({ streaming: true }).catch((error: unknown) => {
    console.warn("GrowthBook init failed", error);
  });
}

export const GBProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();

  useEffect(() => {
    growthbook.setAttributes({
      // без email и полного URL: только id, роль и путь без query
      id: session?.user?.id,
      role: session?.user?.role,
      loggedIn: Boolean(session?.user),
      url: window.location.pathname,
    });
  }, [session]);

  return (
    <GrowthBookProvider growthbook={growthbook}>{children}</GrowthBookProvider>
  );
};
