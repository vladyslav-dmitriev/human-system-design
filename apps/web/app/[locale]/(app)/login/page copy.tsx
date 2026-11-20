"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import * as amplitude from "@amplitude/analytics-browser";
import {
  useRouter,
  // useSearchParams
} from "next/navigation";
import { ROUTE } from "@/constants";
import { AuthFormFooter } from "@/widgets/auth/auth-form-footer";
import { AuthFormButton } from "@/widgets/auth/auth-form-button";
import { AuthFormInput } from "@/widgets/auth/auth-form-input";
import { AuthForm } from "@/widgets/auth/auth-form";
import { AuthButtonGoogle } from "@/widgets/auth/auth-button-google";
import { AuthButtonGithub } from "@/widgets/auth/auth-button-github";
import { AuthFormTitle } from "@/widgets/auth/auth-form-title";
import { AuthFormError } from "@/widgets/auth/auth-form-error";
import { useTranslations } from "next-intl";
import { User } from "lucide-react";

export default function LoginPage() {
  const t = useTranslations();

  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  // const searchParams = useSearchParams();
  // const isRegistered = searchParams.get("registered");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Неверный email или пароль");
    } else {
      amplitude.track("User Signed In", { sign_in_method: "credentials" });
      router.push(ROUTE.DASHBOARD); // Успешный вход -> на главную
      router.refresh();
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl">
      <div className="flex flex-1 items-center justify-center">
        <AuthForm onSubmit={handleSubmit}>
          <AuthFormTitle title={t("login")} />

          {/* {isRegistered && (
          <p className="text-green-600 text-sm text-center">
            Registration successful! Please log in.
          </p>
        )} */}

          <AuthFormError error={error} />

          <AuthFormInput type="email" name="email" placeholder="Email" />
          <AuthFormInput
            type="password"
            name="password"
            placeholder={t("password")}
          />

          <AuthFormButton buttonText={t("login")} />

          <div className="flex items-center justify-end">
            <AuthFormFooter
              text=""
              buttonText={t("forgot_password")}
              buttonLink={ROUTE.FORGOT_PASSWORD}
            />
          </div>

          <div className="mt-8" />

          <AuthButtonGoogle
            onClick={() => {
              amplitude.track("User Signed In", { sign_in_method: "google" });
              signIn("google");
            }}
          />
          <AuthButtonGithub
            onClick={() => {
              amplitude.track("User Signed In", { sign_in_method: "github" });
              signIn("github");
            }}
          />

          <AuthFormFooter
            text={t("notHaveAccount")}
            buttonText={t("createAccount")}
            buttonLink={ROUTE.CREATE_ACCOUNT}
          />
        </AuthForm>
      </div>
    </div>
  );
}
