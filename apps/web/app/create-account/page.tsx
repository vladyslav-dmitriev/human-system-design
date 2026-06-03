"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { createAccountUser } from "@/actions/create-account";
import { AuthFormFooter } from "../../widgets/auth/auth-form-footer";
import { ROUTE } from "@/constants.ts";
import { AuthForm } from "@/widgets/auth/auth-form";
import { AuthFormButton } from "@/widgets/auth/auth-form-button";
import { AuthFormInput } from "@/widgets/auth/auth-form-input";
import { AuthButtonGoogle } from "../../widgets/auth/auth-button-google";
import { AuthButtonGithub } from "../../widgets/auth/auth-button-github";
import { AuthFormTitle } from "@/widgets/auth/auth-form-title";
import { AuthFormError } from "@/widgets/auth/auth-form-error";

export default function CreateAccountPage() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    const result = await createAccountUser(formData);
    if (result?.error) {
      setError(
        typeof result.error === "string" ? result.error : "Ошибка валидации",
      );
    } else if (result?.success) {
      router.push("/login?registered=true");
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-gray-100">
      <AuthForm onSubmit={handleSubmit}>
        <AuthFormTitle title="Create account" />
        <AuthFormError error={error} />

        <AuthFormInput type="text" name="name" placeholder="Name" />
        <AuthFormInput type="email" name="email" placeholder="Email" />
        <AuthFormInput type="password" name="password" placeholder="Password" />

        <AuthFormButton buttonText="Create account" />

        <div className="mt-6" />
        <AuthButtonGoogle onClick={() => signIn("google")} />
        <AuthButtonGithub onClick={() => signIn("github")} />

        <AuthFormFooter
          text="Already have an account?"
          buttonText="Log in"
          buttonLink={ROUTE.LOGIN}
        />
      </AuthForm>
    </div>
  );
}
