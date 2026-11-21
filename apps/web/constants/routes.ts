import { ROUTE } from "./route";

/**
 * Единый список маршрутов (без префикса локали) для proxy, authorized и guards.
 * auth: точное совпадение; protected: сам путь и вложенные (`/settings/security`).
 */
export const ROUTES = {
  auth: [ROUTE.HOME, ROUTE.LOGIN, ROUTE.CREATE_ACCOUNT],
  protected: [
    ROUTE.DASHBOARD,
    ROUTE.TODOS,
    ROUTE.SETTINGS,
    ROUTE.BILLING,
    ROUTE.PRICING,
    ROUTE.CHECKOUT,
    ROUTE.THANK_YOU_PAYMENT,
  ],
};
