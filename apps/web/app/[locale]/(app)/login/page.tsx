"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import * as amplitude from "@amplitude/analytics-browser";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { CALLBACK_URL_PARAM } from "@/constants";
import { API_URL } from "@/api";
import { getApiErrorCode } from "@/shared/lib/api-error";
import { getFieldErrors, loginSchema } from "@/shared/lib/auth-schemas";
import { getSafeCallbackUrl } from "@/shared/utils/guards";
import {
  AuthFlowError,
  fromApiCode,
  getAuthErrorKey,
} from "@/widgets/auth/auth-errors";
import { getCaptchaToken } from "@/widgets/auth/get-captcha-token";

import { LoginAuthFormStep } from "./login-auth-form-step";
import { LoginAuthOtpStep } from "./login-auth-otp-step";

const post = (url: string, body: unknown) =>
  fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export default function LoginPage() {
  const t = useTranslations();

  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"form" | "otp">("form");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  /** Единственное место, где вызывается signIn: только с одноразовым билетом */
  const completeLogin = async (loginTicket: string | undefined) => {
    if (!loginTicket) throw new AuthFlowError("errors.AUTH_TICKET_INVALID");

    const result = await signIn("credentials", {
      loginTicket,
      redirect: false,
    });

    if (!result || result.error) {
      throw new AuthFlowError("errors.AUTH_TICKET_INVALID");
    }

    amplitude.track("User Signed In", { sign_in_method: "credentials" });

    const callbackUrl = getSafeCallbackUrl(
      new URLSearchParams(window.location.search).get(CALLBACK_URL_PARAM),
    );

    router.replace(callbackUrl);
    router.refresh();
  };

  const showError = (cause: unknown) => {
    console.error(cause);
    setError(t(getAuthErrorKey(cause)));
  };

  const handleSubmitAuthForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({
      email: formData.get("email") ?? "",
      password: formData.get("password") ?? "",
    });

    setError(null);

    if (!parsed.success) {
      const errors = getFieldErrors(parsed.error);
      setFieldErrors(
        Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, t(v)])),
      );
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    try {
      const captchaToken = await getCaptchaToken("login");

      const response = await post(API_URL.auth.login(), {
        ...parsed.data,
        captchaToken,
      });

      if (!response.ok) {
        throw fromApiCode(await getApiErrorCode(response));
      }

      const result = await response.json();

      if (result.twoFactorRequired) {
        setEmail(parsed.data.email);
        setPhone(result.phoneMasked ?? "");
        setStep("otp");
        return;
      }

      await completeLogin(result.loginTicket);
    } catch (cause) {
      showError(cause);
    } finally {
      setIsLoading(false);
    }
  };

  const onVerify = async (otp: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await post(API_URL.auth.twoFactor(), {
        email,
        code: otp,
      });

      // неверный код: вход останавливается, signIn не вызывается
      if (!response.ok) {
        throw fromApiCode(await getApiErrorCode(response));
      }

      const result = await response.json();

      await completeLogin(result.loginTicket);
    } catch (cause) {
      showError(cause);
    } finally {
      setIsLoading(false);
    }
  };

  const onBack = () => {
    setError(null);
    setStep("form");
  };

  if (step === "otp") {
    return (
      <LoginAuthOtpStep
        isLoading={isLoading}
        error={error}
        phone={phone}
        onVerify={onVerify}
        onBack={onBack}
      />
    );
  }

  return (
    <LoginAuthFormStep
      isLoading={isLoading}
      error={error}
      fieldErrors={fieldErrors}
      onSubmit={handleSubmitAuthForm}
    />
  );
}
