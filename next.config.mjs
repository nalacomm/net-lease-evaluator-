/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "@prisma/client", "bcryptjs"],
  },
};

export default nextConfig;
