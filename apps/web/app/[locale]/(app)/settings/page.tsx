import React from "react";
import { getTranslations } from "next-intl/server";

import { ChangeEmailForm } from "@/features/change-email-form";
import { ChangePasswordForm } from "@/features/change-password-form";
import { Logout } from "@/features/logout";
import { LanguageSettings } from "@/features/language-settings";
import { TwoFactorForm } from "@/features/two-factor-form";
import { OAuthConnections } from "@/features/ouath-connections";
import { getUserData } from "@/utils";

export default async function SettingsPage() {
  const [userData, t] = await Promise.all([getUserData(), getTranslations()]);

  console.log("userData", userData);

  if (!userData) {
    return (
      <div className="container mx-auto py-10 max-w-3xl text-center text-sm text-destructive">
        Не вдалося завантажити профіль користувача.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 max-w-3xl">
      <h1 className="text-3xl font-bold mb-5">{t("settings")}</h1>

      <div className="space-y-3 m-auto">
        <ChangeEmailForm currentEmail={userData.email} />

        <ChangePasswordForm />

        <TwoFactorForm
          userPhone={userData.profile.phone}
          userTwoFactorEnabled={userData.authSettings.twoFactorEnabled}
        />

        <OAuthConnections
          initialProviders={{
            google: false,
            github: false,
          }}
        />

        <LanguageSettings />

        <Logout />
      </div>
    </div>
  );
}
