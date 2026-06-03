/** @type {import('next').NextConfig} */
const nextConfig = {
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
