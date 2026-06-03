import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.resolve.alias["@"] = path.resolve();
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Для Google аватарок
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com", // Для GitHub аватарок
      },
    ],
  },
};

export default nextConfig;
