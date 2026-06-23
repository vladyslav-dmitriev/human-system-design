"use client";

import { useEffect } from "react";

export const GoogleCaptchaProvider = ({
  children,
  siteKey,
}: {
  children: React.ReactNode;
  siteKey: string;
}) => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [siteKey]);

  return <>{children}</>;
};

export const executeRecaptcha = async (action: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!(window as any).grecaptcha) {
      reject(new Error("reCAPTCHA script is not loaded"));
      return;
    }

    (window as any).grecaptcha.ready(async () => {
      try {
        const token = await (window as any).grecaptcha.execute(
          process.env.NEXT_PUBLIC_GOOGLE_CAPTCHA_PUBLIC_KEY,
          { action },
        );
        resolve(token);
      } catch (error) {
        reject(error);
      }
    });
  });
};
