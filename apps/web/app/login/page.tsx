"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTE } from "@/constants.ts";
import { AuthFormFooter } from "../../widgets/auth/auth-form-footer";
import { AuthFormButton } from "@/widgets/auth/auth-form-button";
import { AuthFormInput } from "@/widgets/auth/auth-form-input";
import { AuthForm } from "@/widgets/auth/auth-form";
import { AuthButtonGoogle } from "../../widgets/auth/auth-button-google";
import { AuthButtonGithub } from "../../widgets/auth/auth-button-github";
import { AuthFormTitle } from "@/widgets/auth/auth-form-title";
import { AuthFormError } from "@/widgets/auth/auth-form-error";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get("registered");

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
      router.push("/"); // Успешный вход -> на главную
      router.refresh();
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-gray-100">
      <AuthForm onSubmit={handleSubmit}>
        <AuthFormTitle title="Log in" />

        {isRegistered && (
          <p className="text-green-600 text-sm text-center">
            Registration successful! Please log in.
          </p>
        )}

        <AuthFormError error={error} />

        <AuthFormInput type="email" name="email" placeholder="Email" />
        <AuthFormInput type="password" name="password" placeholder="Password" />

        <AuthFormButton buttonText="Log in" />

        <div className="mt-6" />

        <AuthButtonGoogle onClick={() => signIn("google")} />
        <AuthButtonGithub onClick={() => signIn("github")} />

        <AuthFormFooter
          text="Don't have an account?"
          buttonText="Create account"
          buttonLink={ROUTE.CREATE_ACCOUNT}
        />
      </AuthForm>
    </div>
  );
}
