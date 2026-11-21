import type {
  BillingProducts,
  PaymentMethod,
  UserBilling,
} from "@/shared/types/billing";
import type { UserProfile } from "@/shared/types/user";
import { API_URL } from "@/api";
import { serverApiFetch, unstable_rethrow } from "@/shared/lib/api-server";

const EMPTY_PRODUCTS: BillingProducts = { recurring: [], oneTime: [] };

export async function getUserBilling(): Promise<UserBilling | null> {
  try {
    const res = await serverApiFetch(API_URL.billing.userBilling(), {
      method: "GET",
    });

    if (!res.ok) return null;

    return await res.json();
  } catch (error) {
    unstable_rethrow(error);
    console.error("Ошибка SSR запроса биллинга:", error);
    return null;
  }
}

export async function getUserData(): Promise<UserProfile | null> {
  try {
    const res = await serverApiFetch(API_URL.users.profile(), {});

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    unstable_rethrow(error);
    console.error("Ошибка SSR запроса биллинга:", error);
    return null;
  }
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  try {
    const res = await serverApiFetch(API_URL.billing.paymentMethods(), {});

    if (!res.ok) {
      return [];
    }

    return await res.json();
  } catch (error) {
    unstable_rethrow(error);
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
    const res = await serverApiFetch(API_URL.billing.syncProducts(), {
      method: "POST",
    });

    if (!res.ok) {
      return [];
    }

    return await res.json();
  } catch (err) {
    unstable_rethrow(err);
    console.error("Failed to sync products:", err);
    return [];
  }
}

export async function getBillingProducts(): Promise<BillingProducts> {
  try {
    const res = await serverApiFetch(API_URL.billing.products(), {});

    if (!res.ok) {
      return EMPTY_PRODUCTS;
    }

    return await res.json();
  } catch (err) {
    unstable_rethrow(err);
    console.error("Failed to load plans:", err);
    return EMPTY_PRODUCTS;
  }
}
