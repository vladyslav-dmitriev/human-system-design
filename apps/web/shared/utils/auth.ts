"use server";

import { signIn } from "@/auth";

export const signInCredentials = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  await signIn("credentials", {
    email,
    password,
  });
};

export const signInGoogle = async () => {
  await signIn("google");
};
