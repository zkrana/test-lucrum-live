import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,  // Disable strict mode to prevent double API calls
  images: {
    domains: ['localhost', 'http://localhost:8000/'], // Add more domains here
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;