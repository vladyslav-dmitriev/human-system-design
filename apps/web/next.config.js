import path from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";

// Корень монорепо задаём явно: иначе Next ищет lockfile выше по дереву
// и может взять чужой (например, ~/pnpm-lock.yaml)
const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["myapp.local"],
  turbopack: {
    root: monorepoRoot,
  },
  transpilePackages: ["@repo/i18n"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
