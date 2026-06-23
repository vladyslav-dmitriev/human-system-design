import { cookies } from "next/headers";

import { PaymentMethod } from "@/shared/types/billing";
import { API_URL } from "@/api";

interface UserBillingInfo {
  subscriptionStatus: "active" | "canceled" | "past_due" | null;
  stripePriceId: string | null;
  autoRenew: boolean;
  cancelAtPeriodEnd: string;
}

export async function getUserBilling(): Promise<UserBillingInfo | null> {
  try {
    const cookieStore = await cookies();
    const cookieString = cookieStore.toString();

    const res = await fetch(API_URL.billing.userBilling(), {
      method: "GET",
      headers: {
        Cookie: cookieString,
      },
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) return null;

    return await res.json();
  } catch (error) {
    console.error("Ошибка SSR запроса биллинга:", error);
    return null;
  }
}

export async function getUserData(): Promise<UserBillingInfo | null> {
  try {
    const cookieStore = await cookies();
    const cookieString = cookieStore.toString();

    const res = await fetch(API_URL.users.profile(), {
      headers: {
        Cookie: cookieString,
      },
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Ошибка SSR запроса биллинга:", error);
    return null;
  }
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  try {
    const cookieStore = await cookies();
    const cookieString = cookieStore.toString();

    const res = await fetch(API_URL.billing.paymentMethods(), {
      headers: {
        Cookie: cookieString,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return [];
    }

    return await res.json();
  } catch (error) {
    console.error("Ошибка SSR запроса биллинга:", error);
    return [];
  }
}

export async function syncBillingProducts() {
  try {
    const cookieStore = await cookies();
    const cookieString = cookieStore.toString();

    const res = await fetch(API_URL.billing.syncProducts(), {
      headers: {
        Cookie: cookieString,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return [];
    }

    return await res.json();
  } catch (err) {
    console.error("Failed to load plans:", err);
  }
}

export async function getBillingProducts() {
  try {
    const cookieStore = await cookies();
    const cookieString = cookieStore.toString();

    const res = await fetch(API_URL.billing.products(), {
      headers: {
        Cookie: cookieString,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return [];
    }

    return await res.json();
  } catch (err) {
    console.error("Failed to load plans:", err);
  }
}
