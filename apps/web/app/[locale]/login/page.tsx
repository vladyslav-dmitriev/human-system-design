"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import * as amplitude from "@amplitude/analytics-browser";
import { useRouter } from "next/navigation";
import { ROUTE } from "@/constants";
import { useTranslations } from "next-intl";

import { LoginAuthFormStep } from "./login-auth-form-step";
import { LoginAuthOtpStep } from "./login-auth-otp-step";
import { API_URL } from "@/api";
import { executeRecaptcha } from "@/providers/google-captcha-provider";

export default function LoginPage() {
  const t = useTranslations();

  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const handleSubmitAuthForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const formEmail = (formData.get("email") as string) ?? "";
    const formPassword = (formData.get("password") as string) ?? "";

    setEmail(formEmail);
    setPassword(formPassword);

    if (!formEmail || !formPassword) {
      throw new Error("Email and password are required");
    }

    try {
      const captchaToken = await executeRecaptcha("login");

      const response = await fetch(API_URL.auth.login(), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formEmail,
          password: formPassword,
          captchaToken,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      if (result.twoFactorEnabled) {
        setPhone(result.phone);
        setStep("otp");
        setIsLoading(false);
      } else {
        await login({ email: formEmail, password: formPassword });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const login = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(t("invalid_credentials") || "Неверный email или пароль");
      setIsLoading(false);
    } else {
      amplitude.track("User Signed In", { sign_in_method: "credentials" });
      router.push(ROUTE.DASHBOARD);
      router.refresh();
    }
  };

  const onCaptchaSuccess = () => {};

  const checkCode = async (otp: string) => {
    const captchaToken = await executeRecaptcha("2fa");

    try {
      const res = await fetch(API_URL.auth.twoFactor(), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          code: otp,
          captchaToken,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message);
      }

      await login({ email, password });
    } catch (error) {
      console.error(error);
    }
  };

  const onVerify = async (otp: string) => {
    try {
      setIsLoading(true);

      await checkCode(otp);
      await login({ email, password });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onBack = () => {
    setStep("form");
  };

  if (step === "form") {
    return (
      <LoginAuthFormStep
        isLoading={isLoading}
        error={error}
        onSubmit={handleSubmitAuthForm}
        onSignInGoogle={() => signIn("google")}
        onSignInGithub={() => signIn("github")}
      />
    );
  }

  if (step === "otp") {
    return (
      <LoginAuthOtpStep
        isLoading={isLoading}
        error={error}
        phone={phone}
        onVerify={onVerify}
        onBack={onBack}
        onCaptchaSuccess={onCaptchaSuccess}
      />
    );
  }

  return null;
}
