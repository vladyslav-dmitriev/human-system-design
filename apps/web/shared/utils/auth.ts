"use server";

import { signIn } from "@/auth";

export const signInCredentials = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  try {
    await signIn("credentials", {
      email,
      password,
    });
  } catch (error) {
    throw error;
  }
};

export const signInGoogle = async () => {
  try {
    await signIn("google");
  } catch (error) {
    throw error;
  }
};
