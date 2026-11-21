import { useState } from "react";

import { apiFetch, expireSession } from "@/shared/lib/api-client";
import { API_URL } from "@/api";
import { apiErrorKey, getApiErrorCode } from "@/shared/lib/api-error";

type Input = {
  userPhone: string | null;
  userTwoFactorEnabled: boolean | null;
};

type AuthStep = "idle" | "phone" | "otp";

const post = (url: string, body: unknown) =>
  apiFetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

export const useTwoFactorForm = ({
  userPhone,
  userTwoFactorEnabled,
}: Input) => {
  // confirmed: что реально сохранено на сервере; enabled: что показывает Switch
  const [confirmed, setConfirmed] = useState<boolean>(
    userTwoFactorEnabled ?? false,
  );
  const [enabled, setEnabled] = useState<boolean>(
    userTwoFactorEnabled ?? false,
  );
  const [phone, setPhone] = useState<string | null>(userPhone);
  const [step, setStep] = useState<AuthStep>("idle");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  // ключ i18n последней ошибки (корень сообщений)
  const [error, setError] = useState<string | null>(null);

  /** Сохраняет номер в профиле: SMS всегда уходит на номер из профиля */
  const savePhone = async () => {
    try {
      const response = await apiFetch(API_URL.users.phone(), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (!response.ok) {
        setError(apiErrorKey(await getApiErrorCode(response)));
        return false;
      }

      return true;
    } catch (cause) {
      console.error(cause);
      setError(apiErrorKey("INTERNAL"));
      return false;
    }
  };

  /** true, если SMS ушла; иначе выставляет error и возвращает false */
  const sendSmsCode = async () => {
    try {
      // тело пустое: номер берётся из профиля, captcha не нужна
      const response = await post(API_URL.sms.sendSmsCode(), {});

      if (!response.ok) {
        setError(apiErrorKey(await getApiErrorCode(response)));
        return false;
      }

      return true;
    } catch (cause) {
      console.error(cause);
      setError(apiErrorKey("INTERNAL"));
      return false;
    }
  };

  const handleSwitchEnabled = async () => {
    setError(null);

    if (!confirmed) {
      if (enabled) {
        // подключение не завершено: Switch снова выключает, ничего не сохранено
        setEnabled(false);
        setStep("idle");
        setOtp("");
      } else {
        setStep("phone");
        setEnabled(true);
      }
      return;
    }

    if (!phone) return;

    setLoading(true);

    try {
      if (await sendSmsCode()) {
        setStep("otp");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConnectPhone = async () => {
    if (!checkPhoneValidation(phone)) return;

    setError(null);
    setLoading(true);

    try {
      if ((await savePhone()) && (await sendSmsCode())) {
        setStep("otp");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEnterCode = async () => {
    const nextTwoFactorEnabled = !confirmed;

    setError(null);
    setLoading(true);

    try {
      const response = await post(API_URL.users.setTwoFactor(), {
        phone,
        code: otp,
        twoFactorEnabled: nextTwoFactorEnabled,
      });

      if (!response.ok) {
        setError(apiErrorKey(await getApiErrorCode(response)));
        return;
      }

      const result = await response.json().catch(() => null);

      // успех только при явном { success: true }
      if (result?.success !== true) {
        setError(apiErrorKey("INTERNAL"));
        return;
      }

      setPhone(nextTwoFactorEnabled ? phone : null);
      setOtp("");
      setStep("idle");
      setConfirmed(nextTwoFactorEnabled);
      setEnabled(nextTwoFactorEnabled);

      // api отозвал текущую сессию: выходим сразу и просим войти заново
      await expireSession();
    } catch (cause) {
      console.error(cause);
      setError(apiErrorKey("INTERNAL"));
    } finally {
      setLoading(false);
    }
  };

  return {
    handleSwitchEnabled,
    handleConnectPhone,
    handleEnterCode,
    setPhone,
    setOtp,
    enabled,
    phone,
    step,
    otp,
    loading,
    error,
  };
};

const checkPhoneValidation = (phone: string | null) => {
  return !!phone;
};
