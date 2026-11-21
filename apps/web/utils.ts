import { cookies } from "next/headers";

import type {
  BillingProducts,
  PaymentMethod,
  UserBilling,
} from "@/shared/types/billing";
import type { UserProfile } from "@/shared/types/user";
import { API_URL } from "@/api";

const EMPTY_PRODUCTS: BillingProducts = { recurring: [], oneTime: [] };

export async function getUserBilling(): Promise<UserBilling | null> {
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

export async function getUserData(): Promise<UserProfile | null> {
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

/**
 * Синхронизация продуктов со Stripe: POST, только ADMIN.
 * Не вызывать при SSR страниц (каждый рендер = запрос в Stripe).
 */
export async function syncBillingProducts() {
  try {
    const cookieStore = await cookies();
    const cookieString = cookieStore.toString();

    const res = await fetch(API_URL.billing.syncProducts(), {
      method: "POST",
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
    console.error("Failed to sync products:", err);
    return [];
  }
}

export async function getBillingProducts(): Promise<BillingProducts> {
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
      return EMPTY_PRODUCTS;
    }

    return await res.json();
  } catch (err) {
    console.error("Failed to load plans:", err);
    return EMPTY_PRODUCTS;
  }
}
