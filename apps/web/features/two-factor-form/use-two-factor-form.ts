import { useState } from "react";

import { API_URL } from "@/api";
import { executeRecaptcha } from "@/providers/google-captcha-provider";

type Input = {
  userPhone: string | null;
  userTwoFactorEnabled: boolean | null;
};

type AuthStep = "idle" | "phone" | "otp";

export const useTwoFactorForm = ({
  userPhone,
  userTwoFactorEnabled,
}: Input) => {
  const [enabled, setEnabled] = useState<boolean>(
    userTwoFactorEnabled ?? false,
  );
  const [phone, setPhone] = useState<string | null>(userPhone);
  const [step, setStep] = useState<AuthStep>("idle");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSwitchEnabled = async () => {
    setLoading(true);

    if (enabled) {
      const response = await sendSmsCode();

      if (response?.ok) {
        setStep("otp");
      }
    } else {
      setStep("phone");
      setEnabled(true);
    }
  };

  const sendSmsCode = async () => {
    if (!phone) return;

    const captchaToken = await executeRecaptcha("twoFactor");

    try {
      return await fetch(API_URL.sms.sendSmsCode(), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: phone,
          captchaToken,
        }),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleConnectPhone = async () => {
    if (!checkPhoneValidation(phone)) return;

    const response = await sendSmsCode();

    if (response?.ok) {
      setStep("otp");
    }
  };

  const handleEnterCode = async () => {
    const nextUserTwoFactorEnabled = !userTwoFactorEnabled;

    try {
      await fetch(API_URL.users.setTwoFactor(), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code: otp,
          twoFactorEnabled: nextUserTwoFactorEnabled,
        }),
      });

      setPhone(nextUserTwoFactorEnabled ? phone : null);
      setOtp("");
      setStep("idle");
      setEnabled(nextUserTwoFactorEnabled);
      setLoading(false);
    } catch (error) {
      console.error(error);
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
  };
};

const checkPhoneValidation = (phone: string | null) => {
  return !!phone;
};
