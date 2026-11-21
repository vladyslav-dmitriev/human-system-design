import { executeRecaptcha } from "@/providers/google-captcha-provider";
import { captchaFailed } from "./auth-errors";

/** reCAPTCHA-токен; любой сбой (скрипт не загружен, отказ) становится понятной ошибкой формы */
export const getCaptchaToken = async (action: string) => {
  try {
    return await executeRecaptcha(action);
  } catch {
    throw captchaFailed();
  }
};
