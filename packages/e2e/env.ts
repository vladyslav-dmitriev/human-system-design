import { existsSync } from "node:fs";
import path from "node:path";

// Optional local file with E2E_* variables (git-ignored, see the example file next to it).
const localEnvFile = path.resolve(__dirname, ".env");
if (existsSync(localEnvFile)) {
  process.loadEnvFile(localEnvFile);
}

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://myapp.local";

export function getE2eCredentials(): { email: string; password: string } {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_USER_EMAIL and E2E_USER_PASSWORD are required. " +
        "Create a dedicated test user and pass them via the environment " +
        "or packages/e2e/.env (see packages/e2e/.env.example).",
    );
  }

  return { email, password };
}
