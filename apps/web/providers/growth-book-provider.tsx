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

growthbook.init({
  streaming: true,
});

export const GBProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();

  useEffect(() => {
    growthbook.setAttributes({
      id: session?.user?.email,
      loggedIn: Boolean(session?.user),
      url: window.location.href,
    });
  }, [session]);

  return (
    <GrowthBookProvider growthbook={growthbook}>{children}</GrowthBookProvider>
  );
};
