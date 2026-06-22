import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { version } = require("./package.json");

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  reactStrictMode: true,
  // Next.js 14.2+ top-level config (was experimental.serverComponentsExternalPackages)
  // Ensures these packages use Node.js require() instead of being webpack-bundled.
  // pdf-parse MUST be here — it uses fs to read internal test files and breaks when bundled.
  serverExternalPackages: ["pdf-parse", "@prisma/client", "bcryptjs"],
};

export default nextConfig;
