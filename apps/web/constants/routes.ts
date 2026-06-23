import { ROUTE } from "./route";

export const ROUTES = {
  auth: [ROUTE.HOME, ROUTE.LOGIN, ROUTE.CREATE_ACCOUNT],
  protected: [
    ROUTE.DASHBOARD,
    ROUTE.TODOS,
    ROUTE.SETTINGS,
    ROUTE.BILLING,
    ROUTE.PRICING,
  ],
};
